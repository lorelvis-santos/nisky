import { describe, expect, mock, test } from "bun:test";

type Candidate = {
  id: string;
  tokenHash: string;
  expiresAt: Date | null;
  user: { id: string; email: string; role: "USER"; isActive: boolean };
};

const candidatesByPrefix = new Map<string, Candidate[]>();
const prefixQueries: string[] = [];
const findMany = mock(async ({ where }: { where: { prefix: string } }) => {
  prefixQueries.push(where.prefix);
  return candidatesByPrefix.get(where.prefix) ?? [];
});

mock.module("../../infra/prisma/client", () => ({
  prisma: {
    personalAccessToken: {
      findMany,
      update: mock(async () => undefined),
    },
  },
}));

mock.module("bcrypt", () => ({
  default: {
    compare: mock(async (raw: string, tokenHash: string) => tokenHash === `hash:${raw}`),
  },
}));

const { PatService } = await import("./pat.service");

function candidate(raw: string): Candidate {
  return {
    id: crypto.randomUUID(),
    tokenHash: `hash:${raw}`,
    expiresAt: null,
    user: { id: crypto.randomUUID(), email: "test@nisky.local", role: "USER", isActive: true },
  };
}

describe("PatService.verify", () => {
  test("falls back to the legacy prefix for existing tokens", async () => {
    const raw = "nisky_pat_legacy_token_value";
    candidatesByPrefix.clear();
    prefixQueries.length = 0;
    candidatesByPrefix.set("nisky_pat_", [candidate(raw)]);

    const user = await new PatService().verify(raw);

    expect(prefixQueries).toEqual(["nisky_pat_legacy_t", "nisky_pat_"]);
    expect(user.email).toBe("test@nisky.local");
  });

  test("uses the discriminating prefix for new tokens", async () => {
    const raw = "nisky_pat_abcd1234_new_token_value";
    candidatesByPrefix.clear();
    prefixQueries.length = 0;
    candidatesByPrefix.set("nisky_pat_abcd1234", [candidate(raw)]);

    await new PatService().verify(raw);

    expect(prefixQueries).toEqual(["nisky_pat_abcd1234"]);
  });
});
