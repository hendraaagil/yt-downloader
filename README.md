# yt-downloader

Self-hosted YouTube downloader (LAN only).

    docker compose up --build

Open `http://<server-ip>:3003`. Files land in `./downloads`, job history in `./data/state.json`.

YouTube changes break old yt-dlp versions: rebuild periodically (`docker compose build --no-cache api && docker compose up -d`) to keep yt-dlp updated.
