import { z } from "zod";

export const noteIdParamsSchema = z.object({ id: z.uuid("El identificador no es válido") });

const tagsSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(20, "Máximo 20 etiquetas")
  .optional()
  .transform((tags) => (tags ? [...new Set(tags.map((tag) => tag.toLowerCase()))] : undefined));

const categorySchema = z.string().trim().min(1).max(60).transform((value) => value.toLowerCase()).optional();

export const createNoteSchema = z.object({
  title: z.string("El título es requerido").trim().min(1, "El título es requerido").max(200),
  content: z.string("El contenido es requerido").min(1, "El contenido es requerido").max(50_000),
  category: categorySchema,
  tags: tagsSchema,
});

export const updateNoteSchema = z.object({
  title: z.string().trim().min(1, "El título es requerido").max(200).optional(),
  content: z.string().min(1, "El contenido es requerido").max(50_000).optional(),
  category: categorySchema,
  tags: tagsSchema,
  pinned: z.boolean().optional(),
});

export const noteQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().trim().min(1).max(60).transform((value) => value.toLowerCase()).optional(),
  tag: z.string().trim().min(1).max(50).transform((value) => value.toLowerCase()).optional(),
  pinned: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export type CreateNoteDto = z.infer<typeof createNoteSchema>;
export type UpdateNoteDto = z.infer<typeof updateNoteSchema>;
export type NoteQueryDto = z.infer<typeof noteQuerySchema>;
