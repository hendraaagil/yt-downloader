import { resolve } from "node:path";
import { start } from "./http/server";
import { sweep } from "./cleanup/cleanup";

const { server } = await start(Number(process.env.PORT ?? 4004));
const dir = resolve(process.env.DOWNLOAD_DIR ?? "./downloads");
const ttl = Number(process.env.DOWNLOAD_TTL_HOURS ?? 12) * 3600_000;
const run = () => sweep(dir, ttl);
await run();
setInterval(run, Number(process.env.CLEANUP_INTERVAL_MIN ?? 60) * 60_000).unref();
console.log(`api listening on :${server.port}`);
