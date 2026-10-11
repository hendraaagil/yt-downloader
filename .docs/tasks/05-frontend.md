# Task 05 — Frontend (React + Tailwind)

**Status:** Done
**Depends on:** 04
**Reference:** [`../architecture.md`](../architecture.md) §4.3

## Goal

React + Tailwind UI in `web/`: paste links, pick format, watch jobs live.

## Scope

- Vite + React + TS + Tailwind in `web/`.
- `LinkInput.tsx` — textarea (one URL per line), MP3/MP4 toggle, **Add to queue**
  → `POST /api/jobs` with the split, trimmed, non-empty lines.
- `JobList.tsx` — table: title/url, format, status badge, progress bar, delete
  button; finished rows link to `/api/downloads/<file>`.
- `useEvents.ts` — `EventSource('/api/events')`, merge updates into job state;
  initial `GET /api/jobs` on mount.
- **All calls use relative `/api/...`** (nginx serves same origin — no base URL,
  no CORS).
- Keep it one screen, no router.

## Acceptance

- `vite build` produces `dist/`.
- Against a running api (dev: Vite proxy `/api` → `localhost:4003`): paste 2
  links, submit, both appear and progress bars move live to 100%.
- Delete button removes a row.

## Out of scope

nginx/container (task 06). Auth, pagination.
