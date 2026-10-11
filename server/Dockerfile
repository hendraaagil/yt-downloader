FROM oven/bun:1
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 curl ca-certificates \
 && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY . .
RUN bun install
ENV PORT=4003 CONCURRENCY=2 DOWNLOAD_DIR=/downloads STATE_FILE=/data/state.json
EXPOSE 4003
CMD ["bun", "index.ts"]
