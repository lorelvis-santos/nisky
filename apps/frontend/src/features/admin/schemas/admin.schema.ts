import { z } from "zod";
import type { UserRole } from "@/types/entities";

export const adminUserFormSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es requerido").max(80, "Máximo 80 caracteres"),
    email: z.email("Email inválido"),
    role: z.enum(["ADMIN", "USER"]),
    isActive: z.boolean(),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password) {
      if (data.password.length < 8) {
        ctx.addIssue({ code: "custom", path: ["password"], message: "Mínimo 8 caracteres" });
      }
      if (!/[A-Z]/.test(data.password)) {
        ctx.addIssue({ code: "custom", path: ["password"], message: "Incluye una mayúscula" });
      }
      if (!/[0-9]/.test(data.password)) {
        ctx.addIssue({ code: "custom", path: ["password"], message: "Incluye un número" });
      }
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Las contraseñas no coinciden" });
      }
    }
  });

export type AdminUserFormData = z.infer<typeof adminUserFormSchema>;
export type Role = UserRole;