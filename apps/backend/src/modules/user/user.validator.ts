import { z } from "zod";
import { isValidUsername } from "../../utils/validation/username";

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es requerido").max(80, "Máximo 80 caracteres").optional(),
    username: z
      .string()
      .trim()
      .max(30, "El nombre de usuario debe tener máximo 30 caracteres")
      .transform((value) => (value.startsWith("@") ? value.slice(1) : value))
      .refine((value) => value === "" || isValidUsername(value), {
        message: "Solo letras, números y _ (3-30 caracteres), y no puede estar reservado",
      })
      .transform((value) => (value === "" ? null : value.toLowerCase()))
      .nullable()
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.username !== undefined, {
    message: "No hay nada que actualizar",
  });

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;