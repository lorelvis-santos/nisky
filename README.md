# Nisky

Plataforma multiusuario para gestión operativa, comercial y financiera, con foco en la gestión diaria: tareas, hábitos, capturas rápidas, pomodoro y notas.

## Stack

- **Backend**: Bun + Express 5 + Prisma 7 + PostgreSQL (módulos: auth, tasks, habits, quicknotes, pomodoro, journal, reminders, moodle, push).
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + shadcn/ui. Sistema visual Steel Monolith.
- **Infra**: Docker Compose (Postgres + MinIO).

## Estado

Fase 1 (Gestión diaria) completada: planificación semanal con drag & drop, hábitos, capturas rápidas, Pomodoro, diario cifrado, base de conocimiento, recordatorios con notificaciones push e integración con Moodle. Detalle por iteración en [`PROJECT_STATUS.md`](./PROJECT_STATUS.md), alcance completo en [`PROJECT_PLAN.md`](./PROJECT_PLAN.md), reglas de desarrollo en [`AGENTS.md`](./AGENTS.md).

## Inicio rápido

```bash
docker compose up -d
cd apps/backend && bun install
bun run db:migrate -- --name init
bun run db:seed
bun run dev                       # backend en :4000
```

En otra terminal:

```bash
cd apps/frontend && bun install && bun run dev    # frontend en :3000
```

Cliente Moodle (opcional): `apps/backend/scripts/setup_moodle.sh`.

Reglas y convenciones: ver `AGENTS.md`.
