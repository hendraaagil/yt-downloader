import type { Format, Job } from "../types";
import type { Downloader } from "../download/downloader";
import assert from "node:assert/strict";
import * as state from "./state";

type Opts = {
  download: Downloader;
  stateFile?: string;
};

export async function createQueue(opts: Opts) {
  const jobs = await state.load(opts.stateFile);
  const subs = new Set<(j: Job) => void>();
  let running = 0;

  // on boot: interrupted jobs go back to the queue
  for (const j of jobs) if (j.status === "downloading") { j.status = "queued"; j.progress = 0; }

  const persist = () => state.save(jobs, opts.stateFile);
  const emit = (j: Job) => subs.forEach((f) => f({ ...j }));
  // ponytail: progress ticks are emitted but not persisted (only status changes hit disk)
  const change = (j: Job, write = true) => {
    if (!jobs.includes(j)) return; // removed mid-run
    emit(j);
    if (write) persist();
  };

  function pump() {
    while (running < 1) {
      const j = jobs.find((x) => x.status === "queued");
      if (!j) return;
      running++;
      j.status = "downloading";
      j.progress = 0;
      change(j);
      opts
        .download(j, (p) => { j.progress = p; change(j, false); })
        .then((r) => { j.status = "done"; j.progress = 100; j.file = r.file; j.title = r.title ?? j.title; })
        .catch((e) => { j.status = "failed"; j.error = String(e?.message ?? e) || "download failed"; })
        .finally(() => { running--; change(j); pump(); });
    }
  }

  const q = {
    list: () => jobs.map((j) => ({ ...j })),
    add(url: string, format: Format) {
      const j: Job = { id: crypto.randomUUID(), url, format, status: "queued", progress: 0, createdAt: Date.now() };
      jobs.push(j);
      persist();
      emit(j);
      pump();
      return { ...j };
    },
    remove(id: string) {
      const i = jobs.findIndex((j) => j.id === id);
      if (i < 0) return false;
      jobs.splice(i, 1);
      persist();
      return true;
    },
    subscribe(f: (j: Job) => void) {
      subs.add(f);
      return () => subs.delete(f);
    },
    idle: () => running === 0 && !jobs.some((j) => j.status === "queued"),
  };
  pump();
  return q;
}

async function demo() {
  const { rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const file = `${tmpdir()}/queue-demo-${Date.now()}.json`;
  let cur = 0, peak = 0;
  const stub: Downloader = async (_j, onProgress) => {
    peak = Math.max(peak, ++cur);
    onProgress(50);
    await Bun.sleep(50);
    cur--;
    return { file: "x.mp3" };
  };
  const q = await createQueue({ download: stub, stateFile: file });
  for (let i = 0; i < 3; i++) q.add(`https://example.com/${i}`, "mp3");
  while (!q.idle()) await Bun.sleep(10);
  await Bun.sleep(30); // let last persist flush
  assert.equal(peak, 1, "never more than 1 concurrent");
  assert.ok(q.list().every((j) => j.status === "done"), "all done");
  const reloaded = await state.load(file);
  assert.equal(reloaded.length, 3);
  assert.ok(reloaded.every((j) => j.status === "done"));

  // restart recovery: a stuck "downloading" job comes back queued and is rerun
  await state.save([{ ...reloaded[0], status: "downloading" }], file);
  const q2 = await createQueue({ download: stub, stateFile: file });
  assert.equal(q2.list()[0].status, "downloading"); // reset to queued, then re-picked
  while (!q2.idle()) await Bun.sleep(10);
  assert.equal(q2.list()[0].status, "done");
  await Bun.sleep(30);
  await rm(file, { force: true });
  console.log(`queue demo OK (peak concurrency ${peak})`);
}

if (import.meta.main) await demo();
