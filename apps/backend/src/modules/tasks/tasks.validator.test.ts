import { describe, expect, test } from "bun:test";
import { taskQuerySchema, updateTaskSchema } from "./tasks.validator";

const userId = "00000000-0000-4000-8000-000000000001";

describe("task update validator", () => {
  test("accepts a partial assignee update", () => {
    expect(updateTaskSchema.safeParse({ assigneeId: userId }).success).toBe(true);
  });

  test("accepts a recurrence update without repeating the existing due date", () => {
    expect(
      updateTaskSchema.safeParse({
        recurrence: { repeatType: "DAILY" },
      }).success,
    ).toBe(true);
  });
});

describe("task query validator", () => {
  test("accepts a due-date range for calendar queries", () => {
    expect(
      taskQuerySchema.safeParse({
        dueFrom: "2026-09-01",
        dueTo: "2026-09-07",
      }).success,
    ).toBe(true);
  });
});
