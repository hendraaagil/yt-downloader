import { resolve } from "node:path";
import type { BunRequest } from "bun";
import { type Ctx, attach, json } from "../context";

// one-shot: download a single link and stream the file back. No queue/SSE/state.
export const downloadOne = (ctx: Ctx) => async (req: BunRequest) => {
  const b: any = await req.json().catch(() => null);
  if (
    !b || typeof b.url !== "string" || !b.url.trim() ||
    (b.format !== "mp3" && b.format !== "mp4")
  ) return json({ error: "need url and format mp3|mp4" }, 400);
  let res;
  try { res = await ctx.gated({ url: b.url.trim(), format: b.format }, () => {}); }
  catch (e) { return json({ error: String((e as Error)?.message ?? e) }, 502); }
  const f = Bun.file(resolve(ctx.DIR, res.file));
  if (!(await f.exists())) return json({ error: "file missing after download" }, 500);
  return attach(f, res.file.split("/").pop()!);
};
