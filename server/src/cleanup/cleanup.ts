import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

// Delete top-level entries of dir older than ttlMs (never .gitkeep). Returns count removed.
// ponytail: top-level mtime only, not a deep walk; deepen if folder mtimes prove unreliable.
export async function sweep(dir: string, ttlMs: number) {
  let n = 0;
  for (const name of await readdir(dir).catch(() => [])) {
    if (name === ".gitkeep") continue;
    try {
      const p = join(dir, name);
      if (Date.now() - (await stat(p)).mtimeMs > ttlMs) { await rm(p, { recursive: true, force: true }); n++; }
    } catch (e) { console.error(`cleanup: ${name}: ${(e as Error).message}`); }
  }
  console.log(`cleanup: removed ${n} entries`);
  return n;
}
