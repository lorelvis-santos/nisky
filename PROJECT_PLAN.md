# Nisky - Plan de implementación

## 1. Objetivo y alcance

Nisky es una plataforma multiusuario para gestión operativa, comercial y financiera. El repositorio es un monorepo con:

- `apps/backend`: Bun 1.3, Express 5, TypeScript estricto, Prisma 7 y PostgreSQL.
- `apps/frontend`: Next.js 16 App Router, React 19, React Query, Tailwind CSS 4 y shadcn/ui.

La implementación actual se concentra en la Fase 1, Gestión diaria. Esta fase debe permitir:

1. Capturar tareas y asignarlas a bloques de tiempo cuando se necesite.
2. Registrar hábitos diarios de forma persistente.
3. Capturar imprevistos en una bandeja de entrada sin obligar a clasificarlos inmediatamente.
4. Convertir una captura en tarea, sugiriendo automáticamente una fecha detectada en español.

Fase 1 completada incluye además: Pomodoro (Iteración 3), diario cifrado y base de conocimiento (Iteración 4), notificaciones push y recordatorios (Iteración 5) e integración con Moodle (Iteración 6). No se implementan todavía CRM, módulo comercial/financiero ni soporte.

## 2. Reglas no negociables

- Todo dato de negocio debe filtrarse por el `userId` autenticado en backend.
- Nunca confiar en un `userId` enviado por el cliente.
- Las fechas que representan un día calendario se guardan a las 12:00 UTC, como ya se hace con `Task.dueDate`, para evitar desplazamientos por zona horaria.
- La interfaz se escribe en español; rutas, nombres de código y API en inglés.
- Mantener Serene Cadence: superficies claras azuladas, radios suaves, sombras sutiles, Plus Jakarta Sans para estructura e Inter para densidad.
- Usar `proxy.ts`; no crear `middleware.ts`.
- Usar Zod 4 con `z.email(...)` cuando aplique.
- No usar `localStorage` ni `sessionStorage` para tokens.
- Seguir la separación backend `validator -> service -> controller -> routes`.
- Seguir la separación frontend `api -> hooks -> components`.
- Usar `apply_patch` para ediciones manuales.
- No eliminar ni revertir cambios ajenos.

## 3. Estado base guardado

El estado previo se guardó en el commit:

```text
fca055f feat: add daily task planning experience
```

Incluye Fase 0, shell responsive, módulo inicial de tareas, subtareas, planificación semanal, backlog, filtros, dashboard y páginas placeholder.

## 4. Estado actual de tareas

Ya existe:

- `Task` y `Subtask` con aislamiento por `userId`.
- Estados `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- Prioridades `LOW`, `NORMAL`, `HIGH`, `URGENT`.
- CRUD de tareas y subtareas.
- Fecha límite con normalización a mediodía UTC.
- Agenda con bloques de tiempo para asignaciones concretas.
- Búsqueda, filtro por prioridad y orden por prioridad.
- Modal controlado por `?taskId=` y `?modal=create`.

La gestión global usa listas y filtros; la asignación de tiempo se realiza desde Agenda.

## 5. Iteración 2a: completar tareas

### 5.1 Selector de estado

Archivos:

- `apps/frontend/src/features/tasks/schemas/task.schema.ts`
- `apps/frontend/src/features/tasks/components/TaskModal.tsx`
- `apps/frontend/src/app/(app)/tasks/page.tsx`

Implementación:

1. Añadir `status` al schema frontend como enum opcional de los cuatro estados.
2. Añadir `status` al tipo `TaskForm`.
3. Para tareas nuevas usar `PENDING`.
4. Para edición inicializar con `task.status`.
5. Mostrar un select `ESTADO` con etiquetas `Pendiente`, `En progreso`, `Completada` y `Cancelada`.
6. Enviar el valor en create/update.
7. Mantener la regla backend existente: `completedAt` se asigna al pasar a `COMPLETED` y se limpia al cambiar a otro estado.

### 5.2 Eliminar tarea

Archivos:

- `apps/frontend/src/features/tasks/components/TaskModal.tsx`
- `apps/frontend/src/app/(app)/tasks/page.tsx`

Implementación:

1. Recibir `onDelete?: () => Promise<void>` en `TaskModal`.
2. Mostrar el botón solo al editar una tarea.
3. Primer clic cambia el botón a una confirmación inline `¿Eliminar tarea?`.
4. Segundo clic ejecuta `useTaskMutations().remove`.
5. En éxito cerrar la URL del modal y mostrar `Tarea eliminada`.
6. En error conservar el modal abierto y mostrar toast de error.
7. No usar `window.confirm`, porque el diseño usa confirmación inline.

### 5.3 Indicador de tareas vencidas

Archivos:

- `apps/frontend/src/features/tasks/components/TaskCard.tsx`
- `apps/frontend/src/app/(app)/page.tsx`

Regla única:

```text
overdue = dueDate existe && fecha calendario dueDate < fecha calendario de hoy
          && status no es COMPLETED && status no es CANCELLED
