import { describe, expect, test } from "bun:test";
import { createTaskReferenceSchema, reorderTaskReferencesSchema, taskQuerySchema, updateTaskSchema } from "./tasks.validator";

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

describe("task reference validator", () => {
  test("accepts http and https references with an optional title", () => {
    expect(createTaskReferenceSchema.safeParse({ title: "Guía", url: "https://example.com/guide" }).success).toBe(true);
    expect(createTaskReferenceSchema.safeParse({ url: "http://example.com" }).success).toBe(true);
  });

  test("rejects non-web URLs and incomplete reorder payloads", () => {
    expect(createTaskReferenceSchema.safeParse({ url: "javascript:alert(1)" }).success).toBe(false);
    expect(reorderTaskReferencesSchema.safeParse({ items: [{ id: userId, order: -1 }] }).success).toBe(false);
  });
});
