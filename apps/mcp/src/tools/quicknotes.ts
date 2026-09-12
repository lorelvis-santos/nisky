import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { nisky, toolResult } from "../client";

const quickNoteStatus = z.enum(["INBOX", "ARCHIVED"]);

export function registerQuickNoteTools(server: McpServer, auth: string) {
  server.registerTool(
    "list-quick-notes",
    {
      title: "Listar notas rápidas",
      description: "Lista las notas rápidas del usuario, opcionalmente filtradas por estado.",
      inputSchema: z.object({
        status: quickNoteStatus.optional(),
        limit: z.number().int().min(1).max(50).default(8),
      }),
    },
    async (args) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined) query.set(key, String(value));
      }
      const result = await nisky(auth, `/quick-notes?${query.toString()}`);
      return toolResult(result);
    },
  );

  server.registerTool(
    "create-quick-note",
    {
      title: "Crear nota rápida",
      description: "Guarda una nota rápida en la bandeja de entrada del usuario.",
      inputSchema: z.object({ content: z.string().trim().min(1).max(2000) }),
    },
    async (args) => {
      const result = await nisky(auth, "/quick-notes", { method: "POST", body: JSON.stringify(args) });
      return toolResult(result);
    },
  );

  server.registerTool(
    "update-quick-note",
    {
      title: "Actualizar nota rápida",
      description: "Edita una nota rápida o la archiva sin borrarla.",
      inputSchema: z.object({
        id: z.uuid(),
        content: z.string().trim().min(1).max(2000).optional(),
        status: quickNoteStatus.optional(),
      }),
    },
    async ({ id, ...body }) => {
      const result = await nisky(auth, `/quick-notes/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      return toolResult(result);
    },
  );
}
