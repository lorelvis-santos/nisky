import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.string("El comentario es requerido").trim().min(1, "El comentario no puede estar vacío").max(5000, "Máximo 5000 caracteres"),
});

export const updateCommentSchema = createCommentSchema.partial();

export const commentIdParamSchema = z.object({
  id: z.uuid("El comentario no es válido"),
});

export const projectIdParamSchema = z.object({
  projectId: z.uuid("El proyecto no es válido"),
});

export const taskIdParamSchema = z.object({
  taskId: z.uuid("La tarea no es válida"),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;