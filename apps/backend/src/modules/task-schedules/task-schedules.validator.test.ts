import { describe, expect, test } from "bun:test";
import { taskScheduleQuerySchema, upsertTaskScheduleSchema } from "./task-schedules.validator";

describe("task schedule validators", () => {
  test("requires YYYY-MM-DD query dates", () => {
    expect(taskScheduleQuerySchema.safeParse({ from: "2026-09-01", to: "2026-10-02" }).success).toBe(true);
    expect(taskScheduleQuerySchema.safeParse({ from: "2026-9-1", to: "2026-09-02" }).success).toBe(false);
  });

  test("requires a time block", () => {
    expect(upsertTaskScheduleSchema.safeParse({ date: "2026-09-03" }).success).toBe(false);
    const result = upsertTaskScheduleSchema.parse({
      date: "2026-09-03",
      timeBlockId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.timeBlockId).toBe("00000000-0000-0000-0000-000000000000");
  });
});
