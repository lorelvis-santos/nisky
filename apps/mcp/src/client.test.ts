import { afterEach, describe, expect, test } from "bun:test";
import { nisky } from "./client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("nisky client", () => {
  test("uses the backend default URL and forwards the bearer token", async () => {
    let requestUrl = "";
    let requestHeaders: Headers | undefined;

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestUrl = String(input);
      requestHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ ok: true, data: { id: "task-1" } }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await nisky("Bearer nisky_pat_test", "/tasks/task-1");

    expect(result.ok).toBe(true);
    expect(requestUrl).toBe("http://localhost:4000/api/v1/tasks/task-1");
    expect(requestHeaders?.get("authorization")).toBe("Bearer nisky_pat_test");
  });

  test("turns upstream network failures into a structured error", async () => {
    globalThis.fetch = (async () => {
      throw new Error("connection refused");
    }) as unknown as typeof fetch;

    await expect(nisky("Bearer nisky_pat_test", "/health")).resolves.toMatchObject({
      status: 502,
      ok: false,
      error: { code: "UPSTREAM_UNAVAILABLE" },
    });
  });

  test("turns upstream timeouts into a gateway timeout", async () => {
    globalThis.fetch = (async () => {
      const error = new Error("timed out");
      error.name = "TimeoutError";
      throw error;
    }) as unknown as typeof fetch;

    await expect(nisky("Bearer nisky_pat_test", "/health")).resolves.toMatchObject({
      status: 504,
      ok: false,
      error: { code: "UPSTREAM_TIMEOUT" },
    });
  });

  test("does not call the upstream without a bearer token", async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response();
    }) as unknown as typeof fetch;

    const result = await nisky("", "/health");

    expect(result).toMatchObject({ status: 401, ok: false, error: { code: "UNAUTHORIZED" } });
    expect(called).toBe(false);
  });
});
