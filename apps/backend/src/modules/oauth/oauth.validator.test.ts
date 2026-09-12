import { describe, expect, test } from "bun:test";
import { authorizeSchema, registrationSchema, tokenSchema } from "./oauth.validator";

const challenge = "a".repeat(43);

describe("OAuth validators", () => {
  test("requires S256 PKCE for authorization", () => {
    const result = authorizeSchema.safeParse({
      client_id: "client",
      response_type: "code",
      redirect_uri: "http://localhost:3000/callback",
      code_challenge: challenge,
      code_challenge_method: "plain",
    });
    expect(result.success).toBe(false);
  });

  test("requires the verifier in authorization-code exchanges", () => {
    const result = tokenSchema.safeParse({
      grant_type: "authorization_code",
      client_id: "client",
      code: "nisky_oac_code",
      redirect_uri: "http://localhost:3000/callback",
    });
    expect(result.success).toBe(false);
  });

  test("allows refresh-token support in dynamic client registration", () => {
    const result = registrationSchema.safeParse({
      client_name: "ChatGPT",
      redirect_uris: ["https://chatgpt.example/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
    expect(result.success).toBe(true);
  });
});
