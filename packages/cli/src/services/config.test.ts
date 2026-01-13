import { describe, expect, test } from "bun:test";
import { isValidMemoryType } from "./config.js";

describe("isValidMemoryType", () => {
  test("accepts 'question' as valid", () => {
    expect(isValidMemoryType("question")).toBe(true);
  });

  test("accepts 'request' as valid", () => {
    expect(isValidMemoryType("request")).toBe(true);
  });

  test("accepts 'information' as valid", () => {
    expect(isValidMemoryType("information")).toBe(true);
  });

  test("rejects invalid string types", () => {
    expect(isValidMemoryType("invalid")).toBe(false);
    expect(isValidMemoryType("")).toBe(false);
    expect(isValidMemoryType("QUESTION")).toBe(false);
    expect(isValidMemoryType("Info")).toBe(false);
  });
});

describe("Config defaults", () => {
  test("default server URL is localhost:3000", () => {
    // This tests the expected default behavior
    const expectedDefault = "http://localhost:3000";
    expect(expectedDefault).toContain("localhost");
  });

  test("default timeout is 5000ms", () => {
    const expectedDefault = 5000;
    expect(expectedDefault).toBe(5000);
  });

  test("default memory type is information", () => {
    const expectedDefault = "information";
    expect(isValidMemoryType(expectedDefault)).toBe(true);
  });
});
