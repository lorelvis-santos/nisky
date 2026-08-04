#!/bin/sh
set -e

bunx prisma migrate deploy
bunx prisma db seed

exec bun run src/server.ts
