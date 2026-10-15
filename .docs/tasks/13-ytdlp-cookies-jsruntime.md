# Task 13 — yt-dlp cookies + JS runtime (bot gate / 429 fix)

**Status:** Done (code + wiring verified via `bun run check`; `docker compose build api` not run locally — deno COPY unverified)
**Depends on:** 10
**Reference:** [`../architecture.md`](../architecture.md)
**Owner:** backend-dev (code) + infra-dev (image/compose)

## Problem

Downloads fail in the container:
- `ERROR: Sign in to confirm you're not a bot` — YouTube bot gate; needs cookies.
- `HTTP Error 429: Too Many Requests` — IP rate-limited (eased by cookies + low rate).
- `No supported JavaScript runtime could be found` — yt-dlp wants `deno`;
  without it some formats are missing and extraction is deprecated.

Not a regression from the refactor — YouTube tightened + the image lacks a JS
runtime and cookies.

## Scope

### 1. JS runtime (deno) in the image
- `server/Dockerfile`: add `deno` to PATH. Grab it from the official image:
  `COPY --from=denoland/deno:bin /deno /usr/local/bin/deno`. yt-dlp auto-detects
  a `deno` on PATH — no flag needed.

### 2. Optional cookies, rotated across accounts
- `server/src/download/downloader.ts`: `cookieArgs()` rotates across every
  `*.txt` in `COOKIES_DIR` (round-robin per download, in-memory counter) — this
  spreads load over multiple YouTube accounts to ease the bot gate / 429. Falls
  back to a single `COOKIES_FILE` if `COOKIES_DIR` is unset; else no-op (no
  crash). Flag goes before `--`.
- `compose.yml` `api` service:
  - env `COOKIES_DIR: /cookies`
  - volume `./cookies:/cookies` (mount a **dir**, so an empty cookies set
    doesn't break `compose up`). **Writable** (not `:ro`) — yt-dlp rewrites the
    cookie file after each run to persist refreshed tokens; `:ro` makes it crash
    with `OSError: Read-only file system`.
- Host: `cookies/` dir with `.gitkeep` + `README`; gitignore the real cookie
  files (`cookies/*.txt`) so they never get committed.

### 3. Docs
- Short note (in this task + a line in `architecture.md` if natural): export
  YouTube cookies in Netscape format to `cookies/cookies.txt`, it's picked up
  automatically. Never commit it.

ponytail: cookies optional via one `existsSync` check + a dir mount — no secret
manager, no login flow. deno via a one-line multi-stage COPY, no manual install.

## Acceptance

- `bun run check` still passes (downloader self-check uses a stub; cookie logic
  guarded by env + file existence so it's a no-op in tests).
- A quick unit assert: with `COOKIES_FILE` pointing at an existing temp file the
  built args include `--cookies <path>`; unset → they don't. (Extend the
  downloader's `import.meta.main` block or a tiny check.)
- Image builds with `deno` on PATH (`docker compose build api`); `deno --version`
  runs in the container.
- `cookies/.gitkeep` tracked; `cookies/cookies.txt` ignored by git.

## Out of scope

Auto-refreshing cookies, per-user cookies, proxy/rotation for 429, a login UI.
Frontend. The `--cookies-from-browser` path (no browser in the container).
