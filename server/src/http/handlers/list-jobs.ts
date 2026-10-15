import { type Ctx, json } from "../context";

export const listJobs = (ctx: Ctx) => () => json(ctx.queue.list());
