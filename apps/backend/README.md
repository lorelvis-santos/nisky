# Nisky Backend

API modular de Nisky.

```bash
cp .env.example .env
bun install
bun run db:migrate -- --name init
bun run db:seed
bun run dev
```

API base: `http://localhost:4000/api/v1`.
