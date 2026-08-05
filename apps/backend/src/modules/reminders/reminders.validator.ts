import { z } from "zod";

const idParamSchema = z.object({ id: z.uuid("El identificador no es válido") });
const repeatTypeSchema = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);

const triggerAtSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "La fecha no es válida");
const timezoneSchema = z.string().trim().min(1).max(100).refine((value) => {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "La zona horaria no es válida");

const payloadSchema = z.object({
  type: z.enum(["CUSTOM", "TASK_DUE", "HABIT"]).default("CUSTOM"),
  taskId: z.uuid().optional(),
  habitId: z.uuid().optional(),
}).optional();

const reminderFieldsSchema = z.object({
  title: z.string("El título es requerido").trim().min(1, "El título es requerido").max(200),
  body: z.string().trim().max(500).optional(),
  triggerAt: triggerAtSchema,
  timezone: timezoneSchema.default("America/Bogota"),
  repeatType: repeatTypeSchema.optional(),
  repeatInterval: z.number().int().min(1).max(365).default(1),
  repeatDaysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  repeatDayOfMonth: z.number().int().min(1).max(31).optional(),
  payload: payloadSchema,
});

export const createReminderSchema = reminderFieldsSchema.superRefine((value, context) => {
  if (value.repeatType === "WEEKLY" && value.repeatDaysOfWeek.length === 0) {
    context.addIssue({ code: "custom", path: ["repeatDaysOfWeek"], message: "Selecciona al menos un día" });
  }
});

export const updateReminderSchema = reminderFieldsSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const reminderQuerySchema = z.object({
  status: z.enum(["active", "inactive", "all"]).default("active"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const snoozeReminderSchema = z.object({
  minutes: z.number().int().min(1).max(1440),
});

export { idParamSchema };
export type CreateReminderDto = z.infer<typeof createReminderSchema>;
export type UpdateReminderDto = z.infer<typeof updateReminderSchema>;
export type ReminderQueryDto = z.infer<typeof reminderQuerySchema>;
export type SnoozeReminderDto = z.infer<typeof snoozeReminderSchema>;
