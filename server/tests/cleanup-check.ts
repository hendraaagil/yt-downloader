import assert from "node:assert";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sweep } from "../src/cleanup/cleanup";

const dir = await mkdtemp(join(tmpdir(), "cleanup-"));
try {
  await writeFile(join(dir, "fresh.mp3"), "x");
  await writeFile(join(dir, ".gitkeep"), "");
  await mkdir(join(dir, "stale"));
  await writeFile(join(dir, "stale", "a.mp4"), "x");
  const old = new Date(Date.now() - 48 * 3600_000);
  await utimes(join(dir, "stale"), old, old);
  await utimes(join(dir, ".gitkeep"), old, old); // old but must survive

  assert.equal(await sweep(dir, 24 * 3600_000), 1);
  assert(!existsSync(join(dir, "stale")), "stale folder removed");
  assert(existsSync(join(dir, "fresh.mp3")), "fresh file kept");
  assert(existsSync(join(dir, ".gitkeep")), ".gitkeep kept");
  console.log("cleanup-check OK");
} finally {
  await rm(dir, { recursive: true, force: true });
}
