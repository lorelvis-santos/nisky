import { z } from "zod";

const passwordSchema = z
  .string("La contraseña es requerida")
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "La contraseña debe tener al menos una mayúscula")
  .regex(/[0-9]/, "La contraseña debe tener al menos un número");

export const loginSchema = z.object({
  email: z.email("El formato del correo electrónico es inválido").transform((value) => value.toLowerCase()),
  password: z.string("La contraseña es requerida").min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const registerSchema = z.object({
  name: z.string("El nombre es requerido").trim().min(1, "El nombre es requerido").max(80),
  email: z.email("El formato del correo electrónico es inválido").transform((value) => value.toLowerCase()),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string("La contraseña actual es requerida").min(1, "La contraseña actual es requerida"),
  newPassword: passwordSchema,
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
