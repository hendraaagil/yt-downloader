# yt-downloader

Self-hosted YouTube downloader (LAN only).

    docker compose up --build

Open `http://<server-ip>:3003`. Files land in `./downloads`, job history in `./data/state.json`.

YouTube changes break old yt-dlp versions. The api container runs `yt-dlp -U` on startup, so a `docker compose restart api` picks up the latest. If a release outgrows the baked binary, rebuild: `docker compose build --no-cache api && docker compose up -d`.
