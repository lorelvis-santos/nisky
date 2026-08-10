import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { nisky, textResult } from "../client";

const timeBlockFields = {
  projectId: z.uuid().nullable().optional(),
  name: z.string().trim().max(100).nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, "Elige al menos un día"),
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(1).max(1440),
  repeatEveryWeeks: z.number().int().min(0).max(52).optional(),
  repeatEndsAt: z.string().datetime().nullable().optional(),
  remindBeforeMin: z.number().int().min(0).max(1440).optional(),
};

const createTimeBlockSchema = z
  .object(timeBlockFields)
  .refine((value) => value.endMin > value.startMin, { message: "endMin debe ser mayor que startMin", path: ["endMin"] });

export function registerTimeBlockTools(server: McpServer, auth: string) {
  server.registerTool(
    "list-timeblocks",
    {
      title: "Listar bloques de tiempo",
      description: "Lista todos los bloques de tiempo programados del usuario autenticado.",
      inputSchema: z.object({}),
    },
    async () => {
      const result = await nisky(auth, "/timeblocks");
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "get-timeblock-active",
    {
      title: "Bloque de tiempo activo",
      description: "Obtiene el bloque de tiempo que está activo en este momento, si existe.",
      inputSchema: z.object({}),
    },
    async () => {
      const result = await nisky(auth, "/timeblocks/active");
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "get-timeblocks-today",
    {
      title: "Bloques de tiempo de hoy",
      description: "Lista los bloques de tiempo que aplican al día de hoy.",
      inputSchema: z.object({}),
    },
    async () => {
      const result = await nisky(auth, "/timeblocks/today");
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "create-timeblock",
    {
      title: "Crear bloque de tiempo",
      description: "Crea un bloque de tiempo semanal. Se valida que no se solape con otros bloques del usuario.",
      inputSchema: createTimeBlockSchema,
    },
    async (args) => {
      const result = await nisky(auth, "/timeblocks", { method: "POST", body: JSON.stringify(args) });
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "update-timeblock",
    {
      title: "Actualizar bloque de tiempo",
      description: "Actualiza un bloque de tiempo existente. EndMin debe ser mayor que startMin.",
      inputSchema: z
        .object({
          id: z.uuid(),
          projectId: z.uuid().nullable().optional(),
          name: z.string().trim().max(100).nullable().optional(),
          daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
          startMin: z.number().int().min(0).max(1439).optional(),
          endMin: z.number().int().min(1).max(1440).optional(),
          repeatEveryWeeks: z.number().int().min(0).max(52).optional(),
          repeatEndsAt: z.string().datetime().nullable().optional(),
          remindBeforeMin: z.number().int().min(0).max(1440).optional(),
          isActive: z.boolean().optional(),
        })
        .refine(
          (value) => value.startMin === undefined || value.endMin === undefined || value.endMin > value.startMin,
          { message: "endMin debe ser mayor que startMin", path: ["endMin"] },
        ),
    },
    async ({ id, ...body }) => {
      const result = await nisky(auth, `/timeblocks/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );
}