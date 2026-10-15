import type { Downloader } from "../download/downloader";
import type { createQueue } from "../queue/queue";

export type Queue = Awaited<ReturnType<typeof createQueue>>;

// shared deps handlers close over
export type Ctx = {
  queue: Queue;
  gated: Downloader; // 1 global slot, shared by queue + one-shot
  DIR: string;
  enc: TextEncoder;
};

export const json = (b: unknown, status = 200) => Response.json(b, { status });

export const attach = (f: Bun.BunFile, name: string) =>
  new Response(f, {
    headers: { "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}` },
  });
