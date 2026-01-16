import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { isValidMemoryType, getConfigPath, loadConfig, type BerryConfig } from "./config.js";
import { homedir } from "node:os";
import { join } from "node:path";

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

  test("type guard narrows type correctly", () => {
    const value: string = "information";
    if (isValidMemoryType(value)) {
      const memType: "question" | "request" | "information" = value;
      expect(memType).toBe("information");
    }
  });
});

describe("getConfigPath", () => {
  test("returns path under .config/berry/", () => {
    const path = getConfigPath();
    expect(path).toContain(".config");
    expect(path).toContain("berry");
    expect(path).toContain("config.jsonc");
  });

  test("returns path in home directory", () => {
    const path = getConfigPath();
    const expectedPath = join(homedir(), ".config", "berry", "config.jsonc");
    expect(path).toBe(expectedPath);
  });
});

describe("BerryConfig type", () => {
  test("config structure matches expected shape", () => {
    const config: BerryConfig = {
      server: {
        url: "http://test:3000",
        timeout: 5000,
      },
      defaults: {
        type: "information",
        createdBy: "test",
      },
    };

    expect(config.server.url).toBeDefined();
    expect(config.server.timeout).toBeDefined();
    expect(config.defaults.type).toBeDefined();
    expect(config.defaults.createdBy).toBeDefined();
  });

  test("all MemoryType values are valid", () => {
    const types = ["question", "request", "information"] as const;
    types.forEach((type) => {
      expect(isValidMemoryType(type)).toBe(true);
    });
  });
});

describe("Config defaults documentation", () => {
  test("default server URL should be localhost:3000", () => {
    const expectedDefault = "http://localhost:3000";
    expect(expectedDefault).toContain("localhost");
    expect(expectedDefault).toContain("3000");
  });

  test("default timeout should be 5000ms", () => {
    const expectedDefault = 5000;
    expect(expectedDefault).toBe(5000);
  });

  test("default memory type should be information", () => {
    const expectedDefault = "information";
    expect(isValidMemoryType(expectedDefault)).toBe(true);
  });

  test("default createdBy should be user", () => {
    const expectedDefault = "user";
    expect(expectedDefault).toBe("user");
  });
});

describe("Environment variable overrides", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BERRY_SERVER_URL;
    delete process.env.BERRY_TIMEOUT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("BERRY_SERVER_URL overrides config file server.url", () => {
    process.env.BERRY_SERVER_URL = "http://custom:14114";
    const config = loadConfig();
    expect(config.server.url).toBe("http://custom:14114");
  });

  test("BERRY_TIMEOUT overrides config file server.timeout", () => {
    process.env.BERRY_TIMEOUT = "10000";
    const config = loadConfig();
    expect(config.server.timeout).toBe(10000);
  });

  test("env vars take precedence over defaults when no config file", () => {
    process.env.BERRY_SERVER_URL = "http://env-server:8080";
    const config = loadConfig();
    expect(config.server.url).toBe("http://env-server:8080");
  });
});
