import { z } from "zod";

export const noteFormSchema = z.object({
  title: z.string("Ponle un título a tu nota").trim().min(1, "Ponle un título a tu nota").max(200),
  content: z.string("Escribe algo antes de guardar").min(1, "Escribe algo antes de guardar").max(50_000),
  category: z.string().trim().min(1).max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  pinned: z.boolean().optional(),
});

export type NoteForm = z.infer<typeof noteFormSchema>;
