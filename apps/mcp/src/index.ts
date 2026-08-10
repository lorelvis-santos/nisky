import express from "express";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { rateLimit } from "./ratelimit";
import { registerAllTools } from "./tools";

const PORT = Number(process.env.MCP_PORT ?? 8787);

const handler = createMcpHandler((ctx) => {
  const auth = ctx.requestInfo?.headers.get("authorization") ?? "";
  const server = new McpServer({ name: "nisky", version: "0.1.0" });
  registerAllTools(server, auth);
  return server;
});

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.all("/mcp", rateLimit, (req, res) => void toNodeHandler(handler)(req, res, req.body));

app.listen(PORT, () => console.log(`nisky-mcp listening on :${PORT}`));