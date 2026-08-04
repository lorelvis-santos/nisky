import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "El título es requerido").max(200, "Máximo 200 caracteres"),
  description: z.string().trim().max(2000, "Máximo 2000 caracteres").optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
});

export const subtaskSchema = z.object({ title: z.string().trim().min(1, "El título es requerido").max(200) });

export type TaskFormData = z.infer<typeof taskSchema>;
export type SubtaskFormData = z.infer<typeof subtaskSchema>;
