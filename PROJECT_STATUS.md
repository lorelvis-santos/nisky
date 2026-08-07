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
- [x] Cursor de arrastre visible en tareas de planificación y backlog
- [x] Modelo y API persistente de hábitos con entradas diarias y rachas
- [x] Registro de hábitos conectado al dashboard y manager de hábitos
- [x] Listado y restauración de hábitos archivados
- [x] Modelo y API de capturas rápidas con bandeja INBOX/ARCHIVED
- [x] Guardado explícito de capturas rápidas y acciones de archivar, eliminar y convertir
- [x] Manager de capturas archivadas con restauración a la bandeja INBOX
- [x] Detección de fechas en español con Chrono al convertir capturas en tareas
- [x] Migraciones Prisma de hábitos y capturas rápidas

## Fase 1: Gestión diaria - Iteración 3

- [x] Modelo persistente de sesiones y configuración Pomodoro
- [x] Timer full-screen en modo enfoque sin shell de navegación
- [x] Inicio, pausa, reanudación, detención y finalización
- [x] Auto-ciclo configurable y sonido al completar
- [x] Historial reciente y estadísticas de Pomodoro
- [x] Estimado y contador de Pomodoros vinculados a tareas
- [x] Botón desde tarea para abrir Pomodoro con tarea preseleccionada
- [x] Progreso de subtareas `completadas/total` en tareas y dashboard
- [x] Migración, typecheck, lint, build y smoke test de integración

## Fase 1: Gestión diaria - Iteración 4: Diario cifrado y base de conocimiento

- [x] Modelo `JournalEntry` con cifrado AES-GCM en servidor (`contentCipher`, `iv`, `authTag`)
- [x] CRUD de entradas de diario con título, clasificación y etiquetas
- [x] Editor con toggle de preview Markdown
- [x] Modelo `Note` de base de conocimiento con categoría, etiquetas y notas fijadas
- [x] Página de conocimiento con tarjetas, editor y manejo de texto largo
- [x] Migración Prisma, typecheck, lint, build y verificación de cifrado

## Fase 1: Gestión diaria - Iteración 5: Notificaciones y recordatorios

- [x] PWA instalable: manifest completo, apple touch icon y service worker en dev
- [x] Suscripciones push persistidas (`PushSubscription`) con VAPID y notificación nativa
- [x] Configuración de push en pestaña de ajustes
- [x] Modelo `Reminder` con zona horaria y repetición diaria, semanal y mensual
- [x] Recordatorios disparados quedan pendientes en la app hasta resolverse
- [x] Snooze y resolución de recordatorios
- [x] Página de recordatorios y filas de notificación responsive
- [x] Migración, typecheck, lint, build y verificación PWA

## Fase 1: Gestión diaria - Iteración 6: Integración Moodle

- [x] Modelo `MoodleAccount` con token cifrado (AES-GCM), dominio, estado y `lastSyncAt`/`syncError`
- [x] Cliente Python portable con venv local (`scripts/setup_moodle.sh` + `curl_cffi`)
- [x] Tareas de Moodle como tareas reales: `Task.source` (`MANUAL`/`MOODLE`) y `sourceRef` único por usuario
- [x] Fechas de Moodle normalizadas con zona horaria y archivado de tareas remotas
- [x] Sync manual por cuenta y API `/api/v1/moodle`
- [x] Migraciones de producción ordenadas (drop de `MoodleTask` tras `add_moodle`)
- [x] Typecheck, lint, build y verificación de integración

## Fase 1: Gestión diaria - Mejoras de producto

- [x] Separación de dashboard MI DIA (hoy) y planificación (semana)
- [x] Vista semana/lista con preferencia persistida y semana scrolleada al día actual
- [x] Drag & drop con dnd-kit: mango, reorden persistente, movimiento entre días y backlog, colisión por puntero y ghost a tamaño real
- [x] Pomodoro: flujo de focus simplificado, atajo en tarjeta de tarea y sesión activa en navbar
- [x] Gestión de usuarios por admin y signup público configurable en runtime
- [x] `/health`, Dockerfiles de producción y proxy API con `BACKEND_INTERNAL_URL`
- [x] Mejoras de auth/UI: toggles de contraseña, confirmación al registrarse y limpieza de cache al logout

## Próxima iteración

CRM, módulo comercial y financiero, y soporte.
