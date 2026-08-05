import { z } from "zod";

export const noteFormSchema = z.object({
  title: z.string("El título es requerido").trim().min(1, "El título es requerido").max(200),
  content: z.string("El contenido es requerido").min(1, "El contenido es requerido").max(50_000),
  category: z.string().trim().min(1).max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  pinned: z.boolean().optional(),
});

export type NoteForm = z.infer<typeof noteFormSchema>;
