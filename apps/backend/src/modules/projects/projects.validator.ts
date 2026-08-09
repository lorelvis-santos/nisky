import { z } from "zod";

export const idParamSchema = z.object({ id: z.uuid("El identificador no es válido") });

export const createProjectSchema = z.object({
  name: z.string("El nombre es requerido").trim().min(1, "El nombre es requerido").max(100),
  color: z.string().trim().max(20).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
