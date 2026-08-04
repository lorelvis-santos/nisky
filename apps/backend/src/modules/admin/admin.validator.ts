import { z } from "zod";

const passwordSchema = z
  .string("La contraseña es requerida")
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "La contraseña debe tener al menos una mayúscula")
  .regex(/[0-9]/, "La contraseña debe tener al menos un número");

export const adminUserIdParamsSchema = z.object({
  id: z.uuid("El identificador no es válido"),
});

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  isActive: z.string().trim().optional().transform((value) => (value === undefined ? undefined : value === "true" ? true : value === "false" ? false : undefined)),
  sort: z.enum(["createdAt", "email", "name", "role"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const createAdminUserSchema = z.object({
  name: z.string("El nombre es requerido").trim().min(1, "El nombre es requerido").max(80),
  email: z.email("El formato del correo electrónico es inválido").transform((value) => value.toLowerCase()),
  password: passwordSchema,
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export const updateAdminUserSchema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacío").max(80).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional(),
});

export const updateSettingsSchema = z.object({
  publicSignup: z.boolean("El valor de publicSignup debe ser un booleano"),
});

export type AdminUsersQueryDto = z.infer<typeof adminUsersQuerySchema>;
export type CreateAdminUserDto = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserDto = z.infer<typeof updateAdminUserSchema>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;