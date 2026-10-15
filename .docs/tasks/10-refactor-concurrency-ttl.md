# Task 10 — Folder refactor + single global download + 12h TTL

**Status:** Done
**Depends on:** 09
**Reference:** [`../architecture.md`](../architecture.md)
**Owner:** backend-dev

## Goal

Three changes to the backend, all in `server/`:

1. **Refactor** the flat `server/*.ts` into concern folders under `server/src/`.
2. **Remove concurrency config.** Allow exactly **one** download at a time,
   globally — shared by both `/api/jobs` (queue) and `/api/download` (one-shot).
   No `CONCURRENCY` env, no `concurrency` option.
3. **Sweep TTL 24h → 12h** default.

## Scope

### 1. Folder refactor

Move files; no logic changes beyond updating import paths. Target layout:

```
server/
  src/
    index.ts        # entry: compose start() + boot the cleanup loop
    http/
      server.ts     # Bun.serve + all routes (the current index.ts fetch handler)
    queue/
      queue.ts
      state.ts
    download/
      downloader.ts
    cleanup/
      cleanup.ts     # the sweep() fn, extracted out of index.ts
    types.ts         # shared Job/Format/JobStatus
  tests/
    api-check.ts
    cleanup-check.ts
  Dockerfile, entrypoint.sh, package.json, tsconfig.json, bun.lock, .dockerignore
```

- Split the current `index.ts` into three: `http/server.ts` (the `start()` +
  `Bun.serve` + routes), `cleanup/cleanup.ts` (the `sweep()` fn), and
  `src/index.ts` (the `import.meta.main` block: compose, boot sweep, listen).
- Update every relative import to match the new tree.
- Update `package.json` scripts (`start`, `check`) and `entrypoint.sh`
  (`bun index.ts` → `bun src/index.ts`) and the Dockerfile `COPY`/paths as needed.
  Keep `bun install` working (bun.lock stays at `server/`).
- `tests/api-check.ts` and `tests/cleanup-check.ts` import from `../src/...`.

ponytail: concern folders, not one-file-per-folder sprawl beyond what's listed.
`queue/` holding queue + state is deliberate (state is the queue's persistence).
Don't invent a DI framework — plain module imports + `start(port, dl)` wiring.

### 2. Single global download (remove concurrency)

The one real behavior change. Today `/api/download` calls the downloader
**directly** (bypasses the queue), so a one-shot and a queued job run in
parallel. Requirement: never more than one yt-dlp download running at once,
whichever route started it.

Laziest correct approach: a single **1-slot serialize gate** wrapping the
downloader, created once in `start()` and used by **both** paths.

```ts
// serialize: run one at a time; next waits for the previous to settle.
function serialize<A extends unknown[], R>(fn: (...a: A) => Promise<R>) {
  let chain: Promise<unknown> = Promise.resolve();
  return (...a: A): Promise<R> => {
    const run = chain.then(() => fn(...a));
    chain = run.catch(() => {}); // a failure must not wedge the gate
    return run;
  };
}
```

- In `start()`: `const gated = serialize(dl);` — pass `gated` to `createQueue`
  **and** use `gated` in the `/api/download` handler. Both already route through
  the same `dl`, so gating it once covers both.
- `queue.ts`: remove the `concurrency` option and the `CONCURRENCY` env read;
  hardcode the worker to **1** in-flight (so only one job shows `downloading` at
  a time, matching the gate). Update the `demo()` self-check to concurrency 1 and
  assert peak == 1.
- Remove `CONCURRENCY` from the Dockerfile `ENV` line and from `compose.yml`.

ponytail: the gate alone enforces global 1; the queue limit of 1 just keeps job
status honest. No semaphore lib, no new dep.

### 3. TTL 24h → 12h

- `src/index.ts`: default `DOWNLOAD_TTL_HOURS` `24` → `12`.
- `compose.yml`: `DOWNLOAD_TTL_HOURS: "24"` → `"12"`.
- Update task 09 doc's "Default retention 24h" references if touched (optional).

## Acceptance

- `bun run check` (queue demo + api-check) passes from `server/` with the new
  paths. Queue demo asserts **peak concurrency == 1**.
- A self-check (extend `api-check.ts` or add one) proves the global gate:
  start a job via the queue and fire `/api/download` at the same time against a
  stub downloader that records peak concurrency → peak is **1**.
- `cleanup-check.ts` still passes against `../src/cleanup/cleanup.ts`.
- Server boots (`bun src/index.ts`), logs the initial sweep line, listens on
  `:4004`. Docker image builds and `compose up` still serves.
- No `CONCURRENCY` left anywhere (`grep -ri concurrency server compose.yml` only
  hits comments/demo, not config).
- TTL default is 12h in code and compose.

## Out of scope

Frontend, nginx, compose topology beyond the two env edits. Changing the
download logic itself (metadata/format flags stay as-is). Multi-user scaling.
