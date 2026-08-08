import { z } from "zod";

const domainSchema = z.string().trim().min(1).max(255).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, "El dominio debe ser una URL válida (ej: https://canvas.instancia.edu.do)");

export const providerParamSchema = z.object({ provider: z.enum(["MOODLE", "CANVAS"]) });
export const idParamSchema = z.object({ id: z.uuid("El identificador no es válido") });
export const providerIdParamSchema = providerParamSchema.extend({ id: idParamSchema.shape.id });

export const connectMoodleSchema = z.object({
  domain: domainSchema,
  username: z.string().trim().min(1).max(100).optional(),
  password: z.string().min(1).max(200).optional(),
  token: z.string().min(10).max(200).optional(),
  service: z.string().trim().min(1).max(100).optional(),
}).superRefine((value, context) => {
  if (!value.token && !(value.username && value.password)) {
    context.addIssue({ code: "custom", path: ["token"], message: "Proporciona un token o un usuario+contraseña" });
  }
});

export const connectCanvasSchema = z.object({
  domain: domainSchema,
  token: z.string().min(10).max(500),
});

export const integrationTaskQuerySchema = z.object({
  source: z.enum(["MOODLE", "CANVAS"]).optional(),
  status: z.enum(["pending", "overdue", "all"]).default("pending"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const integrationEnabledSchema = z.object({ enabled: z.boolean() });

export function connectSchemaFor(providerValue: string) {
  return providerValue === "CANVAS" ? connectCanvasSchema : connectMoodleSchema;
}

export type ProviderParamDto = z.infer<typeof providerParamSchema>;
export type ConnectMoodleDto = z.infer<typeof connectMoodleSchema>;
export type ConnectCanvasDto = z.infer<typeof connectCanvasSchema>;
export type IntegrationTaskQueryDto = z.infer<typeof integrationTaskQuerySchema>;