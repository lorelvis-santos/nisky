import { describe, expect, test } from "bun:test";
import { DateTime } from "luxon";
import { blockOccurrenceOn } from "./timeblocks.util";

const date = DateTime.fromISO("2026-09-03", { zone: "America/Santo_Domingo" }).startOf("day").toJSDate();
const block = {
  id: "block-under-test",
  startMin: 540,
  endMin: 600,
  createdAt: date,
  daysOfWeek: [4],
  repeatEveryWeeks: 1,
  repeatEndsAt: null,
};

describe("block occurrences", () => {
  test("returns the weekly occurrence", () => {
    expect(blockOccurrenceOn(block, date)).toEqual({
      occurs: true,
      startMin: 540,
      endMin: 600,
      exceptionId: null,
    });
  });

  test("applies skip and move exceptions for the selected day", () => {
    expect(blockOccurrenceOn(block, date, [{
      id: "skip",
      blockId: block.id,
      action: "skip",
      startMin: null,
      endMin: null,
      date,
    }])).toEqual({ occurs: false });

    expect(blockOccurrenceOn(block, date, [{
      id: "move",
      blockId: block.id,
      action: "move",
      startMin: 660,
      endMin: 720,
      date,
    }])).toEqual({
      occurs: true,
      startMin: 660,
      endMin: 720,
      exceptionId: "move",
    });
  });

  test("does not occur on a day outside the weekly pattern", () => {
    const nextDay = DateTime.fromJSDate(date, { zone: "America/Santo_Domingo" }).plus({ days: 1 }).toJSDate();
    expect(blockOccurrenceOn(block, nextDay)).toEqual({ occurs: false });
  });
});
