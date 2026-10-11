# Task 04 — API routes + SSE

**Status:** Done
**Depends on:** 02, 03
**Reference:** [`../architecture.md`](../architecture.md) §5

## Goal

Wire the queue to HTTP. REST routes + an SSE stream for live progress, all on
`:4003` under `/api`.

## Scope

In `server/index.ts`:

| Method | Path               | Behavior |
|--------|--------------------|----------|
| POST   | `/api/jobs`        | Body `{ urls: string[], format }` → one `queue.add` per URL → 201 + created jobs. |
| GET    | `/api/jobs`        | `queue.list()`. |
| GET    | `/api/events`      | SSE: push `job` updates on every queue change; send current list on connect. |
| DELETE | `/api/jobs/:id`    | `queue.remove(id)` → 204. |
| GET    | `/api/downloads/*` | Serve a finished file from `DOWNLOAD_DIR` (guard against path traversal). |

- Validate POST body: non-empty `urls`, `format` ∈ {mp3,mp4}; reject 400 otherwise.
- SSE: `Content-Type: text/event-stream`, keep-alive comment every ~15s, clean up
  subscription on disconnect.

## Acceptance

- `POST /api/jobs` with 2 URLs → `GET /api/jobs` shows 2 jobs.
- `curl -N /api/events` streams progress lines as a download runs.
- `DELETE` removes a job; invalid body → 400; traversal path (`../`) → 403/404.

## Out of scope

CORS (nginx same-origin handles it — task 06). Frontend (task 05).
