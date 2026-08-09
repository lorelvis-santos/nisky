import { z } from "zod";

export const taskRecurrenceSchema = z
  .object({
    repeatType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
    repeatInterval: z.number().int().min(1).max(365).default(1),
    repeatDaysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    repeatDayOfMonth: z.number().int().min(1).max(31).optional(),
    repeatEndsAt: z.string().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.repeatType === "WEEKLY" && value.repeatDaysOfWeek.length === 0) {
      context.addIssue({ code: "custom", path: ["repeatDaysOfWeek"], message: "Selecciona al menos un día" });
    }
  });

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Ponle un nombre a la tarea").max(200, "Que sea un poco más corto (máximo 200 caracteres)"),
  description: z.string().trim().max(2000, "Que sea un poco más corto (máximo 2000 caracteres)").optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
  pomodoroEstimate: z.number().int().min(0).max(100),
  projectId: z.string().optional(),
  recurrence: taskRecurrenceSchema.optional(),
});

export const subtaskSchema = z.object({ title: z.string().trim().min(1, "Ponle un nombre a la subtarea").max(200) });

export type TaskFormData = z.infer<typeof taskSchema>;
export type TaskRecurrenceFormData = z.infer<typeof taskRecurrenceSchema>;
export type SubtaskFormData = z.infer<typeof subtaskSchema>;
