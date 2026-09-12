export function oauthSettings(env: NodeJS.ProcessEnv = process.env) {
  const publicUrl = (env.MCP_PUBLIC_URL ?? "http://localhost:8787").replace(/\/+$/, "");
  const issuer = (env.OAUTH_ISSUER_URL ?? env.OAUTH_ISSUER ?? "http://localhost:4000").replace(/\/+$/, "");
  const scopes = (env.OAUTH_SCOPES ?? "profile email tasks:read tasks:write projects:read projects:write notes:read notes:write timeblocks:read timeblocks:write")
    .split(/[\s,]+/)
    .filter(Boolean);
  return { publicUrl, issuer, resource: `${publicUrl}/mcp`, scopes };
}

export function protectedResourceMetadata(env: NodeJS.ProcessEnv = process.env) {
  const settings = oauthSettings(env);
  return {
    resource: settings.resource,
    authorization_servers: [settings.issuer],
    scopes_supported: settings.scopes,
    bearer_methods_supported: ["header"],
  };
}

export function oauthChallenge(env: NodeJS.ProcessEnv = process.env) {
  const settings = oauthSettings(env);
  return `Bearer resource_metadata="${settings.publicUrl}/.well-known/oauth-protected-resource", scope="${settings.scopes.join(" ")}"`;
}