```

Implementación:

1. Comparar fechas calendario localmente, no timestamps UTC.
2. En `TaskCard`, añadir borde izquierdo `border-l-2 border-l-error`.
3. Mostrar `Vencida` en texto rojo junto a los metadatos.
4. En dashboard mostrar `Vencida: ayer` o la fecha relativa correspondiente.
5. No marcar como vencidas tareas completadas o canceladas.
6. Los elementos del backlog no tienen `dueDate`, por lo que no requieren indicador.

### 5.4 Reordenamiento manual dentro de cada día

El campo `Task.order` se usará para el orden vertical dentro de una misma columna. Mover una tarea a otro día conserva la operación existente de cambiar `dueDate`; el orden se recalcula en la columna de destino.

#### Backend

Archivos:

- `apps/backend/src/modules/tasks/tasks.validator.ts`
- `apps/backend/src/modules/tasks/tasks.service.ts`
- `apps/backend/src/modules/tasks/tasks.controller.ts`
- `apps/backend/src/modules/tasks/tasks.routes.ts`

Contrato:

```http
PATCH /api/v1/tasks/reorder
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "items": [
    { "id": "uuid", "order": 0 },
    { "id": "uuid", "order": 1 }
  ]
}
```

Reglas:

1. `items` debe tener al menos un elemento.
2. Cada `id` debe ser UUID y `order` entero mayor o igual a cero.
3. El servicio debe comprobar que todos los IDs pertenecen al `userId` autenticado.
4. Si algún ID no pertenece al usuario, responder `NOT_FOUND` sin modificar datos.
5. Actualizar todos los elementos en una transacción Prisma.
6. El endpoint debe declararse antes de `/:id`.
7. `list()` debe ordenar por `priority`, luego `order`, luego `createdAt`. Para consultas de `dueDate`, usar `dueDate`, luego `order`.

#### Frontend

Archivos:

- `apps/frontend/src/features/tasks/api/tasks.ts`
- `apps/frontend/src/features/tasks/hooks/useTasks.ts`
- `apps/frontend/src/features/tasks/components/TaskCard.tsx`
- `apps/frontend/src/features/tasks/components/WeeklyGrid.tsx`
- `apps/frontend/src/app/(app)/tasks/page.tsx`

Implementación:

1. Añadir `reorderTasks(items)` al API client.
2. Añadir mutation `reorder` y invalidar `tasks` y `task` después de éxito.
3. Mantener `dayOrder: Record<string, string[]>` local en `TasksPage`.
4. Inicializar el orden de cada día desde `task.order`; usar el orden recibido del backend como fuente inicial.
5. No reconstruir `dayOrder` en cada render. Solo sincronizar cuando cambie la colección de tareas o la semana, preservando el orden optimista durante una mutation pendiente.
6. Cada `TaskCard` debe ser drop target vertical y mostrar una línea superior cuando sea destino.
7. Al soltar sobre otra tarea, mover el ID arrastrado a la posición destino.
8. Enviar todos los `{ id, order }` de la columna afectada.
9. Si falla la API, restaurar el orden previo y mostrar `No se pudo guardar el orden`.
10. Al mover entre días, actualizar `dueDate` y asignar el nuevo orden al final de la columna destino.
11. Mantener soporte de soltar en backlog para limpiar `dueDate`; el backlog se ordena por el orden automático actual.
12. Evitar que hacer clic en checkbox, botones o enlaces active drag involuntariamente.

## 6. Iteración 2b: registro persistente de hábitos

### 6.1 Modelo Prisma

Archivo: `apps/backend/src/infra/prisma/schema.prisma`

Añadir en `User`:

```prisma
habits       Habit[]
habitEntries HabitEntry[]
quickNotes   QuickNote[]
```

Añadir:

```prisma
enum HabitFrequency {
  DAILY
  WEEKLY
}

