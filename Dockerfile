# Berry Server Dockerfile
FROM oven/bun:1.3.5-debian

WORKDIR /app

# Copy package files for dependency installation
COPY packages/server/package.json ./package.json

# Install dependencies directly (not as workspace)
RUN bun install

# Copy source code
COPY packages/server/src ./src

# Expose the default port (can be overridden via PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Start the server
CMD ["bun", "run", "src/index.ts"]
