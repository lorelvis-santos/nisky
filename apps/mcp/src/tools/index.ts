import type { McpServer } from "@modelcontextprotocol/server";
import { registerProjectTools } from "./projects";
import { registerTaskTools } from "./tasks";
import { registerTimeBlockTools } from "./timeblocks";

export function registerAllTools(server: McpServer, auth: string) {
  registerProjectTools(server, auth);
  registerTimeBlockTools(server, auth);
  registerTaskTools(server, auth);
}