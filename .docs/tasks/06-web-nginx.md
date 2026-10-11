# Task 06 — Web Dockerfile + nginx proxy

**Status:** Done
**Depends on:** 05
**Reference:** [`../architecture.md`](../architecture.md) §7

## Goal

Package the frontend behind nginx on `:3003`, proxying `/api` to `api:4004`.

## Scope

- `web/Dockerfile` (multi-stage):
  1. `oven/bun` → `bun install` → `vite build` → `dist/`.
  2. `nginx:alpine` → copy `dist/` to html root + copy `nginx.conf`. `EXPOSE 3003`.
- `web/nginx.conf`:
  - `listen 3003;`
  - `location /` → `try_files $uri /index.html;` (SPA fallback).
  - `location /api/` → `proxy_pass http://api:4004;` with:
    - `proxy_http_version 1.1;` + `proxy_set_header Connection "";`
    - `proxy_buffering off;` (**required** for SSE or progress stalls)
    - `proxy_read_timeout 1h;` (long downloads)

## Acceptance

- `docker build ./web` succeeds.
- Run web + api together: `http://localhost:3003` loads the UI.
- UI's `/api/jobs` and `/api/events` work through the proxy (progress streams live).

## Out of scope

Compose/volumes (task 07).
