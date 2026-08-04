import { z } from "zod";

const taskStatus = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const taskPriority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const dateValue = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "La fecha no es válida");

export const idParamSchema = z.object({ id: z.uuid("El identificador no es válido") });
export const subtaskParamsSchema = z.object({
  id: z.uuid("El identificador de la tarea no es válido"),
  subtaskId: z.uuid("El identificador de la subtarea no es válido"),
});

export const createTaskSchema = z.object({
  title: z.string("El título es requerido").trim().min(1, "El título es requerido").max(200),
  description: z.string().trim().max(2000).optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  dueDate: dateValue.optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({ dueDate: dateValue.nullable().optional() });

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
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type CreateSubtaskDto = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskDto = z.infer<typeof updateSubtaskSchema>;
export type TaskQueryDto = z.infer<typeof taskQuerySchema>;
