import type { BunRequest } from "bun";
import type { Ctx } from "../context";

export const events = (ctx: Ctx) => (req: BunRequest) => {
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(c) {
      const send = (s: string) => { try { c.enqueue(ctx.enc.encode(s)); } catch { cleanup(); } };
      send(`data: ${JSON.stringify(ctx.queue.list())}\n\n`);
      const unsub = ctx.queue.subscribe((j) => send(`data: ${JSON.stringify(j)}\n\n`));
      const ka = setInterval(() => send(": keep-alive\n\n"), 15000);
      cleanup = () => { unsub(); clearInterval(ka); };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel: () => cleanup(),
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" },
  });
};
