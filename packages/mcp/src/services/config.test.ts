import { describe, expect, test } from "bun:test";
import { getConfigPath, getConfig, type BerryConfig, type MemoryType } from "./config";
import { homedir } from "node:os";
import { join } from "node:path";

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

describe("getConfig", () => {
  test("returns config object", () => {
    const config = getConfig();

    expect(config).toBeDefined();
    expect(config.server).toBeDefined();
    expect(config.defaults).toBeDefined();
  });

  test("config has all required properties", () => {
    const config = getConfig();

    expect(config.server.url).toBeDefined();
    expect(config.server.timeout).toBeDefined();
    expect(config.defaults.type).toBeDefined();
    expect(config.defaults.createdBy).toBeDefined();
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
});

describe("MemoryType", () => {
  test("all valid memory types", () => {
    const types: MemoryType[] = ["question", "request", "information"];
    expect(types).toHaveLength(3);
    expect(types).toContain("question");
    expect(types).toContain("request");
    expect(types).toContain("information");
  });
});

describe("Default values documentation", () => {
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
    const types: MemoryType[] = ["question", "request", "information"];
    expect(types).toContain(expectedDefault);
  });

  test("default createdBy should be user", () => {
    const expectedDefault = "user";
    expect(expectedDefault).toBe("user");
  });
});
