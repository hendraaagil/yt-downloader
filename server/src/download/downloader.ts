import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { Job } from "../types";

// optional YouTube cookies (bot gate / 429). rotate across every *.txt in
// COOKIES_DIR (round-robin per download, spreads load over accounts); else fall
// back to a single COOKIES_FILE; else no-op. ponytail: in-memory counter, resets on restart.
let rot = 0;
export const cookieArgs = () => {
  const dir = process.env.COOKIES_DIR;
  if (dir) {
    let files: string[] = [];
    try { files = readdirSync(dir).filter((f) => f.endsWith(".txt")).sort().map((f) => join(dir, f)); } catch {}
    if (files.length) return ["--cookies", files[rot++ % files.length]];
  }
  const f = process.env.COOKIES_FILE;
  return f && existsSync(f) ? ["--cookies", f] : [];
};

const ID = /(?:youtu\.be\/|[?&]v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/;
const PCT = /^\[download\]\s+(\d+(?:\.\d+)?)%/;

export type Downloader = (
  job: Pick<Job, "url" | "format">,
  onProgress: (pct: number) => void,
) => Promise<{ file: string; title?: string }>;

export const download: Downloader = async (job, onProgress) => {
  const dir = process.env.DOWNLOAD_DIR ?? "./downloads";
  const id = ID.exec(job.url)?.[1];
  if (id) {
    const ext = "." + job.format;
    const hit = (await readdir(`${dir}/${id}`).catch(() => [] as string[])).find((f) => f.endsWith(ext));
    if (hit) {
      onProgress(100);
      return { file: `${id}/${hit}`, title: hit.slice(0, -ext.length) };
    }
  }
  const fmt =
    job.format === "mp4"
      ? ["-f", "bv*[height<=1080]+ba/b", "--merge-output-format", "mp4"]
      : ["-x", "--audio-format", "mp3", "--audio-quality", "192K", "--embed-metadata", "--embed-thumbnail"];
  const proc = Bun.spawn(
    [
      "yt-dlp", ...fmt, ...cookieArgs(), "--newline", "--no-playlist", "--no-quiet", "--no-simulate",
      "--print", "before_dl:TITLE:%(title)s",
      "--print", "after_move:FILE:%(filepath)s",
      "-o", `${dir}/%(id)s/%(title)s.%(ext)s`,
      "--", job.url, // "--" so a url can never be read as an option
    ],
    { stdout: "pipe", stderr: "pipe" },
  );

  let file = "", title: string | undefined;
  const out = (async () => {
    let buf = "";
    const handle = (l: string) => {
      const m = PCT.exec(l);
      if (m) onProgress(parseFloat(m[1]));
      else if (l.startsWith("TITLE:")) title = l.slice(6);
      else if (l.startsWith("FILE:")) file = l.slice(5);
    };
    const dec = new TextDecoder();
    for await (const chunk of proc.stdout) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split(/\r?\n/);
      buf = lines.pop()!;
      lines.forEach(handle);
    }
    if (buf) handle(buf);
  })();
  const err = new Response(proc.stderr).text();

  const [code, , stderr] = await Promise.all([proc.exited, out, err]);
  if (code !== 0) {
    const tail = stderr.trim().split("\n").slice(-10).join("\n");
    throw new Error(tail || `yt-dlp exited with code ${code}`);
  }
  if (!file) throw new Error("yt-dlp finished but reported no output file");
  return { file: relative(resolve(dir), resolve(file)).replaceAll("\\", "/"), title };
};

// standalone: bun downloader.ts <url> [mp3|mp4]  |  bun downloader.ts selftest
if (import.meta.main) {
  if (process.argv[2] === "selftest") {
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    delete process.env.COOKIES_DIR;
    delete process.env.COOKIES_FILE;
    assert.deepEqual(cookieArgs(), [], "unset -> no flag");

    // single-file fallback
    process.env.COOKIES_FILE = join(await mkdtemp(join(tmpdir(), "ck-")), "nope.txt");
    assert.deepEqual(cookieArgs(), [], "missing file -> no flag");
    await writeFile(process.env.COOKIES_FILE, "# c");
    assert.deepEqual(cookieArgs(), ["--cookies", process.env.COOKIES_FILE], "present -> flag");

    // rotation across *.txt in COOKIES_DIR (takes precedence over COOKIES_FILE)
    const dir = await mkdtemp(join(tmpdir(), "ckdir-"));
    const a = join(dir, "a.txt"), b = join(dir, "b.txt");
    await writeFile(a, "# a"); await writeFile(b, "# b");
    process.env.COOKIES_DIR = dir;
    rot = 0;
    assert.deepEqual([cookieArgs(), cookieArgs(), cookieArgs()], [["--cookies", a], ["--cookies", b], ["--cookies", a]], "round-robin a,b,a");
    console.log("downloader cookieArgs OK");
    process.exit(0);
  }
  const [url, format = "mp3"] = process.argv.slice(2);
  let last = -1;
  console.log(await download({ url, format: format as Job["format"] }, (p) => {
    if (p !== last) console.log("progress", p), (last = p);
  }));
}
