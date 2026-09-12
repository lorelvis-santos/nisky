import { describe, expect, test } from "bun:test";
import { DateTime } from "luxon";
import { latestUasdPeriod } from "./uasd.period";

describe("latestUasdPeriod", () => {
  test("uses the first academic period from January through June", () => {
    expect(latestUasdPeriod(DateTime.fromISO("2026-06-30"))).toBe("202610");
  });

  test("uses the second academic period from July through December", () => {
    expect(latestUasdPeriod(DateTime.fromISO("2026-07-01"))).toBe("202620");
  });
});
