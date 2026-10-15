import { resolve, sep } from "node:path";
import type { BunRequest } from "bun";
import { type Ctx, attach } from "../context";

// wildcard tail isn't exposed via params; read it off the path. traversal guard enforces DIR
export const serveFile = (ctx: Ctx) => async (req: BunRequest) => {
  let rel: string;
  try { rel = decodeURIComponent(new URL(req.url).pathname.slice(15)); } catch { return new Response("bad path", { status: 400 }); }
  const full = resolve(ctx.DIR, rel);
  if (rel.includes("\0") || !full.startsWith(ctx.DIR + sep)) return new Response("forbidden", { status: 403 });
  const f = Bun.file(full);
  if (!(await f.exists())) return new Response("not found", { status: 404 });
  return attach(f, full.split(sep).pop()!);
};
