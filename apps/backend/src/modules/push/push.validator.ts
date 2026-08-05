import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.url("El endpoint no es válido"),
  keys: z.object({
    p256dh: z.string().min(1, "La clave p256dh es requerida"),
    auth: z.string().min(1, "La clave auth es requerida"),
  }),
  userAgent: z.string().max(500).optional(),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.url("El endpoint no es válido"),
});

export type PushSubscriptionDto = z.infer<typeof pushSubscriptionSchema>;
export type PushUnsubscribeDto = z.infer<typeof pushUnsubscribeSchema>;
