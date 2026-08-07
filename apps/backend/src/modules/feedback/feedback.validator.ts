import { z } from "zod";

const feedbackCategory = z.enum(["BUG", "IDEA", "IMPROVEMENT", "OTHER"]);
const feedbackStatus = z.enum(["NEW", "REVIEWING", "RESOLVED"]);

export const idParamSchema = z.object({ id: z.uuid("El identificador no es válido") });

export const createFeedbackSchema = z.object({
  category: feedbackCategory,
  message: z.string().trim().min(5, "El mensaje debe tener al menos 5 caracteres").max(5000, "El mensaje es demasiado largo"),
  includeEmail: z.boolean().optional(),
});

export const feedbackQuerySchema = z.object({
  status: feedbackStatus.optional(),
  category: feedbackCategory.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateFeedbackSchema = z.object({
  status: feedbackStatus.optional(),
});

export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;
export type FeedbackQueryDto = z.infer<typeof feedbackQuerySchema>;
export type UpdateFeedbackDto = z.infer<typeof updateFeedbackSchema>;