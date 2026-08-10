import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { nisky, textResult } from "../client";

const taskStatus = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const taskPriority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

const taskRecurrenceSchema = z
  .object({
    repeatType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
    repeatInterval: z.number().int().min(1).max(365).default(1),
    repeatDaysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    repeatDayOfMonth: z.number().int().min(1).max(31).optional(),
    repeatEndsAt: z.string().datetime().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.repeatType === "WEEKLY" && value.repeatDaysOfWeek.length === 0) {
      context.addIssue({ code: "custom", path: ["repeatDaysOfWeek"], message: "Selecciona al menos un día" });
    }
  });

export function registerTaskTools(server: McpServer, auth: string) {
  server.registerTool(
    "list-tasks",
    {
      title: "Listar tareas",
      description: "Lista las tareas del usuario con filtros, búsqueda y paginación.",
      inputSchema: z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        status: taskStatus.optional(),
        priority: taskPriority.optional(),
        sort: z.enum(["priority", "dueDate", "createdAt", "title"]).default("priority"),
        order: z.enum(["asc", "desc"]).default("desc"),
        q: z.string().trim().max(100).optional(),
        projectId: z.uuid().optional(),
      }),
    },
    async (args) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined) query.set(key, String(value));
      }
      const result = await nisky(auth, `/tasks?${query.toString()}`);
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "get-task",
    {
      title: "Obtener tarea",
      description: "Obtiene una tarea por su id, incluyendo el conteo de subtareas.",
      inputSchema: z.object({ id: z.uuid() }),
    },
    async ({ id }) => {
      const result = await nisky(auth, `/tasks/${id}`);
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "create-task",
    {
      title: "Crear tarea",
      description: "Crea una tarea. Si se define recurrence con repeatType, dueDate es obligatorio.",
      inputSchema: z
        .object({
          title: z.string().trim().min(1).max(200),
          description: z.string().trim().max(2000).optional(),
          status: taskStatus.optional(),
          priority: taskPriority.optional(),
          dueDate: z.string().datetime().optional(),
          pomodoroEstimate: z.number().int().min(0).max(100).optional(),
          projectId: z.uuid().nullable().optional(),
          recurrence: taskRecurrenceSchema.optional(),
        })
        .superRefine((value, context) => {
          if (value.recurrence?.repeatType && !value.dueDate) {
            context.addIssue({ code: "custom", path: ["dueDate"], message: "Necesita fecha para repetirse" });
          }
        }),
    },
    async (args) => {
      const result = await nisky(auth, "/tasks", { method: "POST", body: JSON.stringify(args) });
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "update-task",
    {
      title: "Actualizar tarea",
      description: "Actualiza una tarea existente. Todos los campos son opcionales; dueDate admite null.",
      inputSchema: z
        .object({
          id: z.uuid(),
          title: z.string().trim().min(1).max(200).optional(),
          description: z.string().trim().max(2000).nullable().optional(),
          status: taskStatus.optional(),
          priority: taskPriority.optional(),
          dueDate: z.string().datetime().nullable().optional(),
          pomodoroEstimate: z.number().int().min(0).max(100).optional(),
          projectId: z.uuid().nullable().optional(),
          recurrence: taskRecurrenceSchema.nullable().optional(),
        })
        .superRefine((value, context) => {
          if (value.recurrence?.repeatType && !value.dueDate) {
            context.addIssue({ code: "custom", path: ["dueDate"], message: "Necesita fecha para repetirse" });
          }
        }),
    },
    async ({ id, ...body }) => {
      const result = await nisky(auth, `/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );
}