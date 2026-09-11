import type { McpServer } from "@modelcontextprotocol/server";
import { registerAgendaTools } from "./agenda";
import { registerKnowledgeTools } from "./knowledge";
import { registerProjectTools } from "./projects";
import { registerQuickNoteTools } from "./quicknotes";
import { registerTaskTools } from "./tasks";
import { registerTimeBlockTools } from "./timeblocks";

export function registerAllTools(server: McpServer, auth: string) {
  registerAgendaTools(server, auth);
  registerProjectTools(server, auth);
  registerQuickNoteTools(server, auth);
  registerTimeBlockTools(server, auth);
  registerTaskTools(server, auth);
  registerKnowledgeTools(server, auth);
}
