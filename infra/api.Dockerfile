# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24-bookworm-slim

FROM ${NODE_IMAGE} AS base
# Prisma engines need OpenSSL; the slim image ships without it.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# The running API/worker only need production packages. Keep Prisma CLI,
# Nest build tools, and their advisories out of the long-lived app containers.
FROM base AS runtime-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./
RUN npx prisma generate && npm run build

# Runs migrations, then exits. Compose waits for it before starting the API.
FROM base AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json backend/prisma.config.ts ./
COPY backend/prisma ./prisma
COPY backend/scripts ./scripts
CMD ["node", "scripts/run-with-db-url.mjs", "npx", "prisma", "migrate", "deploy"]

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /var/lib/dvb/media && chown -R node:node /var/lib/dvb/media
COPY --chown=node:node --from=runtime-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node backend/package.json ./
COPY --chown=node:node backend/prisma ./prisma
COPY --chown=node:node backend/scripts ./scripts
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
