import { rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Job } from "./types";

const FILE = () => process.env.STATE_FILE ?? "./data/state.json";

export async function load(file = FILE()): Promise<Job[]> {
  const f = Bun.file(file);
  return (await f.exists()) ? await f.json() : [];
}

// saves are serialized: concurrent rename onto the same target fails with EPERM on Windows
let chain: Promise<unknown> = Promise.resolve();
export function save(jobs: Job[], file = FILE()) {
  const data = JSON.stringify(jobs); // snapshot now, write later
  return (chain = chain.then(async () => {
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await Bun.write(tmp, data);
    await rename(tmp, file);
  }).catch((e) => console.error("state save failed:", e)));
}
