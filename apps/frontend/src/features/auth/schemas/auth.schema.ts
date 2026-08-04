import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(80, "Máximo 80 caracteres"),
  email: z.email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").regex(/[A-Z]/, "Incluye una mayúscula").regex(/[0-9]/, "Incluye un número"),
  confirmPassword: z.string().min(8, "Mínimo 8 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
