# Task 07 — Compose wiring + LAN test

**Status:** Done
**Depends on:** 06
**Reference:** [`../architecture.md`](../architecture.md) §6, §7

## Goal

One `compose.yml` that runs both services with persistent volumes, and a
verified download end-to-end over the LAN.

## Scope

- `compose.yml`:
  - `api`: `build: ./server`, `ports: ["4004:4004"]` (optional/debug),
    volumes `./data:/data` + `./downloads:/downloads`, env (`PORT=4004`,
    `CONCURRENCY=2`, `DOWNLOAD_DIR=/downloads`, `STATE_FILE=/data/state.json`),
    `restart: unless-stopped`.
  - `web`: `build: ./web`, `ports: ["3003:3003"]`, `depends_on: [api]`,
    `restart: unless-stopped`.
- Ensure `./data` and `./downloads` exist on the host (compose creates on mount).
- Short README note: access at `http://<server-ip>:3003`; keep yt-dlp updated.

## Acceptance

- `docker compose up --build` → both services healthy.
- From another device on the LAN, open `http://<server-ip>:3003`, paste a few
  links, pick MP3 and MP4 → files land in `./downloads` on the server.
- `docker compose down && up` → prior job history reloads from `./data/state.json`.

## Out of scope

HTTPS, auth, internet exposure (LAN only — see architecture §9).
