# Task 12 — One file per route handler

**Status:** Not Started
**Depends on:** 11
**Reference:** [`../architecture.md`](../architecture.md)
**Owner:** backend-dev

## Goal

Move each named route handler out of `server/src/http/server.ts` into its own
file under `server/src/http/handlers/`. `server.ts` keeps only the server
wiring (`serialize` gate, `start()`, `Bun.serve({ routes })`).

## Scope

Handlers close over `queue`, `gated`, `DIR`, `enc`, plus the `json`/`attach`
helpers. To move them into separate modules, pass those deps explicitly via a
small context object; each handler is a **factory** `(ctx) => handler`.

New tree:
```
server/src/http/
  server.ts          # serialize + start() + Bun.serve wiring; builds ctx
  context.ts         # Ctx type + json() + attach() helpers
  handlers/
    list-jobs.ts     # listJobs
    add-jobs.ts      # addJobs
    remove-job.ts    # removeJob
    events.ts        # events (SSE)
    download-one.ts  # downloadOne (one-shot, gated)
    serve-file.ts    # serveFile (wildcard)
```

- `context.ts`:
  - `type Ctx = { queue: Queue; gated: Downloader; DIR: string; enc: TextEncoder }`
    where `Queue = Awaited<ReturnType<typeof createQueue>>`.
  - `json(body, status?)` and `attach(file, name)` helpers (moved from server.ts).
- Each handler file exports one factory, e.g.
  `export const addJobs = (ctx: Ctx) => async (req: BunRequest) => { ... }`.
- `server.ts` builds `ctx` once in `start()`, then the `routes` map references
  `listJobs(ctx)`, `addJobs(ctx)`, etc. No handler bodies left in `server.ts`.
- Keep the Bun wildcard gotcha in `serve-file.ts` (read tail off the URL, not
  `req.params["*"]`) and the traversal guard unchanged.

ponytail: factory-per-file is what "one file per handler" costs given the shared
closure — one `Ctx` object, no DI framework, no per-dep threading. Helpers live
in `context.ts` so every handler imports from one place.

## Acceptance

- `bun run check` passes from `server/` (queue demo peak 1, api check, cleanup).
- `server.ts` contains no route-handler body — only `serialize`, `start()`,
  `ctx` construction, and the `routes`/`fetch` wiring referencing the factories.
- Six handler files exist, one exported factory each; `context.ts` holds `Ctx`,
  `json`, `attach`.
- Server boots, `/api/health` → `{"ok":true}`, unmatched → 404, file-serving and
  traversal behavior unchanged.

## Out of scope

Frontend, nginx, compose. Any behavior change. Splitting queue/state/cleanup
further. New routes.
