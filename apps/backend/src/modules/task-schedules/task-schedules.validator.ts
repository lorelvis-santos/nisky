import { z } from "zod";

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD");
const taskStatus = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

export const taskScheduleIdParamSchema = z.object({
  taskId: z.uuid("El identificador de la tarea no es válido"),
});

export const taskScheduleQuerySchema = z.object({
  from: calendarDate,
  to: calendarDate,
  projectId: z.uuid("El proyecto no es válido").optional(),
  status: taskStatus.optional(),
});

export const upsertTaskScheduleSchema = z.object({
  date: calendarDate,
  timeBlockId: z.uuid("El bloque no es válido"),
  order: z.number().int().min(0).max(10000).optional(),
});

export type TaskScheduleQueryDto = z.infer<typeof taskScheduleQuerySchema>;
export type UpsertTaskScheduleDto = z.infer<typeof upsertTaskScheduleSchema>;