model Habit {
  id          String         @id @default(uuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  color       String?
  frequency   HabitFrequency @default(DAILY)
  targetDays  Int            @default(7)
  archived    Boolean        @default(false)
  entries     HabitEntry[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([userId, archived])
}

model HabitEntry {
  id        String   @id @default(uuid())
  habitId   String
  habit     Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date      DateTime
  completed Boolean  @default(true)
  createdAt DateTime @default(now())

  @@unique([habitId, date])
  @@index([userId, date])
  @@index([habitId, date])
}
```

Reglas:

1. `DAILY` significa que la racha cuenta días consecutivos.
2. `WEEKLY` conserva `targetDays` para la evolución posterior; la primera UI solo debe permitir y mostrar hábitos diarios.
3. Archivar oculta el hábito del dashboard sin borrar sus entradas.
4. El manager debe poder listar hábitos archivados y restaurarlos con `archived: false`.
5. Eliminar borra el hábito y sus entradas por cascade.
6. Una fecha de entrada es una fecha calendario normalizada a `T12:00:00.000Z`.

Ejecutar:

```bash
cd apps/backend
bun run db:migrate -- --name add_habits
bun run db:generate
```

### 6.2 Backend de hábitos

Crear `apps/backend/src/modules/habits/` con:

- `habits.validator.ts`
- `habits.service.ts`
- `habits.controller.ts`
- `habits.routes.ts`

Endpoints autenticados, montados en `/api/v1/habits`:

| Método | Ruta | Resultado |
|---|---|---|
| `GET` | `/` | Hábitos no archivados del usuario con `todayCompleted` y `streak`. |
| `POST` | `/` | Crea hábito. Body: `name`, `color?`, `frequency?`, `targetDays?`. |
| `GET` | `/:id` | Hábito propio y sus entradas recientes. |
| `PATCH` | `/:id` | Actualiza nombre, color, frecuencia, target o archived. |
| `DELETE` | `/:id` | Elimina el hábito propio. |
| `POST` | `/:id/entries` | Hace toggle de la entrada de una fecha. Body: `date`, `completed?`. |
| `GET` | `/:id/entries?from=&to=` | Devuelve entradas propias en rango opcional. |
| `GET` | `/:id/streak` | Devuelve `{ streak: number }`. |

Validación:

1. Nombre requerido, trim, 1-100 caracteres.
2. Color opcional, máximo 20 caracteres.
3. `frequency` solo `DAILY` o `WEEKLY`.
4. `targetDays` entero de 1 a 7.
5. Fechas válidas y normalizadas.
6. `from <= to` cuando ambas existan.

Servicio:

1. `list(userId)` devuelve solo `archived: false`, ordenado por `createdAt asc`.
2. Para cada hábito calcular `todayCompleted` y `streak` en el servidor, para que el dashboard no haga una petición por hábito.
3. `toggleEntry` debe ser idempotente por combinación `habitId + date`.
4. Si existe entrada completada y se solicita toggle sin `completed: false`, eliminarla y devolver `completed: false`.
5. Si no existe, crearla como completada y devolver `completed: true`.
6. `streak` cuenta desde hoy; si hoy no está completado, permite que la última entrada sea ayer; si la última entrada es anterior, devuelve cero.
7. Todas las lecturas y mutaciones deben verificar simultáneamente `userId` y `habitId`.

Montar en `apps/backend/src/routes/index.ts`:

```typescript
router.use("/habits", habitRoutes);
```

### 6.3 Frontend de hábitos

Crear `apps/frontend/src/features/habits/` con:

- `api/habits.ts`
- `hooks/useHabits.ts`
- `components/HabitRow.tsx`
- `components/HabitManager.tsx`

Añadir tipos en `apps/frontend/src/types/entities.ts`:

```typescript
type HabitFrequency = "DAILY" | "WEEKLY";

interface Habit {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  frequency: HabitFrequency;
  targetDays: number;
  archived: boolean;
  todayCompleted: boolean;
  streak: number;
  createdAt: string;
  updatedAt: string;
}

interface HabitEntry {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  completed: boolean;
  createdAt: string;
}
```

Hooks:

1. `useHabitsQuery()` usa query key `['habits']`.
2. `useHabitMutations()` expone `create`, `update`, `remove`, `toggleEntry`.
3. Después de cualquier mutation invalidar `['habits']` y `['habit-entries']`.
4. El toggle puede actualizarse de forma optimista, pero debe revertir si falla.

Dashboard:

1. Eliminar `habitItems` hardcoded y `useState<Record<string, boolean>>`.
2. Mostrar estados loading, error y vacío.
3. `HabitRow` muestra checkbox, nombre y racha como `Racha: N días` cuando `streak > 0`.
4. Al marcar, enviar la fecha local `YYYY-MM-DD`, no `toISOString().slice(0, 10)` si eso cambia el día por zona horaria.
5. Añadir botón `Editar hábitos`.
6. `HabitManager` permite crear, renombrar, archivar y eliminar hábitos con confirmación inline.
7. La primera versión del manager trabaja con `DAILY`; puede mostrar frecuencia semanal deshabilitada con texto `Disponible próximamente` si no se implementa su UI.

## 7. Iteración 2c: captura rápida como bandeja de entrada

### 7.1 Decisión de producto

La captura rápida no es una tarea ni una entrada de diario. Es una bandeja de entrada mental para registrar cosas como:

- `Le debo 200 pesos a Juan.`
- `Debo pasar por aquí el viernes.`

La nota queda pendiente hasta que el usuario la revise. No se sobrescribe el historial y no se obliga a clasificar al momento.

### 7.2 Modelo Prisma

Archivo: `apps/backend/src/infra/prisma/schema.prisma`

```prisma
enum QuickNoteStatus {
  INBOX
  ARCHIVED
}

model QuickNote {
  id        String          @id @default(uuid())
  userId    String
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  content   String
  status    QuickNoteStatus @default(INBOX)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  @@index([userId, status])
  @@index([userId, createdAt])
}
```

Ejecutar:

```bash
cd apps/backend
bun run db:migrate -- --name add_quick_notes
bun run db:generate
```

### 7.3 Backend de quick notes

Crear `apps/backend/src/modules/quicknotes/` con:

- `quicknotes.validator.ts`
- `quicknotes.service.ts`
- `quicknotes.controller.ts`
- `quicknotes.routes.ts`

Endpoints autenticados, montados en `/api/v1/quick-notes`:

| Método | Ruta | Resultado |
|---|---|---|
| `GET` | `/?status=INBOX&limit=8` | Notas propias, más recientes primero. |
| `POST` | `/` | Crea nota INBOX. Body: `{ content }`. |
| `PATCH` | `/:id` | Cambia contenido o status. |
| `DELETE` | `/:id` | Elimina nota propia. |

Validación:

1. `content` trim, requerido, 1-2000 caracteres.
2. `status` solo `INBOX` o `ARCHIVED`.
3. `limit` entero entre 1 y 50, default 8.
4. Cada operación verifica `id + userId`.

### 7.4 Dependencia y detección de fechas

Instalar en frontend:

```bash
cd apps/frontend
bun add chrono-node
```

Crear `apps/frontend/src/features/quicknotes/utils/detectDate.ts`.

Contrato:

```typescript
interface DetectedDate {
  date: Date;
  isoDate: string;
  matchedText: string;
  label: string;
}

function detectDate(text: string): DetectedDate | null;
```

Reglas:

1. Usar el locale español de Chrono.
2. Usar fecha actual como referencia.
3. Usar `forwardDate: true` para días de semana y fechas ambiguas.
4. Tomar la primera coincidencia.
5. Si no hay coincidencia devolver `null`.
6. `isoDate` debe formarse con getters locales `YYYY-MM-DD`.
7. Mostrar `matchedText` y `label` al usuario antes de convertir.
8. No modificar automáticamente el texto original de la nota.
9. Frases vagas como `pronto` no generan fecha.
10. La fecha detectada es una sugerencia editable, nunca una obligación.

Ejemplos mínimos que deben funcionar:

| Texto | Resultado |
|---|---|
| `mañana` | día siguiente |
| `pasado mañana` | dos días después |
| `el viernes` | próximo viernes |
| `15 de agosto` | 15 de agosto próximo según Chrono |
| `Le debo 200 pesos a Juan` | sin fecha |

### 7.5 Frontend de captura rápida

Crear `apps/frontend/src/features/quicknotes/` con:

- `api/quicknotes.ts`
- `hooks/useQuickNotes.ts`
- `utils/detectDate.ts`
- `components/QuickCapture.tsx`
- `components/QuickNoteItem.tsx`
- `components/QuickNoteManager.tsx`

Añadir tipos:

```typescript
type QuickNoteStatus = "INBOX" | "ARCHIVED";

interface QuickNote {
  id: string;
  userId: string;
  content: string;
  status: QuickNoteStatus;
  createdAt: string;
  updatedAt: string;
}
```

`QuickCapture`:

1. Sustituir el textarea local actual.
2. Escribir en un draft local.
3. Guardar únicamente cuando el usuario pulsa `Guardar captura`.
4. `Ctrl+Enter` y `Cmd+Enter` guardan inmediatamente como atajo equivalente.
5. No guardar drafts vacíos.
6. Después de guardar limpiar textarea y mostrar `Guardado`.
7. Mientras guarda mostrar `Guardando...` y deshabilitar el botón.
8. Una pausa mientras el usuario lee o corrige el texto no debe crear ninguna nota.
9. Mostrar las últimas 8 notas INBOX debajo del textarea.
10. Mostrar contador de caracteres cuando no está guardando.
11. Mostrar la fecha sugerida del draft si existe.

`QuickNoteItem`:

1. Mostrar contenido y fecha de creación relativa.
2. Mostrar badge `Fecha detectada: ...` si aplica.
3. Acción `Convertir en tarea`.
4. Acción `Archivar` cambia status a `ARCHIVED`.
5. Acción `Eliminar` usa confirmación inline y luego DELETE.
6. Cada mutation invalida `['quick-notes']`.

### 7.6 Convertir captura en tarea

La ruta canónica del modal de tareas debe conservarse. No duplicar `TaskModal` en dashboard.

Flujo:

1. Al pulsar `Convertir en tarea`, navegar a `/tasks?modal=create`.
2. Pasar el contenido y la fecha sugerida mediante un parámetro URL codificado de forma segura con `encodeURIComponent(JSON.stringify(...))`.
3. No usar `btoa`, `unescape` ni `escape` para transportar texto Unicode.
4. `TasksPage` parsea el parámetro con `JSON.parse(decodeURIComponent(...))` dentro de una función segura; si es inválido, ignorarlo y abrir formulario vacío.
5. `TaskModal` recibe `initialForm?: Partial<TaskForm>` y lo usa únicamente al crear.
6. El título inicial es el contenido completo de la nota.
7. La descripción inicial queda vacía.
8. La prioridad inicial es `NORMAL`.
9. El estado inicial es `PENDING`.
10. `dueDate` se prellena con `DetectedDate.isoDate` si existe.
11. Mostrar la fecha como editable en el modal.
12. Solo archivar la nota después de crear exitosamente la tarea, nunca al abrir el modal.
13. Para vincular la nota pendiente, incluir `quickNoteId` en el payload de navegación, no en el modelo Task.
14. Tras crear la tarea, llamar `PATCH /quick-notes/:id` con `{ status: "ARCHIVED" }`.
15. Si crear tarea funciona pero archivar falla, conservar la tarea y mostrar una advertencia; no borrar la tarea.
16. Si el usuario cancela el modal, la nota permanece INBOX.

## 8. Archivos esperados

Nuevos backend:

- `apps/backend/src/modules/habits/habits.validator.ts`
- `apps/backend/src/modules/habits/habits.service.ts`
- `apps/backend/src/modules/habits/habits.controller.ts`
- `apps/backend/src/modules/habits/habits.routes.ts`
- `apps/backend/src/modules/quicknotes/quicknotes.validator.ts`
- `apps/backend/src/modules/quicknotes/quicknotes.service.ts`
- `apps/backend/src/modules/quicknotes/quicknotes.controller.ts`
- `apps/backend/src/modules/quicknotes/quicknotes.routes.ts`

Nuevos frontend:

- `apps/frontend/src/features/habits/api/habits.ts`
- `apps/frontend/src/features/habits/hooks/useHabits.ts`
- `apps/frontend/src/features/habits/components/HabitRow.tsx`
- `apps/frontend/src/features/habits/components/HabitManager.tsx`
- `apps/frontend/src/features/quicknotes/api/quicknotes.ts`
- `apps/frontend/src/features/quicknotes/hooks/useQuickNotes.ts`
- `apps/frontend/src/features/quicknotes/utils/detectDate.ts`
- `apps/frontend/src/features/quicknotes/components/QuickCapture.tsx`
- `apps/frontend/src/features/quicknotes/components/QuickNoteItem.tsx`
- `apps/frontend/src/features/quicknotes/components/QuickNoteManager.tsx`

Modificados principales:

- `apps/backend/src/infra/prisma/schema.prisma`
- `apps/backend/src/routes/index.ts`
- `apps/backend/src/modules/tasks/tasks.validator.ts`
- `apps/backend/src/modules/tasks/tasks.service.ts`
- `apps/backend/src/modules/tasks/tasks.controller.ts`
- `apps/backend/src/modules/tasks/tasks.routes.ts`
- `apps/frontend/src/types/entities.ts`
- `apps/frontend/src/features/tasks/schemas/task.schema.ts`
- `apps/frontend/src/features/tasks/api/tasks.ts`
- `apps/frontend/src/features/tasks/hooks/useTasks.ts`
- `apps/frontend/src/features/tasks/components/TaskModal.tsx`
- `apps/frontend/src/features/tasks/components/TaskCard.tsx`
- `apps/frontend/src/features/tasks/components/WeeklyGrid.tsx`
- `apps/frontend/src/app/(app)/tasks/page.tsx`
- `apps/frontend/src/app/(app)/page.tsx`
- `apps/frontend/package.json` y lockfile de Bun

## 9. Verificación obligatoria

Después de cada iteración:

```bash
cd apps/backend
bun run typecheck
```

```bash
cd apps/frontend
bun run lint
bun run build
```

### Smoke test de tareas

1. Crear tarea nueva.
2. Editar y persistir cada estado.
3. Eliminar con confirmación y comprobar que desaparece.
4. Crear subtarea, completarla y eliminarla.
5. Mover tarea entre días y backlog.
6. Reordenar dos tareas en una misma columna.
7. Recargar y comprobar que el orden persiste.
8. Crear tarea vencida y comprobar indicador.
9. Comprobar que completada/cancelada no aparece como vencida.
10. Intentar acceder por API a un ID de otro usuario y comprobar `404`.

### Smoke test de hábitos

1. Crear hábito desde dashboard.
2. Marcar hoy.
3. Recargar y comprobar que sigue marcado.
4. Desmarcar hoy.
5. Comprobar racha actual.
6. Archivar y comprobar que desaparece del dashboard.
7. Eliminar y comprobar cascade de entradas.
8. Verificar aislamiento entre usuarios.

### Smoke test de captura rápida

1. Escribir una nota sin fecha y esperar 1.5 s.
2. Recargar y comprobar persistencia.
3. Escribir `Debo pasar por aquí el viernes`.
4. Comprobar badge de fecha detectada.
5. Convertir a tarea y comprobar título y fecha prellenados.
6. Cancelar conversión y verificar que la nota sigue INBOX.
7. Crear la tarea, comprobar que la nota se archiva.
8. Archivar y eliminar notas manualmente.
9. Probar texto Unicode y caracteres especiales en la navegación.
10. Verificar que una nota de un usuario no aparece para otro.

## 10. Orden de ejecución

1. Actualizar este documento y guardar checkpoint.
2. Aplicar 2a: tareas.
3. Ejecutar typecheck, lint y build.
4. Crear migración y aplicar 2b: hábitos.
5. Ejecutar typecheck, lint y build.
6. Crear migración, instalar Chrono y aplicar 2c: captura rápida.
7. Ejecutar migraciones, typecheck, lint, build y smoke tests.
8. Actualizar `PROJECT_STATUS.md` con resultados reales.

## 11. Fuera de alcance de esta entrega

- Detección automática de importes, personas o categorías.
- Conversión automática de una captura en deuda, evento o recordatorio especializado.
- CRM, módulo comercial y financiero.
- Reglas semánticas complejas para fechas ambiguas; Chrono solo genera sugerencias editables.

## 12. Iteración 3 implementada: Pomodoro

La Iteración 3 implementa el modo enfoque y su integración con tareas.

### Backend

- Modelos `PomodoroSession` y `PomodoroSettings` persistentes y scoped por `userId`.
- Estados `ACTIVE`, `PAUSED`, `COMPLETED` y `CANCELLED`.
- Fases `WORK`, `SHORT_BREAK` y `LONG_BREAK`.
- Settings por usuario: trabajo, descansos, ciclos, auto-ciclo y sonido.
- API en `/api/v1/pomodoro` para settings, sesiones, acciones, historial y estadísticas.
- Prevención de sesiones activas simultáneas por usuario.
- Incremento transaccional de `Task.pomodoroCount` al completar una sesión `WORK` vinculada.
- `Task.pomodoroEstimate` configurable de 0 a 100.
- Progreso de subtareas devuelto como `completedSubtasks` y `subtaskCount`.

### Frontend

- `/focus` en pantalla completa sin sidebar ni TopAppBar.
- Timer calculado desde timestamps de servidor para sobrevivir renders y pausas.
- Inicio, pausa, reanudación, detención y finalización manual.
- Auto-ciclo opcional entre trabajo y descansos.
- Selector de tarea activa con progreso de Pomodoros y subtareas.
- Configuración modal y sonido al finalizar.
- Historial reciente de sesiones.
- Botón `Pomodoro` desde el modal de tarea con preselección vía `?taskId=`.
- Indicador `Timer pomodorosHechos/pomodorosEstimados` en tarjetas, backlog y dashboard.
- Indicador `CheckSquare subtareasCompletadas/subtareasTotales` en tarjetas, backlog y dashboard.

### Migración

```bash
cd apps/backend
bun run db:migrate -- --name add_pomodoro
bun run db:generate
```

## 13. Iteración 4 implementada: Diario cifrado y base de conocimiento

### Backend

- Modelo `JournalEntry` con cifrado AES-GCM en servidor: `contentCipher` (bytes), `iv` y `authTag`; el contenido nunca se guarda en claro.
- Campos `classification` y `tags` por entrada; API en `/api/v1/journal`.
- Modelo `Note` de base de conocimiento con `title`, `content`, `category`, `tags` y `pinned`; API en `/api/v1/knowledge`.

### Frontend

- Página `/journal` con CRUD de entradas cifradas.
- Editor Markdown con toggle de preview (`254ee6b`).
- Página `/knowledge` con tarjetas, categorías, notas fijadas y manejo de texto largo.

## 14. Iteración 5 implementada: Notificaciones y recordatorios

### Backend

- `PushSubscription` persistida por usuario (endpoint, `p256dh`, `auth`) con VAPID; API en `/api/v1/push`.
- `Reminder` con `triggerAt`, `timezone` (default `America/Bogota`), repetición `DAILY`/`WEEKLY`/`MONTHLY`, `repeatDaysOfWeek`, `repeatDayOfMonth` y `payload` JSON.
- API en `/api/v1/reminders` con listado, `pending`, creación, actualización, borrado, `snooze` y `resolve`.
- Recordatorios disparados quedan pendientes in-app hasta que el usuario los resuelve (`reminder_resolved_at`).

### Frontend

- PWA instalable: manifest completo, apple touch icon y service worker registrado también en dev.
- Página `/reminders` con notificaciones pendientes, snooze y resolución.
- Ajustes de push movidos a la pestaña de configuración.

## 15. Iteración 6 implementada: Integración Moodle

### Backend

- `MoodleAccount` con `domain`, `username`, token cifrado AES-GCM (`tokenCipher`/`tokenIv`/`tokenAuthTag`), `service` `moodle_mobile_app`, `enabled`, `lastSyncAt` y `syncError`.
- Cliente Moodle primario con `wreq-js` y fallback Python portable con venv local al repo (`scripts/setup_moodle.sh`, instala `curl_cffi`); el fallback se puede sobreescribir con `MOODLE_PYTHON_BIN` / `MOODLE_PYTHON_SCRIPT`.
- Tareas de Moodle como tareas reales: `Task.source` (`MANUAL`/`MOODLE`), `sourceRef`, unicidad `[userId, source, sourceRef]`, fechas normalizadas con zona horaria y archivado.
- API en `/api/v1/moodle` para conectar, listar, sincronizar, habilitar/deshabilitar y desconectar cuentas; `/api/v1/moodle/tasks` para listar tareas remotas.

### Migraciones

```bash
cd apps/backend
bun run db:migrate -- --name add_journal_and_knowledge
bun run db:migrate -- --name tasks_source_and_archive
bun run db:migrate -- --name add_push_subscriptions_and_reminders
bun run db:migrate -- --name add_moodle
bun run db:migrate -- --name reminder_resolved_at
bun run db:generate
```

## 16. Mejoras de producto acumuladas

- Dashboard MI DIA separado de la planificación semanal; vista semana/lista con preferencia persistida y auto-scroll al día actual.
- Drag & drop de tareas con dnd-kit (mango, reorden persistente por columna, movimiento entre días y backlog, colisión por puntero y ghost a tamaño real).
- Pomodoro: flujo de focus simplificado, atajo en tarjeta de tarea y sesión activa en navbar.
- Gestión de usuarios por admin y signup público configurable en runtime (`/api/v1/admin`, tabla `Setting`).
- `/health`, Dockerfiles de producción y proxy API con `BACKEND_INTERNAL_URL`.
- Auth/UI: toggles de visibilidad de contraseña, confirmación de contraseña al registrarse y limpieza de cache de React Query al logout.

## 17. Iteración 7 implementada: Módulo de integraciones (Moodle + Canvas)

Refactor del módulo Moodle a un módulo genérico `integrations` con patrón Strategy, manteniendo los datos existentes intactos.

### Backend

- `src/modules/integrations/strategies/`: `IntegrationStrategy` con `provider`, `source`, `prefix`, `connect(data)` (probe/validación → token) y `fetchItems(domain, token, window)` → `RemoteItem[] { key, title, description, dueDate }`.
- Estrategias: `moodle.strategy.ts` usa `wreq-js` como cliente primario y conserva `moodle.python.ts`/`curl_cffi` como fallback; `canvas.strategy.ts` usa cliente Bun `fetch` directo, sin Python: `/users/self`, `/courses`, `/users/self/todo`.
- `registry.ts` mapea `MOODLE`/`CANVAS` a su estrategia; `integration.service.ts` usa un delegado tipado para cuentas `MoodleAccount`/`CanvasAccount` y comparte conectividad, limpieza, listado, `setEnabled`, listado de tareas y sincronización con dedupe por `sourceRef` y skip de completadas/canceladas.
- `TaskSource` ahora `MANUAL | MOODLE | CANVAS`; `Task.sourceRef` conserva el formato `moodle:<id>:<key>` para no romper tareas existentes; Canvas usa `canvas:<id>:<key>` con `key = <todo_type>:<courseId>:<activityId>`.
- API nueva en `/api/v1/integrations` (con `provider` en params, sin duplicar el módulo): `GET /`, `POST /:provider` (conecta), `POST /:provider/:id/sync`, `PATCH /:provider/:id`, `DELETE /:provider/:id`, `GET|DELETE /tasks?source=&status=&limit=`.
- Rutas viejas `/api/v1/moodle` eliminadas; datos de `MoodleAccount` intactos (retrocompatibilidad).
- Worker integrado `src/workers/integration.worker.ts` con cron `0 */3 * * *` sincronizando todos los proveedores.
- Migración `add_canvas_integration`: enum `TaskSource.CANVAS` y modelo `CanvasAccount` (dominio, token cifrado AES-GCM, `enabled`, `lastSyncAt`, `syncError`).

### Frontend

- Tipos `IntegrationProvider`, `IntegrationAccount` y `TaskSource` con CANVAS en `types/entities.ts`.
- `features/integrations/api/integrations.ts` con llamadas a la API y tipos de filtro.
- `components/integrations/IntegrationManager.tsx`: selector global de proveedor (`MOODLE`/`CANVAS`) en Ajustes › Integraciones; formulario condicional (Moodle: credenciales o token; Canvas: solo token), cuenta conectada con sync/desconexión, zona peligrosa y `ConfirmModal`.
- `components/integrations/IntegrationTasksList.tsx`: lista de tareas remotas con filtros próximas/atrasadas/todas y enlaces al curso; clase de actividad derivada de `sourceRef` (Moodle: `eventtype`; Canvas: `todo_type`).
- Pestaña Ajustes renombrada a `Integraciones` con estado `provider` compartido entre manager y lista; invalidation de `["tasks"]` y `["integration-tasks"]`.
- Eliminados `components/moodle/*` y el módulo backend `modules/moodle/*`.

### Verificación

- `bun run typecheck` (backend) y `bun run lint` + `bun run build` (frontend) en verde.
- Smoke test contra mock de Canvas en `:4555`: connect (201), sync (3 tareas CANVAS), token inválido (400), `PATCH enabled` (200), disconnect con cascade (3 tareas eliminadas) y sync Moodle retrocompatible (10 tareas).

## 18. Próximas iteraciones (pendientes)

### 17.1 Gestión de clientes

Módulo pensado para usuarios freelance:

- Información de clientes (datos de contacto, historia).
- Proyectos en proceso con su estado.
- Control de pagos por proyecto.
- Seguimiento a mantenimientos.
- Generación de facturas.

### 17.2 Finanzas

Dos capas, sin bloquear el módulo:

1. **Modo local (default)**: implementación abstracta y sencilla del modelo de SURE — cuentas, ingresos, gastos y balances, funcional sin configuración.
2. **Sync con SURE (opcional)**: al igual que Moodle, cada usuario conecta su dominio y API key (credencial cifrada, patrón `MoodleAccount`); si no se conecta, no se muestra ningún bloqueo del módulo.

### 17.3 Módulos activables por usuario

La app se construye en base a las necesidades propias, pero no todos los usuarios necesitan todos los módulos (ej. gestión de clientes es para freelancers). Decisión de producto: **cada usuario activa o desactiva sus módulos** en su cuenta.

- Persistencia: flag por módulo por usuario (columna JSON o tabla `UserModule`; `Setting` actual es global y no sirve para esto).
- Un módulo desactivado **no aparece en la navegación**; se eliminan los placeholders "próximamente" para quien no los necesita.
- Backend: middleware por módulo (`requireModule("clients")`) para que el flag no sea solo cosmético.
- Defaults: el propietario activa todo; un usuario nuevo arranca con el núcleo (tareas, hábitos, capturas, Pomodoro) y activa el resto desde Configuración.

## 19. Reorganización de Proyectos y Planificación

### 19.1 Decisiones de producto

El proyecto es un workspace con la misma estructura tanto para uso personal como colaborativo. La colaboración añade información compartida, chat, miembros y asignación de tareas; no crea un tipo distinto de proyecto.

Reglas acordadas:

- La descripción del proyecto es opcional.
- La fecha objetivo del proyecto es opcional.
- Estado, prioridad y milestones de proyecto quedan fuera de la primera versión.
- El proyecto abre inicialmente en `Resumen`.
- El proyecto permite crear, editar, completar, asignar y eliminar tareas sin salir de `/projects/:id`.
- La vista de tareas del proyecto será una lista; no se implementa Kanban ni drag-and-drop en la primera versión.
- Los filtros iniciales son estado, prioridad, asignado y búsqueda; la fecha límite se muestra en la lista y el orden sigue siendo server-side.
- Las tareas pueden quedar sin asignar; no se asignan automáticamente al creador.
- Todos los miembros pueden ver y administrar las tareas del proyecto.
- Las notas del proyecto son compartidas con todos sus miembros y conservan filtros, categorías, etiquetas, fijado y Markdown.
- Quick Notes, eventos, timeblocks y planificación personal no forman parte del workspace compartido.
- Los recursos compartidos se incorporan por fases: enlaces primero, archivos y documentos después.
- `/tasks` conserva todas las tareas de todos los proyectos como vista global de gestión.

### 19.2 Arquitectura de navegación

`/projects` será la vista de portafolio. Debe mostrar proyectos propios y compartidos y permitir abrir el workspace.

`/projects/:id` será el centro operativo del proyecto. Las secciones se agrupan para no convertir la navegación en siete pestañas con el mismo peso:

- Trabajo: `Resumen`, `Tareas`, `Notas`; `Recursos` vive en el menú secundario.
- Colaboración: `Actividad`, `Equipo`; `Chat` vive en el menú secundario.

La selección de sección debe ser enlazable por URL, por ejemplo `?tab=tasks`, y debe sobrevivir a recargas y enlaces compartidos.

`/tasks` será la vista global:

- `Lista`: cola global de tareas de todos los proyectos.
- `Sin fecha límite`: cola de tareas que todavía no tienen vencimiento.

La fecha límite indica cuándo vence una tarea. La Agenda reserva el tiempo de trabajo mediante bloques y permite asignarles tareas para cada ocurrencia.

### 19.3 Fase A: workspace frontend con APIs existentes (completada)

Objetivo: convertir `/projects/:id` en un workspace usable sin duplicar la gestión global de tareas. El workspace ya consume endpoints reales y mantiene los recursos fuera de las pestañas principales.

Archivos principales:

- `apps/frontend/src/app/(app)/projects/[id]/page.tsx`
- `apps/frontend/src/features/projects/hooks/useProjects.ts`
- `apps/frontend/src/features/tasks/hooks/useTasks.ts`
- `apps/frontend/src/features/tasks/components/TaskModal.tsx`
- `apps/frontend/src/features/comments/CommentThread.tsx`
- `apps/frontend/src/components/ui/TopAppBar.tsx`

Implementación:

1. Reorganizar el encabezado siguiendo `Desktop/prompt 1 reiterado`: breadcrumb, nombre, descripción cuando exista, miembros, progreso y acciones contextuales.
2. Usar `Resumen` como sección inicial.
3. Añadir navegación interna con estado URL para `Resumen`, `Tareas`, `Notas`, `Recursos`, `Chat`, `Actividad` y `Equipo`, mostrando únicamente contenido funcional en esta fase.
4. Mantener la sección actual de miembros y conversación, pero integrarla dentro de la nueva jerarquía.
5. Crear una sección `Tareas` contextual con lista del proyecto, estados, prioridad, asignado, fecha límite y acciones rápidas.
6. Crear tareas desde el proyecto con el proyecto preseleccionado, sin redirigir obligatoriamente a `/tasks`.
7. Reutilizar `TaskModal`; no crear un segundo editor de tareas.
8. Permitir acceder a la vista global de `Tareas` con el proyecto seleccionado.
9. No mostrar datos inventados de milestones ni roles personalizados; los recursos y la fecha objetivo solo se muestran cuando vienen de persistencia.
10. Adaptar la composición a desktop y móvil: tabla/lista en desktop, tarjetas y controles apilados en móvil.
11. Mantener la navegación global y el flujo de Quick Notes sin mezclarlos con el workspace.
12. Mostrar estados de carga, error, vacío y reintento en las consultas del workspace.

Criterios de aceptación:

- Entrar a un proyecto abre `Resumen`.
- El usuario puede llegar a `Tareas` mediante URL y recarga sin perder la sección.
- Crear y editar una tarea desde el proyecto no requiere cambiar de pantalla.
- Las tareas creadas quedan vinculadas al proyecto correcto.
- La lista no implementa Kanban ni drag-and-drop.
- El layout funciona en desktop y móvil sin overflow horizontal.
- Los miembros y la conversación existentes siguen funcionando.
- Los recursos y la actividad se consultan desde sus endpoints persistentes.

### 19.4 Fase B: contrato backend y permisos de proyecto (completada, salvo `IN_REVIEW`)

Objetivo: hacer que el workspace use datos completos y reglas consistentes antes de añadir recursos compartidos.

Backend:

- [x] Añadir `description` y `targetDate` opcionales a `Project`.
- [ ] Añadir `IN_REVIEW` a `Task`; queda diferido hasta tener confirmación del contrato de estados.
- [x] Crear `GET /projects/:id/summary` con conteos globales, progreso, vencidas, próximas tareas y miembros.
- [x] Hacer que las operaciones masivas respeten `assertTaskAccess` y validen asignados.
- [x] Permitir a los miembros autorizados crear, editar, completar, asignar y eliminar tareas compartidas.
- [x] Desasignar tareas al quitar una tarea del proyecto o a un miembro.
- [x] Mantener el comportamiento de eliminación: las tareas propias pasan al proyecto personal y los bloques se desvinculan.
- [x] Ocultar o deshabilitar eliminar y renombrar para el proyecto default.

Frontend:

- [x] Sustituir métricas calculadas sobre una página de tareas por el resumen del backend.
- [ ] Mostrar `IN_REVIEW` como `En revisión` cuando exista en el contrato.
- [x] Mostrar `Sin asignar` como estado válido de responsable.
- [x] Invalidar `projects`, summary, tasks, members y home después de mutations.

Criterios de aceptación:

- El progreso representa todo el proyecto, no solo la página visible.
- Un miembro autorizado puede ejecutar las acciones permitidas sobre tareas compartidas.
- Las operaciones no autorizadas responden con el mismo criterio en acciones individuales y masivas.
- Las fechas y estados de la UI coinciden con el contrato backend.

### 19.5 Fase C: notas compartidas del proyecto (base completada)

Objetivo: añadir documentación compartida con la misma versatilidad de la base de conocimiento personal.

Implementación:

- [x] Añadir `projectId` a los parámetros de consulta de knowledge.
- [x] Definir lectura compartida para miembros del proyecto mediante `assertNoteAccess` específico de proyecto.
- [x] Mantener el aislamiento de notas personales sin proyecto.
- [x] Reutilizar `NoteEditorModal` y `MarkdownEditor`.
- [x] Añadir listado, categoría, tags, fijado y edición para la pestaña `Notas`.
- [ ] Añadir búsqueda y filtros de listado específicos dentro de la pestaña `Notas`.
- [x] No incluir Quick Notes en esta vista.

Política actual: todos los miembros pueden leer notas compartidas; solo el autor puede editar, fijar o eliminar su nota.

Criterios de aceptación:

- Todos los miembros pueden ver y editar las notas del proyecto según la política acordada.
- Una nota personal sin proyecto no aparece en ningún workspace.
- La creación de una nota desde el proyecto queda vinculada al proyecto.
- Markdown, filtros y etiquetas funcionan igual que en `Mis notas`.

### 19.6 Fase D: recursos compartidos (en progreso)

Orden de implementación:

1. Enlaces externos con título, URL y descripción opcional.
2. Documentos Markdown editables usando el editor existente.
3. Archivos adjuntos con almacenamiento, tamaño máximo, tipo MIME y permisos.
4. Carpetas o integraciones externas únicamente si existe una necesidad concreta.

- [x] Enlaces externos persistentes con título, URL y descripción opcional.
- [x] Recursos scoped por `projectId`, protegidos por acceso al proyecto y con actividad registrada.
- [ ] Documentos Markdown editables usando el editor existente.
- [ ] Archivos adjuntos con almacenamiento, tamaño máximo, tipo MIME y permisos.

No mostrar recursos simulados. Cada recurso debe estar scoped por `projectId` y protegido por acceso al proyecto.

### 19.7 Fase E: simplificación de Planificación y tareas

Objetivo: eliminar el salto obligatorio entre proyecto y planner y corregir la semántica de planificación.

Implementación:

- Mantener todas las tareas de todos los proyectos en `/tasks`.
- Hacer `Lista` la vista principal para gestión global.
- Renombrar el concepto visual de backlog a `Sin fecha límite`.
- Usar `TaskSchedule` únicamente para asignar una tarea a una ocurrencia de `TimeBlock`.
- Usar `Task.dueDate` únicamente para la fecha límite.
- Retirar el planner global por día y sus acciones de planificación persistente.
- Mantener el proyecto como filtro global y sincronizarlo con la URL.
- Hacer que `view`, `projectId`, período y `taskId` sean estados URL confiables.
- Unificar o retirar el DnD duplicado entre semana y las vistas antiguas.
- Corregir paginación, filtros, selección masiva y estados terminales.
- Mantener la vista mensual como calendario secundario, no como centro de edición.

Criterios de aceptación:

- Ninguna vista llama backlog a una tarea que simplemente no tiene fecha límite.
- El usuario distingue fecha límite de asignación a un bloque.
- La Agenda es la única vista que reserva tiempo concreto para una tarea.
- Cambiar filtros o proyecto no deja selecciones obsoletas.
- `/tasks` sigue permitiendo listar, filtrar y editar tareas de todos los proyectos.

### 19.8 Fase F: actividad, colaboración y calidad (en progreso)

- [x] Feed persistente de actividad para cambios de tareas, notas, miembros, comentarios y recursos.
- [x] Mantener `Chat` como conversación de proyecto con realtime.
- Añadir pruebas de permisos, notas compartidas y operaciones de tareas compartidas.
- Añadir pruebas de navegación por URL en desktop y móvil.
- Añadir pruebas de fechas, estados, paginación y diferencias entre `dueDate` y `TaskSchedule`.
- Verificar accesibilidad, teclado, touch targets y overflow responsive.
- Ejecutar smoke tests completos antes de cada checkpoint.

### 19.9 Orden de ejecución y checkpoints

1. Guardar checkpoint UX actual. Completado en `dd4391e`.
2. Implementar Fase A en `/projects/:id`. Completado.
3. Implementar Fase B con migración y endpoint de summary. Completado; migración aplicada localmente.
4. Implementar la base de Fase C para notas compartidas. Completado; quedan filtros de listado.
5. Implementar la primera fase de recursos externos. Completado.
6. Implementar actividad persistente y realtime. Completado; faltan pruebas específicas.
7. Ejecutar QA visual, accesibilidad y smoke tests completos.
8. Completar los pendientes de Fase E, especialmente estado URL y QA específico de Agenda/Tareas.
9. Completar filtros de notas, documentos/archivos y actualizar `PROJECT_STATUS.md` con resultados finales.

### 19.10 Fuera de alcance inicial

- Kanban dentro de proyectos.
- Drag-and-drop de tareas en el workspace del proyecto.
- Roles personalizados.
- Eventos y bloques de tiempo compartidos.
- Milestones y estados de proyecto avanzados.
- Recursos simulados sin persistencia.
- Conversión o mezcla de Quick Notes con notas compartidas.
