import { z } from "zod";

const domainSchema = z.string().trim().min(1).max(255).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, "El dominio debe ser una URL válida (ej: https://moodle.miescuela.edu.do)");

const connectMoodleSchema = z.object({
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

const moodleTaskQuerySchema = z.object({
  status: z.enum(["pending", "overdue", "all"]).default("pending"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const moodleEnabledSchema = z.object({ enabled: z.boolean() });

export { connectMoodleSchema, moodleTaskQuerySchema, moodleEnabledSchema };
export type ConnectMoodleDto = z.infer<typeof connectMoodleSchema>;
export type MoodleTaskQueryDto = z.infer<typeof moodleTaskQuerySchema>;
