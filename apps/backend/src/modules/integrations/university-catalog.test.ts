import { describe, expect, test } from "bun:test";
import { universityNameFor } from "./university-catalog";

describe("university catalog", () => {
  test("recognizes UTECO URLs by host", () => {
    expect(universityNameFor("https://campusvirtual.uteco.edu.do/user/managetoken.php")).toBe("UTECO");
  });
});
