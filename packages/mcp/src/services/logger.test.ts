import { describe, expect, test, beforeEach } from "bun:test";
import { setVerbose, isVerbose } from "./logger";

describe("Logger", () => {
  beforeEach(() => {
    // Reset verbose state before each test
    setVerbose(false);
  });

  describe("setVerbose", () => {
    test("enables verbose mode", () => {
      setVerbose(true);
      expect(isVerbose()).toBe(true);
    });

    test("disables verbose mode", () => {
      setVerbose(true);
      setVerbose(false);
      expect(isVerbose()).toBe(false);
    });
  });

  describe("isVerbose", () => {
    test("returns false by default", () => {
      setVerbose(false);
      expect(isVerbose()).toBe(false);
    });

    test("returns true when enabled", () => {
      setVerbose(true);
      expect(isVerbose()).toBe(true);
    });

    test("toggles correctly", () => {
      expect(isVerbose()).toBe(false);
      setVerbose(true);
      expect(isVerbose()).toBe(true);
      setVerbose(false);
      expect(isVerbose()).toBe(false);
      setVerbose(true);
      expect(isVerbose()).toBe(true);
    });
  });
});

describe("Logger function signatures", () => {
  test("setVerbose accepts boolean", () => {
    expect(() => setVerbose(true)).not.toThrow();
    expect(() => setVerbose(false)).not.toThrow();
  });

  test("isVerbose returns boolean", () => {
    expect(typeof isVerbose()).toBe("boolean");
  });
});
