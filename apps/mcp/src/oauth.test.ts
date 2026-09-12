import { describe, expect, test } from "bun:test";
import { oauthChallenge, protectedResourceMetadata } from "./oauth";

const env = {
  MCP_PUBLIC_URL: "https://mcp.example.test",
  OAUTH_ISSUER_URL: "https://app.example.test",
  OAUTH_SCOPES: "tasks:read tasks:write",
} as NodeJS.ProcessEnv;

describe("MCP OAuth metadata", () => {
  test("describes the protected resource and authorization server", () => {
    expect(protectedResourceMetadata(env)).toEqual({
      resource: "https://mcp.example.test/mcp",
      authorization_servers: ["https://app.example.test"],
      scopes_supported: ["tasks:read", "tasks:write"],
      bearer_methods_supported: ["header"],
    });
  });

  test("builds the OAuth resource metadata challenge", () => {
    expect(oauthChallenge(env)).toBe('Bearer resource_metadata="https://mcp.example.test/.well-known/oauth-protected-resource", scope="tasks:read tasks:write"');
  });
});
