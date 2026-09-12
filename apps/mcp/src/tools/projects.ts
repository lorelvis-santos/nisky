import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { nisky, toolResult } from "../client";

const dateValue = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "La fecha no es válida");
const projectFields = {
  description: z.string().trim().max(2000).nullable().optional(),
  targetDate: dateValue.nullable().optional(),
  color: z.string().trim().max(20).optional(),
  weeklyTargetMinutes: z.number().int().min(0).max(10080).nullable().optional(),
};

export function registerProjectTools(server: McpServer, auth: string) {
  server.registerTool(
    "list-projects",
    {
      title: "Listar proyectos",
      description: "Lista todos los proyectos del usuario autenticado.",
      inputSchema: z.object({}),
    },
    async () => {
      const result = await nisky(auth, "/projects");
      return toolResult(result);
    },
  );

  server.registerTool(
    "create-project",
    {
      title: "Crear proyecto",
      description: "Crea un proyecto. Límite de 20 por usuario; el nombre debe ser único por usuario.",
      inputSchema: z.object({
        name: z.string().trim().min(1).max(100),
        ...projectFields,
      }),
    },
    async (args) => {
      const result = await nisky(auth, "/projects", { method: "POST", body: JSON.stringify(args) });
      return toolResult(result);
    },
  );

  server.registerTool(
    "update-project",
    {
      title: "Actualizar proyecto",
      description: "Actualiza los datos de un proyecto. El proyecto por defecto no se puede renombrar.",
      inputSchema: z.object({
        id: z.uuid(),
        name: z.string().trim().min(1).max(100).optional(),
        ...projectFields,
      }),
    },
    async ({ id, ...body }) => {
      const result = await nisky(auth, `/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      return toolResult(result);
    },
  );
}
