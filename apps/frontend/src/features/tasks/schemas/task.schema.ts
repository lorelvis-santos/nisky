import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Ponle un nombre a la tarea").max(200, "Que sea un poco más corto (máximo 200 caracteres)"),
  description: z.string().trim().max(2000, "Que sea un poco más corto (máximo 2000 caracteres)").optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
  pomodoroEstimate: z.number().int().min(0).max(100),
});

export const subtaskSchema = z.object({ title: z.string().trim().min(1, "Ponle un nombre a la subtarea").max(200) });

export type TaskFormData = z.infer<typeof taskSchema>;
export type SubtaskFormData = z.infer<typeof subtaskSchema>;
