import { z } from "zod";

const habitFrequency = z.enum(["DAILY", "WEEKLY"]);
const dateValue = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "La fecha no es válida");

export const idParamSchema = z.object({ id: z.uuid("El identificador no es válido") });

export const createHabitSchema = z.object({
  name: z.string("El nombre es requerido").trim().min(1, "El nombre es requerido").max(100),
  color: z.string().trim().max(20).optional(),
  frequency: habitFrequency.optional(),
  targetDays: z.number().int().min(1).max(7).optional(),
});

export const updateHabitSchema = createHabitSchema.partial().extend({ archived: z.boolean().optional() });

export const toggleEntrySchema = z.object({
  date: dateValue,
  completed: z.boolean().optional(),
});

export const entriesQuerySchema = z.object({
  from: dateValue.optional(),
  to: dateValue.optional(),
}).refine((value) => !value.from || !value.to || Date.parse(value.from) <= Date.parse(value.to), {
  message: "El rango de fechas no es válido",
  path: ["to"],
});

export type CreateHabitDto = z.infer<typeof createHabitSchema>;
export type UpdateHabitDto = z.infer<typeof updateHabitSchema>;
export type ToggleEntryDto = z.infer<typeof toggleEntrySchema>;
export type EntriesQueryDto = z.infer<typeof entriesQuerySchema>;
