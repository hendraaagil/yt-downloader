# Task 01 — Backend scaffold + Dockerfile

**Status:** Done
**Depends on:** —
**Reference:** [`../architecture.md`](../architecture.md) §2, §4.1, §7

## Goal

Stand up the Bun + TS backend project and a Dockerfile that has `yt-dlp` and
`ffmpeg` working. No real logic yet — just a runnable skeleton that boots on
`:4004` and the CLI tools are reachable.

## Scope

- Init Bun project in `server/` (`bun init`, TS).
- `server/types.ts` — define `Format`, `JobStatus`, `Job` (copy from architecture §4.1).
- `server/index.ts` — `Bun.serve({ port: Number(process.env.PORT ?? 4004) })`
  with a single `GET /api/health` → `{ ok: true }`.
- Read config from env: `PORT`, `CONCURRENCY`, `DOWNLOAD_DIR`, `STATE_FILE`.
- `server/Dockerfile`:
  - base `oven/bun`
  - install `ffmpeg`, `python3`, `yt-dlp` (pip or static binary)
  - copy `server/`, `bun install`
  - `EXPOSE 4004`, `CMD ["bun", "server/index.ts"]`

## Acceptance

- `docker build ./server` succeeds.
- In the container: `yt-dlp --version` and `ffmpeg -version` both print.
- `curl localhost:4004/api/health` → `{"ok":true}`.

## Out of scope

Queue, downloader, real routes — later tasks.
