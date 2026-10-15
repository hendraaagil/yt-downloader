import type { BunRequest } from "bun";
import { type Ctx, json } from "../context";

export const addJobs = (ctx: Ctx) => async (req: BunRequest) => {
  const b: any = await req.json().catch(() => null);
  if (
    !b || !Array.isArray(b.urls) || !b.urls.length ||
    !b.urls.every((u: unknown) => typeof u === "string" && u.trim()) ||
    (b.format !== "mp3" && b.format !== "mp4")
  ) return json({ error: "need non-empty urls[] and format mp3|mp4" }, 400);
  return json(b.urls.map((u: string) => ctx.queue.add(u.trim(), b.format)), 201);
};
