# Nisky

Organiza tus días, tus tareas, tus hábitos y tus notas desde un solo lugar.

Nisky reúne en un solo lugar todo lo que necesitas para organizar tu día a día. Planifica tu semana, gestiona tus tareas, crea hábitos, toma notas, escribe en tu diario y mantén el foco cuando más lo necesites.

## Lo que puedes hacer

* **Tareas:** organiza tu semana con un tablero de arrastrar y soltar, además de una lista para todo lo que aún no tiene fecha.
* **Hábitos:** registra tus hábitos diarios y sigue tus rachas de forma sencilla.
* **Capturas rápidas:** guarda cualquier idea, pendiente o recordatorio en segundos. Más tarde puedes revisarlo y, si lo deseas, convertirlo en una tarea.
* **Pomodoro:** concéntrate en una tarea con el modo de enfoque y consulta tu historial y estadísticas.
* **Diario y notas:** escribe en un diario cifrado en el servidor y guarda tus apuntes en una base de conocimiento organizada.
* **Recordatorios:** recibe avisos dentro de la aplicación y notificaciones push, con opciones para repetir o posponer.
* **Moodle:** conecta tu cuenta para importar las tareas de tu aula virtual. Se integran como tareas nativas de Nisky para que puedas planificar tu semana sin cambiar de aplicación.

## Próximamente

* **Módulos personalizables:** activa únicamente las funciones que necesites para que la aplicación se adapte a tu forma de trabajar.
* **Gestión de clientes:** un espacio pensado para freelancers donde podrás administrar clientes, proyectos, mantenimientos, pagos pendientes y generar facturas.
* **Finanzas:** lleva un control claro de tus ingresos, gastos y cuentas desde un solo lugar.

## Stack

**Backend**

* Bun
* Express 5
* Prisma 7
* PostgreSQL

**Frontend**

* Next.js 16 (App Router)
* React 19
* Tailwind CSS 4
* shadcn/ui

**Infraestructura**

* Docker Compose
* PostgreSQL
* MinIO

## Estado del proyecto

La primera fase, centrada en la gestión diaria, ya está completada.

El progreso de cada iteración se encuentra en `PROJECT_STATUS.md`, el alcance completo del proyecto en `PROJECT_PLAN.md` y las reglas de desarrollo en `AGENTS.md`.

## Inicio rápido

Levanta los servicios necesarios:

```bash
docker compose up -d

cd apps/backend
bun install
bun run db:migrate -- --name init
bun run db:seed
bun run dev
```

El backend estará disponible en `http://localhost:4000`.

En otra terminal, inicia el frontend:

```bash
cd apps/frontend
bun install
bun run dev
```

El frontend estará disponible en `http://localhost:3000`.

Para conocer las convenciones y reglas del proyecto, consulta `AGENTS.md`.
