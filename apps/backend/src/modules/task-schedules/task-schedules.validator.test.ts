import { describe, expect, test } from "bun:test";
import {
  reorderTaskSchedulesSchema,
  taskScheduleQuerySchema,
  upsertTaskScheduleSchema,
} from "./task-schedules.validator";

describe("task schedule validators", () => {
  test("requires YYYY-MM-DD query dates", () => {
    expect(taskScheduleQuerySchema.safeParse({ from: "2026-09-01", to: "2026-10-02" }).success).toBe(true);
    expect(taskScheduleQuerySchema.safeParse({ from: "2026-9-1", to: "2026-09-02" }).success).toBe(false);
  });

  test("defaults an unassigned schedule to no time block", () => {
    const result = upsertTaskScheduleSchema.parse({ date: "2026-09-03" });
    expect(result.timeBlockId).toBeNull();
  });

  test("rejects invalid order values when reordering", () => {
    const result = reorderTaskSchedulesSchema.safeParse({
      date: "2026-09-03",
      items: [
        { taskId: "00000000-0000-0000-0000-000000000000", order: -1 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
