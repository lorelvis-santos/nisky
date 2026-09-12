import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import type { NextFunction, Request, Response } from "express";
import { validateOAuthAccessToken } from "./client";
import { oauthChallenge, protectedResourceMetadata } from "./oauth";
import { rateLimit } from "./ratelimit";
import { registerAllTools } from "./tools";

const PORT = Number(process.env.MCP_PORT ?? 8787);
const HOST = process.env.MCP_HOST ?? "0.0.0.0";
const LOCAL_HOSTS = "localhost,127.0.0.1,[::1]";
function oauthProtectedResourceMetadata(_req: Request, res: Response) {
  res.set("Cache-Control", "public, max-age=300");
  res.json(protectedResourceMetadata());
}

function hostList(value: string | undefined) {
  return (value ?? LOCAL_HOSTS).split(",").map((host) => host.trim()).filter(Boolean);
}

async function requireBearer(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ") || !authorization.slice("Bearer ".length).trim()) {
    res.status(401).header("WWW-Authenticate", oauthChallenge()).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Falta el token de acceso" },
    });
    return;
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (token.startsWith("nisky_oat_")) {
    try {
      if (!(await validateOAuthAccessToken(authorization))) {
        res.status(401).header("WWW-Authenticate", `${oauthChallenge()}, error="invalid_token"`).json({
          ok: false,
          error: { code: "UNAUTHORIZED", message: "El token OAuth es inválido o expiró" },
        });
        return;
      }
    } catch {
      res.status(503).json({ ok: false, error: { code: "AUTH_UNAVAILABLE", message: "No se pudo validar el token OAuth" } });
      return;
    }
  }
  next();
}

const handler = createMcpHandler((ctx) => {
  const auth = ctx.requestInfo?.headers.get("authorization") ?? "";
  const server = new McpServer({ name: "nisky", version: "0.1.0" });
  registerAllTools(server, auth);
  return server;
});
const nodeHandler = toNodeHandler(handler);

const app = createMcpExpressApp({
  allowedHosts: hostList(process.env.MCP_ALLOWED_HOSTS),
  allowedOrigins: hostList(process.env.MCP_ALLOWED_ORIGINS),
  host: HOST,
  jsonLimit: "1mb",
});
app.disable("x-powered-by");
app.get("/.well-known/oauth-protected-resource", oauthProtectedResourceMetadata);
app.all("/mcp", requireBearer, rateLimit, (req, res) => void nodeHandler(req, res, req.body));

app.listen(PORT, HOST, () => console.log(`nisky-mcp listening on ${HOST}:${PORT}`));
