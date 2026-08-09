import { z } from "zod";

export const activityQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).optional().default(12),
});

export type ActivityQueryDto = z.infer<typeof activityQuerySchema>;
