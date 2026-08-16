import { z } from "zod";

export const updateNotificationSettingsSchema = z
  .object({
    morningDigest: z.boolean().optional(),
    taskDueReminders: z.boolean().optional(),
    integrationNews: z.boolean().optional(),
    integrationErrors: z.boolean().optional(),
    timeBlockReminders: z.boolean().optional(),
    habitReminders: z.boolean().optional(),
    eventReminders: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    const keys = [
      "morningDigest",
      "taskDueReminders",
      "integrationNews",
      "integrationErrors",
      "timeBlockReminders",
      "habitReminders",
      "eventReminders",
    ] as const;
    if (!keys.some((key) => value[key] !== undefined)) {
      context.addIssue({
        code: "custom",
        path: ["morningDigest"],
        message: "Envía al menos un ajuste para actualizar",
      });
    }
  });

export type UpdateNotificationSettingsDto = z.infer<typeof updateNotificationSettingsSchema>;