import { resolve } from "node:path";
import { download, type Downloader } from "../download/downloader";
import { createQueue } from "../queue/queue";
import { type Ctx, json } from "./context";
import { listJobs } from "./handlers/list-jobs";
import { addJobs } from "./handlers/add-jobs";
import { removeJob } from "./handlers/remove-job";
import { events } from "./handlers/events";
import { downloadOne } from "./handlers/download-one";
import { serveFile } from "./handlers/serve-file";

// serialize: run one at a time; next waits for the previous to settle.
function serialize<A extends unknown[], R>(fn: (...a: A) => Promise<R>) {
  let chain: Promise<unknown> = Promise.resolve();
  return (...a: A): Promise<R> => {
    const run = chain.then(() => fn(...a));
    chain = run.catch(() => {}); // a failure must not wedge the gate
    return run;
  };
}

export async function start(port: number, dl: Downloader = download) {
  const gated = serialize(dl); // one global slot shared by queue + one-shot
  const DIR = resolve(process.env.DOWNLOAD_DIR ?? "./downloads");
  const queue = await createQueue({ download: gated });
  const ctx: Ctx = { queue, gated, DIR, enc: new TextEncoder() };

  const server = Bun.serve({
    port,
    idleTimeout: 0, // SSE connections are long-lived
    routes: {
      "/api/health": json({ ok: true }), // static: cached, zero-alloc dispatch
      "/api/jobs": { GET: listJobs(ctx), POST: addJobs(ctx) },
      "/api/jobs/:id": { DELETE: removeJob(ctx) },
      "/api/events": { GET: events(ctx) },
      "/api/download": { POST: downloadOne(ctx) },
      "/api/downloads/*": { GET: serveFile(ctx) },
    },
    fetch: () => json({ error: "not found" }, 404), // unmatched routes
  });
  return { server, queue };
}
