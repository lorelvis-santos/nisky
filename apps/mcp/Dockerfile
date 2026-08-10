FROM oven/bun:1 AS deps
WORKDIR /app
COPY apps/mcp/package.json apps/mcp/bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/mcp/package.json apps/mcp/tsconfig.json ./
COPY apps/mcp/src ./src
RUN bun build --target=bun src/index.ts --outdir=dist

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY apps/mcp/package.json ./
EXPOSE 8787
USER bun
CMD ["bun", "dist/index.js"]