import { z } from "zod";

export const journalIdParamsSchema = z.object({ id: z.uuid("El identificador no es válido") });

const tagsSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(20, "Máximo 20 etiquetas")
  .optional()
  .transform((tags) => (tags ? [...new Set(tags.map((tag) => tag.toLowerCase()))] : undefined));

const classificationSchema = z.string().trim().min(1).max(60).transform((value) => value.toLowerCase()).optional();

export const createJournalEntrySchema = z.object({
  title: z.string("El título es requerido").trim().min(1, "El título es requerido").max(200),
  content: z.string("El contenido es requerido").min(1, "El contenido es requerido").max(50_000),
  classification: classificationSchema,
  tags: tagsSchema,
});

export const updateJournalEntrySchema = z.object({
  title: z.string().trim().min(1, "El título es requerido").max(200).optional(),
  content: z.string().min(1, "El contenido es requerido").max(50_000).optional(),
  classification: classificationSchema,
  tags: tagsSchema,
});

export const saveJournalDraftSchema = z.object({
  title: z.string().max(200).nullish(),
  content: z.string().max(50_000).nullish(),
  classification: classificationSchema.nullish(),
  tags: tagsSchema,
});

export const journalQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  classification: z.string().trim().min(1).max(60).transform((value) => value.toLowerCase()).optional(),
  tag: z.string().trim().min(1).max(50).transform((value) => value.toLowerCase()).optional(),
});

export type CreateJournalEntryDto = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryDto = z.infer<typeof updateJournalEntrySchema>;
export type JournalQueryDto = z.infer<typeof journalQuerySchema>;
export type SaveJournalDraftDto = z.infer<typeof saveJournalDraftSchema>;
