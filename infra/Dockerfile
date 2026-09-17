FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:24-alpine AS migrator
WORKDIR /app
RUN addgroup -S -g 10001 agora && adduser -S -G agora -u 10001 agora
COPY --from=deps --chown=agora:agora /app/node_modules ./node_modules
COPY --chown=agora:agora src/datos ./src/datos
COPY --chown=agora:agora src/auth ./src/auth
COPY --chown=agora:agora src/env.ts ./src/env.ts
COPY --chown=agora:agora src/logger.ts ./src/logger.ts
COPY --chown=agora:agora tsconfig.json ./tsconfig.json
USER agora
CMD ["npx", "tsx", "src/datos/migrar.ts"]

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S -g 10001 agora && adduser -S -G agora -u 10001 agora
COPY --from=builder --chown=agora:agora /app/.next/standalone ./
COPY --from=builder --chown=agora:agora /app/.next/static ./.next/static
COPY --from=builder --chown=agora:agora /app/public ./public
USER agora
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
