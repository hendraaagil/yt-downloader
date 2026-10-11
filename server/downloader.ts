import type { Job } from "./types";

const PCT = /^\[download\]\s+(\d+(?:\.\d+)?)%/;

export type Downloader = (
  job: Pick<Job, "url" | "format">,
  onProgress: (pct: number) => void,
) => Promise<{ file: string; title?: string }>;

export const download: Downloader = async (job, onProgress) => {
  const dir = process.env.DOWNLOAD_DIR ?? "./downloads";
  const fmt =
    job.format === "mp4"
      ? ["-f", "bv*[height<=1080]+ba/b", "--merge-output-format", "mp4"]
      : ["-x", "--audio-format", "mp3", "--audio-quality", "192K"];
  const proc = Bun.spawn(
    [
      "yt-dlp", ...fmt, "--newline", "--no-playlist", "--no-quiet", "--no-simulate",
      "--print", "before_dl:TITLE:%(title)s",
      "--print", "after_move:FILE:%(filepath)s",
      "-o", `${dir}/%(title)s [%(id)s].%(ext)s`,
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
  return { file: file.split(/[\\/]/).pop()!, title };
};

// standalone: bun downloader.ts <url> [mp3|mp4]
if (import.meta.main) {
  const [url, format = "mp3"] = process.argv.slice(2);
  let last = -1;
  console.log(await download({ url, format: format as Job["format"] }, (p) => {
    if (p !== last) console.log("progress", p), (last = p);
  }));
}
