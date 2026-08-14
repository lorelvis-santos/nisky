import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid("ID inválido"),
});

export const createEventBaseSchema = z.object({
  title: z.string().trim().min(1, "El título es requerido").max(200, "Máximo 200 caracteres"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Fecha inválida" }),
  allDay: z.boolean().default(false),
  startMin: z.number().int().min(0).max(1439).optional(),
  endMin: z.number().int().min(1).max(1440).optional(),
  location: z.string().trim().max(200).optional(),
  color: z.string().trim().max(20).optional(),
});

export const createEventSchema = createEventBaseSchema.superRefine((v, ctx) => {
    if (!v.allDay) {
      if (v.startMin === undefined) {
        ctx.addIssue({ code: "custom", path: ["startMin"], message: "Requiere hora de inicio" });
      }
      if (v.endMin === undefined) {
        ctx.addIssue({ code: "custom", path: ["endMin"], message: "Requiere hora de fin" });
      }
      if (v.startMin !== undefined && v.endMin !== undefined && v.endMin <= v.startMin) {
        ctx.addIssue({ code: "custom", path: ["endMin"], message: "Fin debe ser mayor a inicio" });
      }
    }
  });

export const updateEventSchema = createEventBaseSchema.partial();

export const queryRangeSchema = z
  .object({
    from: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Fecha inválida" }),
    to: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Fecha inválida" }),
  })
  .refine((data) => Date.parse(data.from) <= Date.parse(data.to), {
    message: "La fecha inicial debe ser menor o igual a la final",
    path: ["to"],
  });

export type CreateEventDto = z.infer<typeof createEventSchema>;
export type UpdateEventDto = z.infer<typeof updateEventSchema>;
export type QueryRangeDto = z.infer<typeof queryRangeSchema>;
