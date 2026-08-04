import { z } from "zod";

const quickNoteStatus = z.enum(["INBOX", "ARCHIVED"]);

export const idParamSchema = z.object({ id: z.uuid("El identificador no es válido") });

export const createQuickNoteSchema = z.object({
  content: z.string("El contenido es requerido").trim().min(1, "El contenido es requerido").max(2000),
});

export const updateQuickNoteSchema = z.object({
  content: z.string().trim().min(1, "El contenido es requerido").max(2000).optional(),
  status: quickNoteStatus.optional(),
});

export const quickNoteQuerySchema = z.object({
  status: quickNoteStatus.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(8),
});

export type CreateQuickNoteDto = z.infer<typeof createQuickNoteSchema>;
export type UpdateQuickNoteDto = z.infer<typeof updateQuickNoteSchema>;
export type QuickNoteQueryDto = z.infer<typeof quickNoteQuerySchema>;
