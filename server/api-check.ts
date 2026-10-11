// Self-check for task 04: bun api-check.ts  (stubbed downloader, no network)
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = await mkdtemp(join(tmpdir(), "api-check-"));
process.env.DOWNLOAD_DIR = join(tmp, "dl");
process.env.STATE_FILE = join(tmp, "state.json");
await Bun.write(join(tmp, "dl", "a.txt"), "hello");
await writeFile(join(tmp, "secret.txt"), "nope");

const { start } = await import("./index");
const { server } = await start(0, async (_j, onProgress) => {
  for (const p of [10, 50, 90]) { onProgress(p); await Bun.sleep(40); }
  return { file: "a.txt" };
});
const base = `http://localhost:${server.port}`;
const post = (b: unknown) => fetch(`${base}/api/jobs`, { method: "POST", body: JSON.stringify(b) });

// SSE: connect first, expect initial list + progress events
const sse = await fetch(`${base}/api/events`);
assert.equal(sse.headers.get("content-type"), "text/event-stream");
const reader = sse.body!.getReader();
let seen = "";
const pump = (async () => { for (;;) { const { value, done } = await reader.read(); if (done) return; seen += new TextDecoder().decode(value); } })();

assert.equal((await post({ urls: [], format: "mp3" })).status, 400);
assert.equal((await post({ urls: ["u"], format: "avi" })).status, 400);
assert.equal((await fetch(`${base}/api/jobs`, { method: "POST", body: "garbage" })).status, 400);

const r = await post({ urls: ["https://a", "https://b"], format: "mp3" });
assert.equal(r.status, 201);
const created = await r.json() as any[];
assert.equal(created.length, 2);
assert.equal(((await (await fetch(`${base}/api/jobs`)).json()) as any[]).length, 2);

await Bun.sleep(300);
assert.ok(!seen.includes("event:"), "SSE frames are unnamed");
const frames = seen.split("\n\n").filter((f) => f.startsWith("data: ")).map((f) => JSON.parse(f.slice(6)));
assert.ok(Array.isArray(frames[0]), "initial frame is Job[]");
assert.ok(frames.some((f) => !Array.isArray(f) && f.progress === 50), "single-Job progress frame");
await reader.cancel(); await pump;

assert.equal((await fetch(`${base}/api/downloads/a.txt`)).status, 200);
for (const p of ["../secret.txt", "..%2Fsecret.txt", "%2e%2e/secret.txt"]) {
  const s = (await fetch(`${base}/api/downloads/${p}`)).status;
  assert.ok(s === 403 || s === 404, `traversal ${p} -> ${s}`);
}
assert.equal((await fetch(`${base}/api/downloads/..%2Fsecret.txt`)).status, 403);

assert.equal((await fetch(`${base}/api/jobs/${created[0].id}`, { method: "DELETE" })).status, 204);
assert.equal(((await (await fetch(`${base}/api/jobs`)).json()) as any[]).length, 1);

server.stop(true);
await Bun.sleep(100);
await rm(tmp, { recursive: true, force: true });
console.log("api check OK");
