import { z } from "zod";

const phase = z.enum(["WORK", "SHORT_BREAK", "LONG_BREAK"]);
const sessionAction = z.enum(["PAUSE", "RESUME", "COMPLETE", "CANCEL"]);
const dateValue = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "La fecha no es válida");

export const sessionIdSchema = z.object({ id: z.uuid("El identificador no es válido") });

export const startSessionSchema = z.object({
  phase,
  taskId: z.uuid("El identificador de la tarea no es válido").nullable().optional(),
  cycleIndex: z.number().int().min(1).max(100).default(1),
});

export const sessionActionSchema = z.object({ action: sessionAction });

export const sessionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  phase: phase.optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  taskId: z.uuid().optional(),
  from: dateValue.optional(),
  to: dateValue.optional(),
});

export const statsQuerySchema = z.object({
  from: dateValue.optional(),
  to: dateValue.optional(),
});

export const updateSettingsSchema = z.object({
  workSec: z.number().int().min(60).max(7200).optional(),
  shortBreakSec: z.number().int().min(30).max(3600).optional(),
  longBreakSec: z.number().int().min(60).max(7200).optional(),
  cyclesPerLong: z.number().int().min(1).max(12).optional(),
  autoCycle: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
});

export type StartSessionDto = z.infer<typeof startSessionSchema>;
export type SessionActionDto = z.infer<typeof sessionActionSchema>;
export type SessionQueryDto = z.infer<typeof sessionQuerySchema>;
export type StatsQueryDto = z.infer<typeof statsQuerySchema>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
