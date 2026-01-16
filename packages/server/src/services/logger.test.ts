import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";

// Mock the @logtape/logtape module
const mockLogger = {
  debug: mock(() => {}),
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockConfigure = mock((_config: any) => Promise.resolve());
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetConsoleSink = mock((_options?: any) => ({}));
const mockGetLogger = mock((_category: string[]) => mockLogger);

mock.module("@logtape/logtape", () => ({
  configure: mockConfigure,
  getConsoleSink: mockGetConsoleSink,
  getLogger: mockGetLogger,
}));

// Import after mocking
import {
  initializeLogging,
  getServerLogger,
  getChromaLogger,
  getRouteLogger,
} from "./logger";

describe("Logger", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockConfigure.mockClear();
    mockGetConsoleSink.mockClear();
    mockGetLogger.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("initializeLogging", () => {
    test("configures LogTape with default log level", async () => {
      await initializeLogging();

      expect(mockConfigure).toHaveBeenCalledTimes(1);
      expect(mockGetConsoleSink).toHaveBeenCalled();
    });

    test("uses LOG_LEVEL environment variable", async () => {
      process.env.LOG_LEVEL = "debug";

      await initializeLogging();

      expect(mockConfigure).toHaveBeenCalled();
      const calls = mockConfigure.mock.calls;
      const configArg = calls[calls.length - 1]?.[0] as {
        loggers: Array<{ lowestLevel: string }>;
      } | undefined;
      expect(configArg?.loggers?.[0]?.lowestLevel).toBe("debug");
    });

    test("configures berry and logtape meta loggers", async () => {
      await initializeLogging();

      const calls = mockConfigure.mock.calls;
      const configArg = calls[calls.length - 1]?.[0] as {
        loggers: Array<{ category: string[] }>;
      } | undefined;
      const categories = configArg?.loggers?.map((l) => l.category);

      expect(categories).toContainEqual(["berry"]);
      expect(categories).toContainEqual(["logtape", "meta"]);
    });
  });

  describe("getServerLogger", () => {
    test("returns logger with server category", () => {
      getServerLogger();

      expect(mockGetLogger).toHaveBeenCalledWith(["berry", "server"]);
    });

    test("includes component in category when provided", () => {
      getServerLogger("error");

      expect(mockGetLogger).toHaveBeenCalledWith(["berry", "server", "error"]);
    });
  });

  describe("getChromaLogger", () => {
    test("returns logger with chromadb category", () => {
      getChromaLogger();

      expect(mockGetLogger).toHaveBeenCalledWith(["berry", "chromadb"]);
    });
  });

  describe("getRouteLogger", () => {
    test("returns logger with routes category", () => {
      getRouteLogger();

      expect(mockGetLogger).toHaveBeenCalledWith(["berry", "routes"]);
    });
  });
});

describe("Log formatter", () => {
  test("formatLogRecord produces valid JSON", async () => {
    // We need to capture the formatter passed to getConsoleSink
    let capturedFormatter: ((record: unknown) => string) | undefined;

    mockGetConsoleSink.mockImplementationOnce(
      (options: { formatter: (record: unknown) => string }) => {
        capturedFormatter = options.formatter;
        return {};
      }
    );

    await initializeLogging();

    expect(capturedFormatter).toBeDefined();

    const testRecord = {
      level: "info",
      category: ["berry", "test"],
      message: ["Test message"],
      timestamp: Date.now(),
      properties: { key: "value" },
    };

    const result = capturedFormatter!(testRecord);
    const parsed = JSON.parse(result);

    expect(parsed.level).toBe("INFO");
    expect(parsed.category).toBe("berry.test");
    expect(parsed.message).toBe("Test message");
    expect(parsed.key).toBe("value");
    expect(parsed.timestamp).toBeDefined();
  });

  test("formatLogRecord handles empty properties", async () => {
    let capturedFormatter: ((record: unknown) => string) | undefined;

    mockGetConsoleSink.mockImplementationOnce(
      (options: { formatter: (record: unknown) => string }) => {
        capturedFormatter = options.formatter;
        return {};
      }
    );

    await initializeLogging();

    const testRecord = {
      level: "debug",
      category: ["berry"],
      message: ["Simple message"],
      timestamp: Date.now(),
      properties: {},
    };

    const result = capturedFormatter!(testRecord);
    const parsed = JSON.parse(result);

    expect(parsed.level).toBe("DEBUG");
    expect(parsed.message).toBe("Simple message");
  });

  test("formatLogRecord concatenates message parts", async () => {
    let capturedFormatter: ((record: unknown) => string) | undefined;

    mockGetConsoleSink.mockImplementationOnce(
      (options: { formatter: (record: unknown) => string }) => {
        capturedFormatter = options.formatter;
        return {};
      }
    );

    await initializeLogging();

    const testRecord = {
      level: "info",
      category: ["berry"],
      message: ["Part 1", " Part 2", " Part 3"],
      timestamp: Date.now(),
      properties: {},
    };

    const result = capturedFormatter!(testRecord);
    const parsed = JSON.parse(result);

    expect(parsed.message).toBe("Part 1 Part 2 Part 3");
  });
});
