import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { nisky, textResult } from "../client";

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
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "create-project",
    {
      title: "Crear proyecto",
      description: "Crea un proyecto. Límite de 20 por usuario; el nombre debe ser único por usuario.",
      inputSchema: z.object({
        name: z.string().min(1).max(100),
        color: z.string().max(20).optional(),
      }),
    },
    async (args) => {
      const result = await nisky(auth, "/projects", { method: "POST", body: JSON.stringify(args) });
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "update-project",
    {
      title: "Actualizar proyecto",
      description: "Actualiza el nombre o color de un proyecto. El proyecto por defecto no se puede renombrar.",
      inputSchema: z.object({
        id: z.uuid(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().max(20).optional(),
      }),
    },
    async ({ id, ...body }) => {
      const result = await nisky(auth, `/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );
}