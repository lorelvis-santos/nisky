# Nisky

Nisky es una plataforma multiusuario para gestión operativa, comercial y financiera.

## Fase actual

Fase 0: fundación del monorepo y autenticación multiusuario.

## Estructura

- `apps/backend`: API REST modular con Express, Bun, Prisma y PostgreSQL.
- `apps/frontend`: panel web con Next.js, React Query y Steel Monolith.
- `docs`: PRD, sistema visual y mockups funcionales.

## Inicio rápido

1. Copia `apps/backend/.env.example` a `apps/backend/.env`.
2. Copia `apps/frontend/.env.example` a `apps/frontend/.env.local`.
3. Ejecuta `docker compose up -d`.
4. Sigue las instrucciones de `AGENTS.md` para migrar y arrancar las apps.

Consulta `PROJECT_PLAN.md` para el alcance y `PROJECT_STATUS.md` para el estado.
