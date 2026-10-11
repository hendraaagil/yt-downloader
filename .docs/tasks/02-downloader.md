# Task 02 — Downloader (yt-dlp spawn + progress)

**Status:** Done
**Depends on:** 01
**Reference:** [`../architecture.md`](../architecture.md) §4.2

## Goal

`server/downloader.ts` — run yt-dlp for one URL + format, stream progress, resolve
on done/fail.

## Scope

- Export `download(job, onProgress)` → spawns yt-dlp with `--newline`.
- Command per format (from architecture §4.2):
  - **mp4:** `-f "bv*[height<=1080]+ba/b" --merge-output-format mp4`
  - **mp3:** `-x --audio-format mp3 --audio-quality 192K`
  - both: `-o "$DOWNLOAD_DIR/%(title)s [%(id)s].%(ext)s" --newline <URL>`
    (include `%(id)s` to avoid filename collisions)
- Parse stdout lines: regex `[download]  NN.N%` → call `onProgress(percent)`.
- Capture final filename (parse `--print after_move:filepath`, or scan output dir).
- Exit 0 → resolve `{ file }`; non-zero → reject with last ~10 stderr lines.
- Use `Bun.spawn`; pass args as array (no shell string — avoids injection).

## Acceptance

- Standalone script path: download one real public URL as mp3 and as mp4 into
  `DOWNLOAD_DIR`; progress callback fires with increasing percentages.
- A bad URL rejects with a non-empty error string, no crash.

## Out of scope

Queue/concurrency (task 03), HTTP wiring (task 04).
