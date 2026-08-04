# Stage 1: Builder
FROM oven/bun:1.3.11-slim AS builder

RUN apt-get update -y \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bunx prisma generate

# Stage 2: Runner
FROM oven/bun:1.3.11-slim AS runner

RUN apt-get update -y \
  && apt-get install -y openssl adduser \
  && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 bunjs \
  && adduser --system --uid 1001 bunuser

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

USER bunuser

COPY --from=builder --chown=bunuser:bunjs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=bunuser:bunjs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=bunuser:bunjs /app/package.json ./package.json
COPY --from=builder --chown=bunuser:bunjs /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder --chown=bunuser:bunjs /app/src ./src
COPY --from=builder --chown=bunuser:bunjs /app/node_modules ./node_modules

EXPOSE 4000

ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
