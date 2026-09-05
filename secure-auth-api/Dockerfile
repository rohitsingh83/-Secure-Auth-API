# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodeuser -u 1001 -G nodejs

WORKDIR /app

COPY --from=builder --chown=nodeuser:nodejs /app /app

USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
