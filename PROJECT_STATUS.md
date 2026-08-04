# Nisky - Estado del proyecto

## Fase 0: Fundación + autenticación

- [x] Documentación y configuración raíz
- [x] Infraestructura local PostgreSQL + MinIO
- [x] Backend modular Express + Prisma
- [x] Usuario multirol y aislamiento preparado
- [x] Login, registro, refresh rotation, logout y `/me`
- [x] Frontend Next.js con route guard
- [x] Steel Monolith aplicado
- [x] Verificación de API, migraciones, typecheck y build

## Fase 1: Gestión diaria - Iteración 1

- [x] Shell responsive centralizado con sidebar drawer móvil y TopAppBar
- [x] Navegación en inglés con UI en español
- [x] Modelo multiusuario de tareas y subtareas
- [x] CRUD de tareas con estados, prioridades y fechas
- [x] CRUD de subtareas con aislamiento por usuario
- [x] Planificación semanal responsive y backlog ordenado por prioridad
- [x] Modal de creación/edición y actualización inline de estado
- [x] Placeholders navegables para enfoque, diario, conocimiento y soporte
- [x] Migración Prisma, typecheck, lint, build y smoke test de API

## Fase 1: Gestión diaria - Iteración 2

- [x] Selector de estado completo en el modal de tareas
- [x] Eliminación de tareas con confirmación inline
- [x] Indicadores de tareas vencidas en planificación y dashboard
- [x] Reordenamiento manual persistente dentro de cada columna semanal
- [x] Modelo y API persistente de hábitos con entradas diarias y rachas
- [x] Registro de hábitos conectado al dashboard y manager de hábitos
- [x] Modelo y API de capturas rápidas con bandeja INBOX/ARCHIVED
- [x] Guardado explícito de capturas rápidas y acciones de archivar, eliminar y convertir
- [x] Detección de fechas en español con Chrono al convertir capturas en tareas
- [x] Migraciones Prisma de hábitos y capturas rápidas

## Próxima iteración

Temporizador Pomodoro con historial persistente y relación opcional con tareas, seguido por diario cifrado y base de conocimiento.
