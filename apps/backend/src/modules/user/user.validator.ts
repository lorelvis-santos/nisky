import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80, "Máximo 80 caracteres").optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;