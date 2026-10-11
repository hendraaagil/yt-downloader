# Task 09 — Periodic cleanup of downloads/

**Status:** Done
**Depends on:** 08
**Reference:** [`../architecture.md`](../architecture.md)
**Owner:** backend-dev

## Goal

Keep `downloads/` from growing forever: delete old downloaded files
automatically. Default retention 24h.

## Scope

Add a small sweep to `server/index.ts` (no new service — `setInterval` on
server start is the lazy, correct option):

- On start, and then on an interval, scan `DOWNLOAD_DIR`'s top-level entries.
- Delete any entry (the `{id}` folders from task 08, plus any stray files) whose
  newest mtime is older than the TTL. Use recursive remove for folders.
- **Never delete `.gitkeep`** (the dir is kept in git via that file).
- Wrap each remove in try/catch — a locked/in-use file must not crash the server
  or abort the rest of the sweep.
- Env config, with sensible defaults:
  - `DOWNLOAD_TTL_HOURS` = `24`
  - `CLEANUP_INTERVAL_MIN` = `60` (how often the sweep runs)
- Log one line per sweep: how many entries removed.
- Add the two env vars to `compose.yml`'s `api` service (documented, defaults fine).

ponytail: top-level mtime scan, not a deep walk — a folder's own mtime updates
when files are added, which is good enough; deepen only if it proves wrong.

## Acceptance

- Unit/self-check: point the sweep at a temp dir holding one fresh file, one
  folder back-dated past the TTL (via `utimes`), and a `.gitkeep`; run the sweep
  once → the stale folder is gone, the fresh file and `.gitkeep` remain. One
  runnable `assert`-based check (e.g. `bun cleanup-check.ts`).
- Server boot runs an initial sweep without error (check the log line).
- Interval is configurable and the default is 24h TTL / 60-min interval.

## Out of scope

Per-file LRU eviction, size-based caps, UI for retention. TTL-by-id-cache
interaction is expected: a cached file older than the TTL is purged and the next
request re-downloads it — that's fine.
