import { z } from "zod";

export const idParamSchema = z.object({ id: z.uuid("El identificador no es válido") });

export const createPatSchema = z.object({
  name: z.string("El nombre es requerido").trim().min(1, "El nombre es requerido").max(60, "Máximo 60 caracteres"),
  expiresInDays: z.number().int().min(1, "Mínimo 1 día").max(365, "Máximo 365 días").optional(),
});

export type CreatePatDto = z.infer<typeof createPatSchema>;