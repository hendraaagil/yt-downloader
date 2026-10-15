# Task 11 — Bun native routing + named handlers

**Status:** Not Started
**Depends on:** 10
**Reference:** [`../architecture.md`](../architecture.md)
**Owner:** backend-dev

## Goal

Replace the manual `fetch` pathname dispatch in `server/src/http/server.ts` with
`Bun.serve({ routes })`, and give **every route its own named handler function**
instead of inlining handlers in the `routes` object.

## Scope

In `server/src/http/server.ts`:

- Use `Bun.serve`'s `routes` map. `fetch` stays as the unmatched catch-all (404).
- Route table:
  | Route | Methods | Handler |
  |-------|---------|---------|
  | `/api/health` | any | static `Response` (cached, zero-alloc) |
  | `/api/jobs` | GET, POST | `listJobs`, `addJobs` |
  | `/api/jobs/:id` | DELETE | `removeJob` (`req.params.id`, Bun-decoded) |
  | `/api/events` | GET | `events` (SSE) |
  | `/api/download` | POST | `downloadOne` (one-shot, gated) |
  | `/api/downloads/*` | GET | `serveFile` |
- **Each handler is a named function**, defined inside `start()` (so it keeps the
  closure over `queue`, `gated`, `DIR`, `enc`). The `routes` object only
  references them — no inline arrow bodies.
- Keep the shared `attach(file, name)` helper and the `serialize` gate as-is.

ponytail: named closures inside `start()`, not module-level functions threading
deps through params — same scope, less boilerplate. No router lib.

### Known Bun gotcha (keep)

Bun does **not** expose the `*` wildcard tail in `req.params` (verified: params
is empty for a `/*` route). `serveFile` must read the tail off the URL
(`new URL(req.url).pathname.slice(15)`) and `decodeURIComponent` it, then apply
the existing traversal guard (`\0` check + `full.startsWith(DIR + sep)`). Do not
rely on `req.params["*"]`.

## Acceptance

- `bun run check` passes from `server/` (queue demo peak 1, api check, cleanup).
- No handler is inlined in the `routes` object — each is a named `const`/function
  referenced by name.
- Server boots (`bun src/index.ts`), `/api/health` → `{"ok":true}`, unmatched
  path → 404 `{"error":"not found"}`.
- File-serving behavior unchanged: `/api/downloads/a.txt` → 200; traversal
  attempts → 403/404.

## Out of scope

Frontend, nginx, compose. Any change to download/queue/cleanup logic. New routes.
Note: unknown method on a known path now yields Bun's 405 (was 404) — accepted.
