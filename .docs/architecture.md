# YouTube Downloader — Architecture

Self-hosted batch downloader. Paste a list of YouTube links, pick MP3 or MP4,
app downloads them one by one (small concurrency). Runs on an Ubuntu box in the
local network via one `docker compose up`. No database.

**Access: `http://<server-LAN-IP>:3003`** — web UI port. Backend API runs on
`4004` (same host, used internally; optionally reachable directly for debugging).

---

## 1. Goals & Scope

**In scope**
- Paste many YouTube links at once → queue → download each.
- Choose output: **MP3** (audio) or **MP4** (video).
- Watch progress per link (queued / downloading / done / failed).
- Browse & grab finished files over the LAN.
- One compose file. No external DB. No auth (trusted home network).

**Out of scope** (explicitly not building)
- Scheduled / cron re-downloads — dropped per clarification.
- Accounts, login, multi-user.
- Cloud storage, remote access, HTTPS/TLS (LAN only).

---

## 2. Stack

| Layer    | Choice                        | Why |
|----------|-------------------------------|-----|
| Runtime  | **Bun + TypeScript**          | One language front+back, built-in HTTP server, fast installs. |
| Backend  | Bun.serve (HTTP + SSE)        | No framework needed — a handful of routes. |
| Downloader | **yt-dlp** CLI + **ffmpeg** | yt-dlp does the work; ffmpeg does MP3 extraction / MP4 merge. |
| Frontend | **React + Tailwind** (Vite)   | As requested. Served by nginx; proxies `/api` to backend. |
| State    | **One JSON file** on disk     | No DB. Queue + job history live in `data/state.json`. |
| Deploy   | **Single `compose.yml`** | Two services (web `:3003`, api `:4004`), two volumes. |

> Node + TS is a drop-in alternative (swap `bun` for `node`, add Express or use
> `node:http`). Bun chosen for the smaller footprint and built-in bundler.

---

## 3. High-Level Diagram

```
                   Local Network (e.g. 192.168.1.x)
┌───────────────────────────────────────────────────────────────┐
│   Browser (your laptop/phone)                                   │
│        │  http://<server-ip>:3003                               │
│        ▼                                                         │
│  ┌──────────────────────┐        ┌──────────────────────────┐  │
│  │  web  (nginx) :3003   │        │  api  (Bun.serve) :4004   │  │
│  │  ├ React static build │        │  ├ REST API /api/*        │  │
│  │  └ proxy /api, /events├───────►│  ├ SSE /api/events ──►    │  │
│  │     to  api:4004      │ docker │  │                        │  │
│  └──────────────────────┘  net   │  │  Queue + Worker        │  │
│                                   │  │   └ spawns yt-dlp+ffmpeg│ │
│                                   │  │                        │  │
│                                   │  │  reads/writes:         │  │
│                                   │  │   • /data/state.json   │  │
│                                   │  │   • /downloads/*.mp3/mp4│ │
│                                   │  └──────────────────────┘  │
│                                   └──────┬───────────┬─────────┘ │
│                                     ./data      ./downloads       │
│                                    (volume)      (volume)         │
└───────────────────────────────────────────────────────────────┘
```

Two services on one compose network. Browser only ever talks to `:3003`; nginx
proxies `/api` and `/api/events` (SSE) to `api:4004` over the internal docker
network — so **no CORS** and only one port to remember. `:4004` is published too,
for hitting the API directly while debugging. The api is a single process; its
queue lives in memory and is mirrored to `state.json` so it survives a restart.

---

## 4. Components

### 4.1 Backend (`server/`)

```
server/
  index.ts        # Bun.serve :4004 — API routes + SSE
  queue.ts        # in-memory queue, concurrency limit, persistence
  downloader.ts   # spawn yt-dlp, parse progress, run post-process
  state.ts        # load/save data/state.json (atomic write)
  types.ts        # Job, JobStatus, Format
```

**Job model**
```ts
type Format = "mp3" | "mp4";
type JobStatus = "queued" | "downloading" | "done" | "failed";

interface Job {
  id: string;            // crypto.randomUUID()
  url: string;
  format: Format;
  status: JobStatus;
  progress: number;      // 0–100, parsed from yt-dlp
  title?: string;        // filled once yt-dlp resolves metadata
  file?: string;         // output filename when done
  error?: string;        // stderr tail when failed
  createdAt: number;
}
```

**Queue** — array of jobs + a concurrency gate (default **2**). Worker pulls the
next `queued` job whenever a slot frees. No external queue lib; a simple
promise-based semaphore.

> ponytail: single-process in-memory queue, concurrency 2. Fine for one user.
> Upgrade path: move to a real job queue only if you ever run many parallel
> downloads or multiple app instances — you won't on a home server.

**Persistence** — every status change writes `state.json` (write to temp file,
then `rename` = atomic). On boot, reload it; any job stuck `downloading` is
reset to `queued` and re-run.

### 4.2 Downloader

Spawns yt-dlp per job. Two command shapes:

```bash
# MP4 (best video+audio up to 1080p, merged to mp4)
yt-dlp -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 \
  -o "/downloads/%(title)s.%(ext)s" --newline <URL>

# MP3 (extract audio, 192k)
yt-dlp -x --audio-format mp3 --audio-quality 192K \
  -o "/downloads/%(title)s.%(ext)s" --newline <URL>
```

- `--newline` → each progress update on its own line → parse `[download]  42.3%`
  with a regex, update `job.progress`, push over SSE.
