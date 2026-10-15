# YouTube cookies

Drop one or more **Netscape-format** cookie files here as `*.txt` (one per
YouTube account), e.g. `account1.txt`, `account2.txt`.

The dir is mounted **writable** into the api container at `/cookies`
(`COOKIES_DIR`) — yt-dlp rewrites each file after use to refresh its tokens.
The downloader **rotates** across every `*.txt` round-robin, one per download —
spreading load over accounts to ease the bot gate / HTTP 429. An empty dir means
no cookies. Never commit them — `*.txt` here is gitignored.

Export with a browser extension (e.g. "Get cookies.txt LOCALLY") while logged in
to youtube.com, or: `yt-dlp --cookies-from-browser <browser> --cookies out.txt`.
