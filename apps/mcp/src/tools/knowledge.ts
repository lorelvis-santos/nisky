import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { nisky, textResult } from "../client";

const tagsSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(20)
  .optional()
  .transform((tags) => (tags ? [...new Set(tags.map((tag) => tag.toLowerCase()))] : undefined));
const categorySchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .transform((value) => value.toLowerCase())
  .optional();
const noteFields = {
  category: categorySchema,
  tags: tagsSchema,
  pinned: z.boolean().optional(),
  collaboratorsCanEdit: z.boolean().optional(),
  projectId: z.uuid().nullable().optional(),
};

export function registerKnowledgeTools(server: McpServer, auth: string) {
  server.registerTool(
    "search-knowledge",
    {
      title: "Buscar en knowledge",
      description: "Busca y filtra notas de knowledge por texto, categoría, etiqueta, proyecto o estado.",
      inputSchema: z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(20),
        category: z.string().trim().min(1).max(60).optional(),
        tag: z.string().trim().min(1).max(50).optional(),
        pinned: z.boolean().optional(),
        q: z.string().trim().min(1).max(100).optional(),
        projectId: z.uuid().optional(),
        withoutProject: z.boolean().optional(),
        ownerOnly: z.boolean().optional(),
      }),
    },
    async (args) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined) query.set(key, String(value));
      }
      const result = await nisky(auth, `/knowledge?${query.toString()}`);
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "get-knowledge-note",
    {
      title: "Obtener nota de knowledge",
      description: "Obtiene una nota de knowledge por su id.",
      inputSchema: z.object({ id: z.uuid() }),
    },
    async ({ id }) => {
      const result = await nisky(auth, `/knowledge/${id}`);
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "create-knowledge-note",
    {
      title: "Crear nota de knowledge",
      description: "Crea una nota de knowledge con etiquetas y vinculación opcional a un proyecto.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(200),
        content: z.string().min(1).max(50000),
        ...noteFields,
      }),
    },
    async (args) => {
      const result = await nisky(auth, "/knowledge", { method: "POST", body: JSON.stringify(args) });
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );

  server.registerTool(
    "update-knowledge-note",
    {
      title: "Actualizar nota de knowledge",
      description: "Actualiza una nota de knowledge existente sin eliminarla.",
      inputSchema: z.object({
        id: z.uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        content: z.string().min(1).max(50000).optional(),
        ...noteFields,
      }),
    },
    async ({ id, ...body }) => {
      const result = await nisky(auth, `/knowledge/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      return { content: [{ type: "text", text: textResult(result) }] };
    },
  );
}
