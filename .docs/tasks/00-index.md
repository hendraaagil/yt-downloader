# Task Index

Build order for the YouTube downloader. See [`../architecture.md`](../architecture.md).
One feature per task. Delegate each to an agent. Keep the **Status** here in sync
with each task file.

| #  | Task                                   | Depends on | Status      |
|----|----------------------------------------|------------|-------------|
| 01 | Backend scaffold + Dockerfile          | —          | Done |
| 02 | Downloader (yt-dlp spawn + progress)   | 01         | Done |
| 03 | Queue + state persistence              | 01         | Done |
| 04 | API routes + SSE                       | 02, 03     | Done |
| 05 | Frontend (React + Tailwind)            | 04         | Done |
| 06 | Web Dockerfile + nginx proxy           | 05         | Done |
| 07 | Compose wiring + LAN test              | 06         | Done |
| 08 | Store downloads by video id + cache    | 02, 04     | Done |
| 09 | Periodic cleanup of downloads/         | 08         | Done |
| 10 | Folder refactor + 1 global dl + 12h TTL| 09         | Done |
| 11 | Bun native routing + named handlers    | 10         | Done |
| 12 | One file per route handler             | 11         | Done |
| 13 | yt-dlp cookies + JS runtime (bot gate) | 10         | Done |

**Status values:** `Not Started` → `In Progress` → `Blocked` → `Done`.

Ports: web `:3003` (LAN entry), api `:4004` (internal, proxied by nginx).
