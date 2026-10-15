FROM oven/bun:1
# JS runtime for yt-dlp YouTube extraction (auto-detected on PATH)
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 curl ca-certificates \
 && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY . .
RUN bun install
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV PORT=4004 DOWNLOAD_DIR=/downloads STATE_FILE=/data/state.json
EXPOSE 4004
CMD ["/entrypoint.sh"]
