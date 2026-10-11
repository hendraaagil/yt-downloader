import { resolve, sep } from "node:path";
import { download, type Downloader } from "./downloader";
import { createQueue } from "./queue";

const json = (b: unknown, status = 200) => Response.json(b, { status });

export async function start(port: number, dl: Downloader = download) {
  const DIR = resolve(process.env.DOWNLOAD_DIR ?? "./downloads");
  const queue = await createQueue({ download: dl });
  const enc = new TextEncoder();

  const server = Bun.serve({
    port,
    idleTimeout: 0, // SSE connections are long-lived
    async fetch(req) {
      const { pathname } = new URL(req.url);
      const m = req.method;

      if (pathname === "/api/health") return json({ ok: true });

      if (pathname === "/api/jobs" && m === "GET") return json(queue.list());

      if (pathname === "/api/jobs" && m === "POST") {
        const b: any = await req.json().catch(() => null);
        if (
          !b || !Array.isArray(b.urls) || !b.urls.length ||
          !b.urls.every((u: unknown) => typeof u === "string" && u.trim()) ||
          (b.format !== "mp3" && b.format !== "mp4")
        ) return json({ error: "need non-empty urls[] and format mp3|mp4" }, 400);
        return json(b.urls.map((u: string) => queue.add(u.trim(), b.format)), 201);
      }

      if (pathname.startsWith("/api/jobs/") && m === "DELETE") {
        queue.remove(decodeURIComponent(pathname.slice(10)));
        return new Response(null, { status: 204 });
      }

      if (pathname === "/api/events" && m === "GET") {
        let cleanup = () => {};
        const stream = new ReadableStream({
          start(c) {
            const send = (s: string) => { try { c.enqueue(enc.encode(s)); } catch { cleanup(); } };
            send(`data: ${JSON.stringify(queue.list())}\n\n`);
            const unsub = queue.subscribe((j) => send(`data: ${JSON.stringify(j)}\n\n`));
            const ka = setInterval(() => send(": keep-alive\n\n"), 15000);
            cleanup = () => { unsub(); clearInterval(ka); };
            req.signal.addEventListener("abort", cleanup);
          },
          cancel: () => cleanup(),
        });
        return new Response(stream, {
          headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" },
        });
      }

      if (pathname.startsWith("/api/downloads/") && m === "GET") {
        let rel: string;
        try { rel = decodeURIComponent(pathname.slice(15)); } catch { return new Response("bad path", { status: 400 }); }
        const full = resolve(DIR, rel);
        if (rel.includes("\0") || !full.startsWith(DIR + sep)) return new Response("forbidden", { status: 403 });
        const f = Bun.file(full);
        if (!(await f.exists())) return new Response("not found", { status: 404 });
        return new Response(f, {
          headers: { "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(full.split(sep).pop()!)}` },
        });
      }

      return json({ error: "not found" }, 404);
    },
  });
  return { server, queue };
}

if (import.meta.main) {
  const { server } = await start(Number(process.env.PORT ?? 4003));
  console.log(`api listening on :${server.port}`);
}
