import { z } from "zod";

const taskStatus = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const taskPriority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const dateValue = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "La fecha no es válida");
const pomodoroEstimate = z.number().int().min(0).max(100);

export const idParamSchema = z.object({ id: z.uuid("El identificador no es válido") });
export const subtaskParamsSchema = z.object({
  id: z.uuid("El identificador de la tarea no es válido"),
  subtaskId: z.uuid("El identificador de la subtarea no es válido"),
});

export const taskRecurrenceSchema = z
  .object({
    repeatType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
    repeatInterval: z.number().int().min(1).max(365).default(1),
    repeatDaysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    repeatDayOfMonth: z.number().int().min(1).max(31).optional(),
    repeatEndsAt: dateValue.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.repeatType === "WEEKLY" && value.repeatDaysOfWeek.length === 0) {
      context.addIssue({ code: "custom", path: ["repeatDaysOfWeek"], message: "Selecciona al menos un día" });
    }
  });

const taskFields = {
  title: z.string("El título es requerido").trim().min(1, "El título es requerido").max(200),
  description: z.string().trim().max(2000).optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  dueDate: dateValue.optional(),
  pomodoroEstimate: pomodoroEstimate.optional(),
  projectId: z.uuid("El proyecto no es válido").nullable().optional(),
  assigneeId: z.uuid("El asignado no es válido").nullable().optional(),
  recurrence: taskRecurrenceSchema.optional(),
};

export const createTaskSchema = z.object(taskFields).superRefine((value, context) => {
  if (value.recurrence?.repeatType && !value.dueDate) {
    context.addIssue({ code: "custom", path: ["dueDate"], message: "Necesita fecha para repetirse" });
  }
  if (value.assigneeId && !value.projectId) {
    context.addIssue({ code: "custom", path: ["projectId"], message: "La tarea debe pertenecer a un proyecto para asignarla" });
  }
});

export const updateTaskSchema = z
  .object({
    ...taskFields,
    title: taskFields.title.optional(),
    dueDate: dateValue.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.recurrence?.repeatType && !value.dueDate) {
      context.addIssue({ code: "custom", path: ["dueDate"], message: "Necesita fecha para repetirse" });
    }
    if (value.assigneeId && !value.projectId) {
      context.addIssue({ code: "custom", path: ["projectId"], message: "La tarea debe pertenecer a un proyecto para asignarla" });
    }
  });

export const reorderTasksSchema = z.object({
  items: z.array(z.object({
    id: z.uuid("El identificador no es válido"),
    order: z.number().int().min(0),
  })).min(1, "Debe enviar al menos una tarea"),
});

export const bulkTaskIdsSchema = z.object({
  ids: z.array(z.uuid("El identificador no es válido")).min(1, "Selecciona al menos una tarea").max(100),
});

export const bulkMoveTasksSchema = bulkTaskIdsSchema.extend({
  projectId: z.uuid("El proyecto no es válido").nullable(),
});

export const archiveTaskSchema = z.object({
  archived: z.boolean(),
});

export const createSubtaskSchema = z.object({
  title: z.string("El título es requerido").trim().min(1, "El título es requerido").max(200),
});

export const updateSubtaskSchema = createSubtaskSchema.partial().extend({
  completed: z.boolean().optional(),
});

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  sort: z.enum(["priority", "dueDate", "createdAt", "title"]).default("priority"),
  order: z.enum(["asc", "desc"]).default("desc"),
  q: z.string().trim().max(100).optional(),
  projectId: z.uuid("El proyecto no es válido").optional(),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type ReorderTasksDto = z.infer<typeof reorderTasksSchema>;
export type BulkTaskIdsDto = z.infer<typeof bulkTaskIdsSchema>;
export type BulkMoveTasksDto = z.infer<typeof bulkMoveTasksSchema>;
export type CreateSubtaskDto = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskDto = z.infer<typeof updateSubtaskSchema>;
export type TaskQueryDto = z.infer<typeof taskQuerySchema>;
export type ArchiveTaskDto = z.infer<typeof archiveTaskSchema>;
export type TaskRecurrenceDto = z.infer<typeof taskRecurrenceSchema>;