- On exit code 0 → `done`; non-zero → `failed`, store last stderr lines.
- ffmpeg is invoked by yt-dlp internally (must be on PATH in the image).

### 4.3 Frontend (`web/`)

```
web/
  src/
    App.tsx          # layout
    LinkInput.tsx    # textarea (one URL per line) + format toggle + submit
    JobList.tsx      # live table of jobs
    useEvents.ts     # EventSource hook → live job updates
  index.html
  (Vite + Tailwind config)
```

Flow: paste URLs (one per line) → pick MP3/MP4 → **Add to queue**. Table shows
each job with a live progress bar. Finished rows link to the file. Built with
`vite build` into static assets; **nginx** serves them on `:3003` and proxies
`/api` → `api:4004`. All fetch/`EventSource` calls use relative `/api/...` paths,
so the browser only ever hits `:3003`.

---

## 5. API

Served by **api** on `:4004`, reached by the browser through nginx under the
same origin (`http://<ip>:3003/api/...`).

| Method | Path            | Purpose |
|--------|-----------------|---------|
| `POST` | `/api/jobs`     | Body `{ urls: string[], format: "mp3"\|"mp4" }` → enqueue one job per URL. |
| `GET`  | `/api/jobs`     | Current queue + history (initial page load). |
| `GET`  | `/api/events`   | **SSE** stream — pushes job updates as they change. |
| `DELETE`| `/api/jobs/:id`| Remove a queued/finished job from the list. |
| `GET`  | `/api/downloads/*` | Serve finished files (or open the `./downloads` volume directly). |

SSE (not WebSocket) — one-way server→client progress is all that's needed, and
`EventSource` is built into the browser with auto-reconnect. nginx must set
`proxy_buffering off;` on the `/api/events` location or progress stalls.

---

## 6. Data & Files

```
project/
├── compose.yml
├── server/              # Bun API  → image, listens :4004
│   └── Dockerfile
├── web/                 # React build + nginx → image, listens :3003
│   ├── Dockerfile
│   └── nginx.conf       # static + proxy /api → api:4004
├── data/                # volume → state.json (queue + history)
│   └── state.json
└── downloads/           # volume → finished .mp3 / .mp4
```

Both volumes are host-mounted, so files land directly on the Ubuntu filesystem —
grab them over SMB/SFTP or the `/api/downloads/*` route. Nothing is lost on
container rebuild.

---

## 7. Containerization

Two images, one compose file.

**`server/Dockerfile`** (the api)
1. `oven/bun` base image.
2. Install `ffmpeg` + `python3` + `yt-dlp` (pip or static binary).
3. Copy `server/`, `bun install`.
4. `EXPOSE 4004`, `CMD ["bun", "server/index.ts"]`.

**`web/Dockerfile`** (multi-stage)
1. `oven/bun` stage → `vite build` → static `dist/`.
2. `nginx:alpine` stage → copy `dist/` + `nginx.conf`. `EXPOSE 3003`.

Pin yt-dlp but update it often — YouTube changes break old versions. The api
entrypoint runs `yt-dlp -U` on start (non-fatal if offline); rebuild with
`--no-cache` when a release outgrows the baked binary.

**`web/nginx.conf`** (shape)
```nginx
server {
  listen 3003;
  root /usr/share/nginx/html;
  location / { try_files $uri /index.html; }        # SPA fallback
  location /api/ {
    proxy_pass http://api:4004;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;                             # required for SSE
    proxy_read_timeout 1h;                           # long downloads
  }
}
```

**`compose.yml`** (shape)
```yaml
services:
  api:
    build: ./server
    expose: ["4004"]          # internal; the line below also publishes it
    ports: ["4004:4004"]      # optional — direct API access for debugging
    volumes:
      - ./data:/data
      - ./downloads:/downloads
    environment:
      - PORT=4004
      - CONCURRENCY=2
      - DOWNLOAD_DIR=/downloads
      - STATE_FILE=/data/state.json
    restart: unless-stopped

  web:
    build: ./web
    ports: ["3003:3003"]
    depends_on: [api]
    restart: unless-stopped
```

Access from any device on the LAN at **`http://<server-ip>:3003`**.

---

## 8. Build Order

1. `server/Dockerfile` with yt-dlp/ffmpeg — confirm `yt-dlp --version` runs.
2. `downloader.ts` — spawn yt-dlp for one hardcoded URL, parse progress.
3. `queue.ts` + `state.ts` — enqueue, concurrency, persist/reload.
4. `index.ts` — API routes + SSE on `:4004`.
5. `web/` — input form + live job table; all calls to relative `/api/...`.
6. `web/Dockerfile` + `nginx.conf` — serve `:3003`, proxy `/api` → `api:4004`.
7. Wire compose (two services + volumes), test on the Ubuntu server at
   `http://<ip>:3003` from another LAN device.

---

## 9. Risks / Notes

- **yt-dlp breakage** — biggest ongoing risk. Keep it updated (see §7).
- **No auth** — anyone on the LAN can use it. Acceptable for a home network;
  do **not** port-forward this to the internet as-is.
- **Disk fill** — downloads volume grows unbounded. Clean it manually, or add a
  "delete file" action later if it becomes a chore.
- **Long videos / rate limits** — concurrency 2 keeps you under YouTube's radar;
  raising it risks throttling.
- **Filename collisions** — yt-dlp `%(title)s` can clash; add `%(id)s` to the
  output template if duplicates matter.
