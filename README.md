# Nisky

Nisky es una plataforma multiusuario para gestión operativa, comercial y financiera, con enfoque en la gestión diaria: tareas, hábitos, capturas rápidas, pomodoro y toma de notas.

## Fase actual

**Fase 1: Gestión diaria** — planificación semanal de tareas con drag & drop, subtareas, hábitos con rachas, capturas rápidas (inbox), temporizador Pomodoro y modo enfoque. Sobre la fundación de la Fase 0 (auth multiusuario, infraestructura y shell responsive).

## Estructura

- `apps/backend`: API REST modular con Express, Bun, Prisma 7 y PostgreSQL. Módulos: auth, tasks, habits, quicknotes, pomodoro, reminders, journal, moodle, push y más.
- `apps/frontend`: panel web con Next.js App Router, React 19, Tailwind CSS 4 y shadcn/ui. Sistema visual Steel Monolith.
- `docs`: PRD, sistema visual y mockups funcionales.
- `PROJECT_PLAN.md`: alcance del proyecto. `PROJECT_STATUS.md`: estado por iteración.

## Inicio rápido

1. Copia `apps/backend/.env.example` a `apps/backend/.env`.
2. Copia `apps/frontend/.env.example` a `apps/frontend/.env.local`.
3. Ejecuta `docker compose up -d` (PostgreSQL y MinIO).
4. Instala dependencias: `cd apps/backend && bun install` y `cd apps/frontend && bun install`.
5. Migra y siembra la base: `cd apps/backend && bun run db:migrate -- --name init && bun run db:seed`.
6. Arranca el backend (`bun run dev` en `apps/backend`) y el frontend (`bun run dev` en `apps/frontend`).

El cliente Moodle usa un venv Python local al repo (`scripts/setup_moodle.sh`), resoluble automáticamente por el backend.

## Notas de arquitectura

- Cada módulo del backend vive en `src/modules/<modulo>/` separando `routes`, `controller`, `service` y `validator`.
- Acceso con JWT en memoria; refresh en cookie `httpOnly` con rotación; todo dato de negocio aislado por `userId`.
- La planificación semanal usa dnd-kit: arrastre por mango, reorden persistente por columna y movimiento entre días y backlog.
