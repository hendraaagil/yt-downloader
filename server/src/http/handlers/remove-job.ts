import type { BunRequest } from "bun";
import type { Ctx } from "../context";

// :id is percent-decoded by Bun
export const removeJob = (ctx: Ctx) => (req: BunRequest<"/api/jobs/:id">) => {
  ctx.queue.remove(req.params.id);
  return new Response(null, { status: 204 });
};
