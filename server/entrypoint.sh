#!/bin/sh
# refresh yt-dlp so YouTube changes don't break old versions; non-fatal if offline
yt-dlp -U || true
exec bun index.ts
