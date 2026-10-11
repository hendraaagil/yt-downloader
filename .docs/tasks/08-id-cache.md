# Task 08 — Store downloads by video id + reuse cache

**Status:** Done
**Depends on:** 02, 04
**Reference:** [`../architecture.md`](../architecture.md) §4.2
**Owner:** backend-dev

## Goal

Store each download under `downloads/{videoId}/*.{mp3|mp4}`. If a later request
asks for a URL whose video id already has a file in the matching format, serve
that file instead of re-downloading.

## Scope

`server/downloader.ts`:

- **Output template** → `-o "${dir}/%(id)s/%(title)s.%(ext)s"` (per-id subfolder).
- **Return a path relative to `DOWNLOAD_DIR`**, i.e. `"{id}/{name}.{ext}"` — NOT
  the basename as today (`downloader.ts:53` currently returns basename). Compute
  it by stripping the `DOWNLOAD_DIR` prefix off yt-dlp's `%(filepath)s`.
- **Cache check before spawn:**
  1. Parse the video id from `job.url` with a regex covering `youtu.be/<id>`,
     `watch?v=<id>`, `shorts/<id>`, `embed/<id>` — id = `[A-Za-z0-9_-]{11}`.
  2. If an id parsed, look in `${dir}/${id}/` for an existing file whose
     extension matches the requested format (`.mp3` for mp3, `.mp4` for mp4).
  3. Hit → `onProgress(100)`, return `{ file: "{id}/{name}.{ext}", title: <name minus ext> }`
     without spawning yt-dlp.
  4. Miss, or id unparseable → download as normal (yt-dlp still creates the
     `{id}` folder via the template, so the real id is always correct on disk).

`server/index.ts`:

- One-shot `POST /api/download` currently basenames `res.file`
  (`index.ts` `res.file.split(/[\\/]/).pop()`). Change to use the relative path so
  the file is found inside its `{id}` subfolder. The traversal guard in
  `GET /api/downloads/:path` already resolves against `DOWNLOAD_DIR` and checks
  `startsWith(DIR + sep)`, so a `{id}/name.ext` sub-path passes it unchanged.

Frontend needs **no change**: `JobList`/`App` already build the link with
`encodeURIComponent(j.file)`, which encodes the `/` and round-trips correctly.

## Acceptance

- `bun downloader.ts <url> mp3` writes to `downloads/<id>/<title>.mp3`; the
  returned `file` is `"<id>/<title>.mp3"`.
- Re-running the SAME url+format does NOT spawn yt-dlp (no network) and returns
  the existing path — verify by timing (second run is near-instant) or by a log
  line / stubbed-spawn assertion.
- A different format for the same id downloads fresh into the same `{id}` folder.
- Full stack: queue a url, let it finish, delete the job, re-queue the same url →
  second job reaches `done` immediately, file link still works through nginx.
- Add a case to `server/api-check.ts` (stubbed downloader returning a `{id}/f.txt`
  path) asserting `/api/downloads/<id>%2Ff.txt` resolves 200 and traversal still 403.

## Out of scope

Cleanup / TTL (task 09). Changing the queue or SSE contract.
