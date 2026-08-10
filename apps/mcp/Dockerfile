FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN bun build --target=bun src/index.ts --outdir=dist

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV MCP_PORT=8787
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 8787
USER bun
CMD ["bun", "dist/index.js"]