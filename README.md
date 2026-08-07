# Nisky

Tu espacio para organizar el día, tareas, hábitos y notas.

Nisky te ayuda a planificar la semana, capturar ideas al vuelo, mantener buenos hábitos, concentrarte con Pomodoro, escribir en tu diario privado y tener todo el conocimiento que construyes a un clic.

## Lo que incluye

- **Tareas**: planificación semanal con arrastrar y soltar, y una lista de pendientes para lo que aún no tiene fecha.
- **Hábitos**: registra tus rachas diarias sin complicarte.
- **Capturas rápidas**: anota imprevistos al instante y conviértelos en tarea con fecha detectada automáticamente.
- **Pomodoro**: modo enfoque para concentrarte en una tarea, con historial y estadísticas.
- **Diario y notas**: un diario que se cifra en el servidor y una base de conocimiento con tus notas organizadas.
- **Recordatorios**: avisos dentro de la app y notificaciones push, con repetición y posponer.
- **Moodle**: conecta tu cuenta y trae tus tareas del aula a la misma lista.

## Próximamente

- **Módulos a tu medida**: activa o desactiva los módulos que necesitas desde tu cuenta — la app se adapta a cada quien, no al revés.
- **Gestión de clientes**: pensada para freelancers — tus clientes, los proyectos en curso, los pagos pendientes, el seguimiento de mantenimientos y la generación de facturas.
- **Finanzas**: un vistazo claro de tus cuentas, ingresos y gastos. Si usas SURE, puedes conectarlo igual que Moodle (con un dominio y una API key) para traer tu estado financiero; sin conectarlo, el módulo funciona por sí solo.

## Stack

- **Backend**: Bun + Express 5 + Prisma 7 + PostgreSQL.
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + shadcn/ui.
- **Infra**: Docker Compose (Postgres + MinIO).

## Estado

Fase 1 (gestión diaria) completada. Detalle por iteración en [`PROJECT_STATUS.md`](./PROJECT_STATUS.md), alcance completo en [`PROJECT_PLAN.md`](./PROJECT_PLAN.md), reglas de desarrollo en [`AGENTS.md`](./AGENTS.md).

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
