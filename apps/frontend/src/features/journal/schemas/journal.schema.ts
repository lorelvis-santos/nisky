import { z } from "zod";

export const journalEntrySchema = z.object({
  title: z.string("Ponle un título a tu entrada").trim().min(1, "Ponle un título a tu entrada").max(200),
  content: z.string("Escribe algo antes de guardar").min(1, "Escribe algo antes de guardar").max(50_000),
  classification: z.string().trim().min(1).max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
});

export type JournalEntryForm = z.infer<typeof journalEntrySchema>;
