# Task 03 — Queue + state persistence

**Status:** Done
**Depends on:** 01
**Reference:** [`../architecture.md`](../architecture.md) §4.1

## Goal

In-memory job queue with a concurrency gate, mirrored to a JSON file so it
survives restart.

## Scope

- `server/state.ts`:
  - `load()` → read `STATE_FILE`, return `Job[]` (empty if missing).
  - `save(jobs)` → write temp file then `rename` (atomic).
- `server/queue.ts`:
  - hold `Job[]` in memory.
  - `add(url, format)` → push a `queued` job (`crypto.randomUUID()`), persist.
  - `remove(id)`, `list()`.
  - worker loop: up to `CONCURRENCY` (default 2) jobs `downloading` at once;
    pull next `queued`, call downloader (task 02), update status/progress, persist
    on every change.
  - emit an event/callback on any job change (task 04's SSE subscribes to it).
  - on boot: `load()`, reset any `downloading` → `queued`, start worker.

## Acceptance

- `demo()` self-check (asserts, no framework): add 3 jobs with a stubbed
  downloader → never more than 2 run at once → all end `done` → reloading
  `STATE_FILE` returns them.
- Kill mid-run and restart (manual): stuck job comes back `queued`.

## Out of scope

Real yt-dlp calls (inject downloader as a dependency so this is testable with a stub).
