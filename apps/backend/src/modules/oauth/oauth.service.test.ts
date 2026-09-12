import { describe, expect, test } from "bun:test";
import { hashPkce, OAuthService } from "./oauth.service";

describe("OAuthService", () => {
  test("creates the RFC 7636 S256 challenge", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(hashPkce(verifier)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  test("recognizes only Nisky OAuth access-token prefixes", () => {
    const service = new OAuthService();
    expect(service.isAccessToken("nisky_oat_value")).toBe(true);
    expect(service.isAccessToken("nisky_ort_value")).toBe(false);
  });

  test("does not allow local client metadata documents", async () => {
    const { isSafeClientMetadataUrl } = await import("./oauth.config");
    expect(isSafeClientMetadataUrl("http://localhost:3000/client.json")).toBe(false);
    expect(isSafeClientMetadataUrl("https://127.0.0.1/client.json")).toBe(false);
    expect(isSafeClientMetadataUrl("https://client.example.test/metadata.json")).toBe(true);
  });

  test("allows ChatGPT's stable connector callback only for ChatGPT CIMD clients", async () => {
    const { isRegisteredRedirectUri } = await import("./oauth.config");
    const stableCallback = "https://chatgpt.com/connector_platform_oauth_redirect";
    expect(isRegisteredRedirectUri("https://chatgpt.com/oauth/client.json", [], stableCallback)).toBe(true);
    expect(isRegisteredRedirectUri("https://chatgpt.com/oauth/example/client.json", [], stableCallback)).toBe(true);
    expect(isRegisteredRedirectUri("https://example.com/client.json", [], stableCallback)).toBe(false);
    expect(isRegisteredRedirectUri("https://chatgpt.com/oauth/example/client.json", ["https://example.com/callback"], stableCallback)).toBe(true);
  });
});
