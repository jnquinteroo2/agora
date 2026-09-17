FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM mcr.microsoft.com/playwright:v1.62.1-noble AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN groupadd --system --gid 10001 agora \
 && useradd --system --uid 10001 --gid agora --no-create-home --shell /usr/sbin/nologin agora

COPY --from=deps --chown=agora:agora /app/node_modules ./node_modules
COPY --chown=agora:agora . .

USER agora

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('./worker/health.js')" || exit 1

CMD ["node", "--import", "tsx/esm", "worker/main.ts"]
