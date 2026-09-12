import bcrypt from "bcrypt";
import { createHash, createPublicKey, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "../../infra/prisma/client";
import { isSafeClientMetadataUrl, isSafeRegistrationRedirect, oauthConfig } from "./oauth.config";
import { registrationSchema, type AuthorizeRequest, type RegistrationRequest, type RevocationRequest, type TokenRequest } from "./oauth.validator";

const CLIENT_PREFIX = "nisky_client_";
const CODE_PREFIX = "nisky_oac_";
const ACCESS_PREFIX = "nisky_oat_";
const REFRESH_PREFIX = "nisky_ort_";
type RsaJwk = { kty: "RSA"; n: string; e: string; [key: string]: unknown };

export class OAuthError extends Error {
  constructor(
    readonly error: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

function splitScopes(value: string | undefined) {
  return [...new Set((value ?? "").split(/\s+/).map((item) => item.trim()).filter(Boolean))];
}

function newOpaque(prefix: string) {
  const id = randomUUID();
  return { id, raw: `${prefix}${id}.${randomBytes(48).toString("base64url")}` };
}

function opaqueId(raw: string, prefix: string) {
  if (!raw.startsWith(prefix)) return undefined;
  const [id] = raw.slice(prefix.length).split(".", 1);
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : undefined;
}

function hashPkce(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function sameString(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function oauthDate(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

export class OAuthService {
  isAccessToken(raw: string) {
    return raw.startsWith(ACCESS_PREFIX);
  }

  private async client(clientId: string) {
    let client = await prisma.oAuthClient.findUnique({ where: { clientId } });
    if (!client && isSafeClientMetadataUrl(clientId)) {
      client = await this.importClientMetadata(clientId);
    }
    if (!client || !client.isActive) throw new OAuthError("invalid_client", "Cliente OAuth inválido", 401);
    if (!["none", "private_key_jwt"].includes(client.tokenEndpointAuthMethod)) throw new OAuthError("invalid_client", "Método de autenticación de cliente no soportado", 401);
    return client;
  }

  private async importClientMetadata(clientId: string) {
    let metadata: unknown;
    try {
      const response = await fetch(clientId, { redirect: "error", signal: AbortSignal.timeout(5_000) });
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("application/json")) return null;
      metadata = await response.json();
    } catch {
      return null;
    }

    if (!metadata || typeof metadata !== "object" || (metadata as { client_id?: unknown }).client_id !== clientId) return null;
    const candidate = metadata as Record<string, unknown>;
    const parsed = registrationSchema.safeParse({
      client_name: typeof candidate.client_name === "string" ? candidate.client_name : clientId,
      redirect_uris: candidate.redirect_uris,
      scope: candidate.scope,
      grant_types: candidate.grant_types,
      response_types: candidate.response_types,
      token_endpoint_auth_method: candidate.token_endpoint_auth_method,
      token_endpoint_auth_signing_alg: candidate.token_endpoint_auth_signing_alg,
      jwks_uri: candidate.jwks_uri,
    });
    if (!parsed.success || parsed.data.redirect_uris.some((uri) => !isSafeRegistrationRedirect(uri))) return null;

    const config = oauthConfig();
    const scopes = splitScopes(parsed.data.scope || config.scopes.join(" "));
    if (scopes.length === 0 || scopes.some((scope) => !config.scopes.includes(scope))) return null;
    return prisma.oAuthClient.create({
      data: {
        clientId,
        name: parsed.data.client_name,
        redirectUris: parsed.data.redirect_uris,
        allowedScopes: scopes,
        tokenEndpointAuthMethod: parsed.data.token_endpoint_auth_method ?? "none",
        jwksUri: parsed.data.jwks_uri,
        tokenEndpointAuthSigningAlg: parsed.data.token_endpoint_auth_signing_alg,
      },
    });
  }

  private scopesFor(client: { allowedScopes: string[] }, requested: string | undefined) {
    const scopes = splitScopes(requested || client.allowedScopes.join(" "));
    if (scopes.length === 0 || scopes.some((item) => !client.allowedScopes.includes(item))) {
      throw new OAuthError("invalid_scope", "El cliente solicitó scopes no permitidos");
    }
    return scopes;
  }

  private resourceFor(requested: string | undefined) {
    const resource = oauthConfig().resource;
    if (requested && requested !== resource) throw new OAuthError("invalid_target", "El resource no es compatible con este servidor");
    return resource;
  }

  private async authorizationContext(request: AuthorizeRequest) {
    const client = await this.client(request.client_id);
    if (!client.redirectUris.includes(request.redirect_uri)) {
      throw new OAuthError("invalid_request", "redirect_uri no registrado");
    }
    return { client, scopes: this.scopesFor(client, request.scope), resource: this.resourceFor(request.resource) };
  }

  async registration(request: RegistrationRequest) {
    if (request.grant_types?.some((grant) => !["authorization_code", "refresh_token"].includes(grant)) || request.response_types?.some((type) => type !== "code")) {
      throw new OAuthError("invalid_client_metadata", "Solo se soporta Authorization Code");
    }
    if (request.redirect_uris.some((uri) => !isSafeRegistrationRedirect(uri))) {
      throw new OAuthError("invalid_redirect_uri", "redirect_uris debe usar HTTPS; HTTP solo se permite para localhost en desarrollo");
    }

    const config = oauthConfig();
    const requestedScopes = splitScopes(request.scope || config.scopes.join(" "));
    if (requestedScopes.length === 0 || requestedScopes.some((item) => !config.scopes.includes(item))) {
      throw new OAuthError("invalid_client_metadata", "scope contiene valores no soportados");
    }
    const tokenEndpointAuthMethod = request.token_endpoint_auth_method ?? "none";
    if (tokenEndpointAuthMethod === "private_key_jwt" && !request.jwks_uri) {
      throw new OAuthError("invalid_client_metadata", "private_key_jwt requiere jwks_uri");
    }
    if (request.jwks_uri && !isSafeClientMetadataUrl(request.jwks_uri)) {
      throw new OAuthError("invalid_client_metadata", "jwks_uri debe ser una URL HTTPS pública");
    }

    const client = await prisma.oAuthClient.create({
      data: {
        clientId: `${CLIENT_PREFIX}${randomBytes(24).toString("base64url")}`,
        name: request.client_name,
        redirectUris: request.redirect_uris,
        allowedScopes: requestedScopes,
        tokenEndpointAuthMethod,
        jwksUri: request.jwks_uri,
        tokenEndpointAuthSigningAlg: request.token_endpoint_auth_signing_alg,
      },
    });
    return {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.name,
      redirect_uris: client.redirectUris,
       grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
       token_endpoint_auth_method: client.tokenEndpointAuthMethod,
       ...(client.jwksUri ? { jwks_uri: client.jwksUri } : {}),
       ...(client.tokenEndpointAuthSigningAlg ? { token_endpoint_auth_signing_alg: client.tokenEndpointAuthSigningAlg } : {}),
      scope: client.allowedScopes.join(" "),
    };
  }

  async consent(request: AuthorizeRequest, user: { id: string; email: string; role: "ADMIN" | "USER" }) {
    const { client, scopes, resource } = await this.authorizationContext(request);
    return {
      client: { client_id: client.clientId, name: client.name, redirect_uri: request.redirect_uri },
      user: { id: user.id, email: user.email, role: user.role },
      request: {
        client_id: client.clientId,
        response_type: request.response_type,
        redirect_uri: request.redirect_uri,
        scope: scopes.join(" "),
        scopes,
        state: request.state ?? null,
        code_challenge: request.code_challenge,
        code_challenge_method: "S256",
        resource,
      },
      consent_required: true,
    };
  }

  async decide(request: AuthorizeRequest, userId: string, decision: "approve" | "deny") {
    const { client, scopes, resource } = await this.authorizationContext(request);
    if (decision === "deny") {
      return { error: "access_denied", error_description: "El usuario rechazó la autorización", state: request.state ?? null };
    }

    const code = newOpaque(CODE_PREFIX);
    await prisma.oAuthAuthorizationCode.create({
      data: {
        id: code.id,
        codeHash: await bcrypt.hash(code.raw, 12),
        clientId: client.id,
        userId,
        redirectUri: request.redirect_uri,
        scope: scopes.join(" "),
        codeChallenge: request.code_challenge,
        codeChallengeMethod: "S256",
        resource,
        expiresAt: oauthDate(oauthConfig().authorizationCodeTtlSeconds),
      },
    });
    return { redirect_uri: request.redirect_uri, code: code.raw, state: request.state ?? null, expires_in: oauthConfig().authorizationCodeTtlSeconds };
  }

  private async issuePair(clientId: string, userId: string, scope: string, resource: string, familyId: string = randomUUID()) {
    const config = oauthConfig();
    const access = newOpaque(ACCESS_PREFIX);
    const refresh = newOpaque(REFRESH_PREFIX);
    const accessExpiresAt = oauthDate(config.accessTokenTtlSeconds);
    const refreshExpiresAt = oauthDate(config.refreshTokenTtlSeconds);
    const common = { familyId, clientId, userId, scope, audience: [resource], resource, issuer: config.issuer };

    await prisma.$transaction([
      prisma.oAuthAccessToken.create({ data: { id: access.id, tokenHash: await bcrypt.hash(access.raw, 12), ...common, expiresAt: accessExpiresAt } }),
      prisma.oAuthRefreshToken.create({ data: { id: refresh.id, tokenHash: await bcrypt.hash(refresh.raw, 12), ...common, expiresAt: refreshExpiresAt } }),
    ]);
    return {
      access_token: access.raw,
      token_type: "Bearer",
      expires_in: config.accessTokenTtlSeconds,
      refresh_token: refresh.raw,
      scope,
    };
  }

  private async authenticateClient(client: {
    id: string;
    clientId: string;
    tokenEndpointAuthMethod: string;
    jwksUri: string | null;
    tokenEndpointAuthSigningAlg: string | null;
  }, request: TokenRequest) {
    if (client.tokenEndpointAuthMethod === "none") return;
    if (client.tokenEndpointAuthMethod !== "private_key_jwt" || client.tokenEndpointAuthSigningAlg !== "RS256" || !client.jwksUri) {
      throw new OAuthError("invalid_client", "Configuración de autenticación de cliente inválida", 401);
    }
    if (request.client_assertion_type !== "urn:ietf:params:oauth:client-assertion-type:jwt-bearer" || !request.client_assertion) {
      throw new OAuthError("invalid_client", "Se requiere client_assertion para este cliente", 401);
    }

    const decoded = jwt.decode(request.client_assertion, { complete: true });
    if (!decoded || typeof decoded === "string" || decoded.header.alg !== "RS256" || !decoded.header.kid) {
      throw new OAuthError("invalid_client", "client_assertion inválido", 401);
    }

    let jwks: unknown;
    try {
      const response = await fetch(client.jwksUri, { redirect: "error", signal: AbortSignal.timeout(5_000) });
      if (!response.ok) throw new Error("JWKS request failed");
      jwks = await response.json();
    } catch {
      throw new OAuthError("invalid_client", "No se pudo obtener el JWKS del cliente", 401);
    }
    const keys = jwks && typeof jwks === "object" && Array.isArray((jwks as { keys?: unknown }).keys)
      ? (jwks as { keys: Array<Record<string, unknown>> }).keys
      : [];
    const jwk = keys.find((key) => key.kid === decoded.header.kid && key.kty === "RSA" && key.use !== "enc");
    if (!jwk) throw new OAuthError("invalid_client", "No se encontró la clave del cliente", 401);

    let payload: JwtPayload;
    try {
      payload = jwt.verify(
        request.client_assertion,
        createPublicKey({ key: jwk as RsaJwk, format: "jwk" }),
        { algorithms: ["RS256"], audience: [`${oauthConfig().issuer}/oauth/token`, oauthConfig().issuer] },
      ) as JwtPayload;
    } catch {
      throw new OAuthError("invalid_client", "Firma o claims de client_assertion inválidos", 401);
    }
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload !== "object" || payload.iss !== client.clientId || payload.sub !== client.clientId || typeof payload.exp !== "number" || payload.exp <= now || payload.exp > now + 600 || typeof payload.jti !== "string" || payload.jti.length > 200) {
      throw new OAuthError("invalid_client", "Claims de client_assertion inválidos", 401);
    }
    const used = await prisma.oAuthClientAssertion.findUnique({ where: { jti: payload.jti } });
    if (used) throw new OAuthError("invalid_client", "client_assertion ya utilizado", 401);
    try {
      await prisma.oAuthClientAssertion.create({ data: { clientId: client.id, jti: payload.jti, expiresAt: new Date(payload.exp * 1000) } });
    } catch {
      throw new OAuthError("invalid_client", "client_assertion ya utilizado", 401);
    }
  }

  async token(request: TokenRequest) {
    const client = await this.client(request.client_id);
    await this.authenticateClient(client, request);
    if (request.grant_type === "authorization_code") {
      const codeId = opaqueId(request.code as string, CODE_PREFIX);
      if (!codeId) throw new OAuthError("invalid_grant", "Código de autorización inválido");
      const code = await prisma.oAuthAuthorizationCode.findUnique({ where: { id: codeId } });
      if (!code || code.clientId !== client.id || code.redirectUri !== request.redirect_uri || code.expiresAt <= new Date() || code.consumedAt) {
        throw new OAuthError("invalid_grant", "Código de autorización inválido o expirado");
      }
      if (!(await bcrypt.compare(request.code as string, code.codeHash)) || !sameString(hashPkce(request.code_verifier as string), code.codeChallenge)) {
        throw new OAuthError("invalid_grant", "Código de autorización o code_verifier inválido");
      }
      const consumed = await prisma.oAuthAuthorizationCode.updateMany({ where: { id: code.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) throw new OAuthError("invalid_grant", "Código de autorización ya utilizado");
      return this.issuePair(client.id, code.userId, code.scope, code.resource);
    }

    const refreshId = opaqueId(request.refresh_token as string, REFRESH_PREFIX);
    if (!refreshId) throw new OAuthError("invalid_grant", "Refresh token inválido");
    const stored = await prisma.oAuthRefreshToken.findUnique({ where: { id: refreshId } });
    if (!stored || stored.clientId !== client.id || !(await bcrypt.compare(request.refresh_token as string, stored.tokenHash))) {
      throw new OAuthError("invalid_grant", "Refresh token inválido");
    }
    if (stored.revokedAt || stored.expiresAt <= new Date()) {
      await this.revokeFamily(stored.familyId);
      throw new OAuthError("invalid_grant", "Refresh token revocado o expirado");
    }
    const requestedScopes = splitScopes(request.scope || stored.scope);
    if (requestedScopes.some((item) => !splitScopes(stored.scope).includes(item))) throw new OAuthError("invalid_scope", "No se puede ampliar el scope");
    const revoked = await prisma.oAuthRefreshToken.updateMany({ where: { id: stored.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() } });
    if (revoked.count !== 1) {
      await this.revokeFamily(stored.familyId);
      throw new OAuthError("invalid_grant", "Refresh token ya utilizado");
    }
    const result = await this.issuePair(client.id, stored.userId, requestedScopes.join(" "), stored.resource, stored.familyId);
    const replacementId = opaqueId(result.refresh_token, REFRESH_PREFIX);
    if (replacementId) await prisma.oAuthRefreshToken.update({ where: { id: stored.id }, data: { replacedById: replacementId } });
    return result;
  }

  private async revokeFamily(familyId: string) {
    const now = new Date();
    await prisma.$transaction([
      prisma.oAuthRefreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: now } }),
      prisma.oAuthAccessToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: now } }),
    ]);
  }

  async revoke(request: RevocationRequest) {
    const client = await this.client(request.client_id);
    const refreshId = opaqueId(request.token, REFRESH_PREFIX);
    if (refreshId) {
      const token = await prisma.oAuthRefreshToken.findUnique({ where: { id: refreshId } });
      if (token && token.clientId === client.id && await bcrypt.compare(request.token, token.tokenHash)) await this.revokeFamily(token.familyId);
      return { success: true };
    }
    const accessId = opaqueId(request.token, ACCESS_PREFIX);
    if (accessId) {
      const token = await prisma.oAuthAccessToken.findUnique({ where: { id: accessId } });
      if (token && token.clientId === client.id && await bcrypt.compare(request.token, token.tokenHash)) await prisma.oAuthAccessToken.updateMany({ where: { id: token.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return { success: true };
  }

  async verifyAccessToken(raw: string, expectedResource = oauthConfig().resource) {
    const id = opaqueId(raw, ACCESS_PREFIX);
    if (!id) throw new OAuthError("invalid_token", "Token OAuth inválido", 401);
    const token = await prisma.oAuthAccessToken.findUnique({ where: { id }, include: { user: true } });
    const config = oauthConfig();
    if (!token || !(await bcrypt.compare(raw, token.tokenHash))) throw new OAuthError("invalid_token", "Token OAuth inválido", 401);
    if (token.revokedAt || token.expiresAt <= new Date()) throw new OAuthError("invalid_token", "Token OAuth expirado o revocado", 401);
    if (token.issuer !== config.issuer || token.resource !== expectedResource || !token.audience.includes(expectedResource)) throw new OAuthError("invalid_token", "Audiencia o issuer inválido", 401);
    if (!token.user.isActive) throw new OAuthError("invalid_token", "La cuenta está deshabilitada", 401);
    return { user: token.user, scopes: splitScopes(token.scope), issuer: token.issuer, audience: token.audience, resource: token.resource };
  }
}

export const oauthService = new OAuthService();
export { hashPkce };
