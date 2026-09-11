import { describe, expect, test } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { rateLimit } from "./ratelimit";

function invoke(authorization: string) {
  let nextCalled = false;
  let statusCode = 200;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    header() {
      return response;
    },
    json() {
      return response;
    },
  } as unknown as Response;

  rateLimit(
    { headers: { authorization } } as unknown as Request,
    response,
    (() => {
      nextCalled = true;
    }) as NextFunction,
  );

  return { nextCalled, statusCode };
}

describe("MCP rate limit", () => {
  test("uses separate buckets for separate bearer tokens", () => {
    const suffix = crypto.randomUUID();
    const tokenA = `Bearer nisky_pat_rate_limit_a_${suffix}`;
    const tokenB = `Bearer nisky_pat_rate_limit_b_${suffix}`;
    const configuredMax = Math.max(1, Number.parseInt(process.env.RATE_LIMIT_PER_MIN ?? "60", 10) || 60);

    for (let count = 0; count < configuredMax; count += 1) {
      expect(invoke(tokenA).nextCalled).toBe(true);
    }
    expect(invoke(tokenA)).toMatchObject({ nextCalled: false, statusCode: 429 });
    expect(invoke(tokenB)).toMatchObject({ nextCalled: true, statusCode: 200 });
  });
});
