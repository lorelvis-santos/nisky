# Nisky Frontend

Panel web de Nisky con Next.js 16.

```bash
cp .env.example .env.local
bun install
bun run dev
```

La API del navegador usa `/api/v1`; Next.js la reescribe a `BACKEND_INTERNAL_URL` para mantener la cookie de refresh en el mismo origen del panel.
