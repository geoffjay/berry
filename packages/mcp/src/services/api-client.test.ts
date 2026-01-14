import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import {
  ApiClientError,
  ApiClient,
  getApiClient,
  type Memory,
  type MemoryType,
  type SearchResult,
} from "./api-client";

// Mock the config module
mock.module("./config", () => ({
  getConfig: () => ({
    server: {
      url: "http://localhost:3000",
      timeout: 5000,
    },
    defaults: {
      type: "information",
      createdBy: "user",
    },
  }),
}));

// Mock the logger module
mock.module("./logger", () => ({
  logRequest: mock(() => {}),
  logResponse: mock(() => {}),
  debug: mock(() => {}),
  error: mock(() => {}),
}));

describe("ApiClientError", () => {
  test("creates error with message only", () => {
    const error = new ApiClientError("Something went wrong");

    expect(error.message).toBe("Something went wrong");
    expect(error.name).toBe("ApiClientError");
    expect(error.statusCode).toBeUndefined();
    expect(error.code).toBeUndefined();
  });

  test("creates error with message and status code", () => {
    const error = new ApiClientError("Not found", 404);

    expect(error.message).toBe("Not found");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBeUndefined();
  });

  test("creates error with all properties", () => {
    const error = new ApiClientError("Connection failed", undefined, "CONNECTION_ERROR");

    expect(error.message).toBe("Connection failed");
    expect(error.statusCode).toBeUndefined();
    expect(error.code).toBe("CONNECTION_ERROR");
  });

  test("is instance of Error", () => {
    const error = new ApiClientError("Test error");

    expect(error instanceof Error).toBe(true);
    expect(error instanceof ApiClientError).toBe(true);
  });

  test("has correct error codes for known errors", () => {
    const timeoutError = new ApiClientError("Request timed out", undefined, "TIMEOUT");
    const connectionError = new ApiClientError("Connection refused", undefined, "CONNECTION_ERROR");

    expect(timeoutError.code).toBe("TIMEOUT");
    expect(connectionError.code).toBe("CONNECTION_ERROR");
  });

  test("preserves stack trace", () => {
    const error = new ApiClientError("Test error");
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("ApiClientError");
  });
});

describe("ApiClient", () => {
  let client: ApiClient;
  let originalFetch: typeof globalThis.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    originalFetch = globalThis.fetch;
    client = new ApiClient();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe("constructor", () => {
    test("uses config server URL by default", () => {
      const client = new ApiClient();
      expect(client).toBeDefined();
    });

    test("respects BERRY_SERVER_URL environment variable", () => {
      process.env.BERRY_SERVER_URL = "http://env-server:4000";
      const client = new ApiClient();
      expect(client).toBeDefined();
    });

    test("respects BERRY_TIMEOUT environment variable", () => {
      process.env.BERRY_TIMEOUT = "10000";
      const client = new ApiClient();
      expect(client).toBeDefined();
    });
  });

  describe("createMemory", () => {
    test("creates memory successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "mem_123",
          content: "Test content",
          type: "information",
          metadata: {
            createdAt: "2024-01-01T00:00:00.000Z",
            createdBy: "user",
            tags: ["test"],
          },
        },
      };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 201,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response)
      );

      const memory = await client.createMemory({
        content: "Test content",
        type: "information",
        tags: ["test"],
      });

      expect(memory.id).toBe("mem_123");
      expect(memory.content).toBe("Test content");
      expect(memory.type).toBe("information");
      expect(memory.tags).toEqual(["test"]);
    });

    test("uses default type when not provided", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "mem_123",
          content: "Test content",
          type: "information",
          metadata: { createdAt: "2024-01-01T00:00:00.000Z" },
        },
      };

      globalThis.fetch = mock((url: string, options: RequestInit) => {
        const body = JSON.parse(options.body as string);
        expect(body.type).toBe("information");
        return Promise.resolve({
          ok: true,
          status: 201,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response);
      });

      await client.createMemory({ content: "Test content" });
    });

    test("throws error on failure response", async () => {
      const mockResponse = {
        success: false,
        error: "Validation failed",
      };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response)
      );

      await expect(client.createMemory({ content: "Test" })).rejects.toThrow("Validation failed");
    });
  });

  describe("getMemory", () => {
    test("retrieves memory by ID", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "mem_123",
          content: "Test content",
          type: "information",
          metadata: {
            createdAt: "2024-01-01T00:00:00.000Z",
            createdBy: "user",
          },
        },
      };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response)
      );

      const memory = await client.getMemory("mem_123");

      expect(memory.id).toBe("mem_123");
      expect(memory.content).toBe("Test content");
    });

    test("encodes ID in URL", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "mem/special&chars",
          content: "Test",
          type: "information",
          metadata: { createdAt: "2024-01-01T00:00:00.000Z" },
        },
      };

      globalThis.fetch = mock((url: string) => {
        expect(url).toContain(encodeURIComponent("mem/special&chars"));
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response);
      });

      await client.getMemory("mem/special&chars");
    });

    test("throws error when memory not found", async () => {
      const mockResponse = { success: false, error: "Memory not found" };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response)
      );

      await expect(client.getMemory("nonexistent")).rejects.toThrow("Memory not found");
    });
  });

  describe("deleteMemory", () => {
    test("deletes memory successfully", async () => {
      const mockResponse = { success: true, data: { id: "mem_123" } };

      globalThis.fetch = mock((url: string, options: RequestInit) => {
        expect(options.method).toBe("DELETE");
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response);
      });

      await expect(client.deleteMemory("mem_123")).resolves.toBeUndefined();
    });

    test("throws error on delete failure", async () => {
      const mockResponse = { success: false, error: "Failed to delete" };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response)
      );

      await expect(client.deleteMemory("mem_123")).rejects.toThrow("Failed to delete");
    });
  });

  describe("searchMemories", () => {
    test("searches with query text", async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: "mem_1",
            content: "Result 1",
            type: "information",
            metadata: { createdAt: "2024-01-01T00:00:00.000Z" },
          },
          {
            id: "mem_2",
            content: "Result 2",
            type: "question",
            metadata: { createdAt: "2024-01-02T00:00:00.000Z" },
          },
        ],
      };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response)
      );

      const results = await client.searchMemories({ query: "test" });

      expect(results).toHaveLength(2);
      expect(results[0].memory.id).toBe("mem_1");
      expect(results[0].score).toBe(1);
      expect(results[1].score).toBe(0.9);
    });

    test("includes type filter in request", async () => {
      const mockResponse = { success: true, data: [] };

      globalThis.fetch = mock((url: string, options: RequestInit) => {
        const body = JSON.parse(options.body as string);
        expect(body.filters.type).toBe("question");
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response);
      });

      await client.searchMemories({ query: "test", type: "question" });
    });

    test("includes tags filter in request", async () => {
      const mockResponse = { success: true, data: [] };

      globalThis.fetch = mock((url: string, options: RequestInit) => {
        const body = JSON.parse(options.body as string);
        expect(body.filters.tags).toEqual(["important", "work"]);
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response);
      });

      await client.searchMemories({ query: "test", tags: ["important", "work"] });
    });

    test("includes date range filter in request", async () => {
      const mockResponse = { success: true, data: [] };

      globalThis.fetch = mock((url: string, options: RequestInit) => {
        const body = JSON.parse(options.body as string);
        expect(body.filters.dateRange).toEqual({
          from: "2024-01-01",
          to: "2024-12-31",
        });
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response);
      });

      await client.searchMemories({
        query: "test",
        from: "2024-01-01",
        to: "2024-12-31",
      });
    });

    test("throws error on search failure", async () => {
      const mockResponse = { success: false, error: "Search failed" };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response)
      );

      await expect(client.searchMemories({ query: "test" })).rejects.toThrow("Search failed");
    });
  });

  describe("HTTP error handling", () => {
    test("handles HTTP 404 error", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ message: "Resource not found" }),
        } as Response)
      );

      await expect(client.getMemory("nonexistent")).rejects.toThrow("Resource not found");
    });

    test("handles HTTP 500 error", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.reject(new Error("Invalid JSON")),
        } as Response)
      );

      await expect(client.getMemory("mem_123")).rejects.toThrow("HTTP 500");
    });

    test("handles network errors", async () => {
      const networkError = new Error("fetch failed");
      globalThis.fetch = mock(() => Promise.reject(networkError));

      await expect(client.getMemory("mem_123")).rejects.toThrow("Failed to connect to server");
    });

    test("handles connection refused", async () => {
      const connError = new Error("ECONNREFUSED");
      globalThis.fetch = mock(() => Promise.reject(connError));

      await expect(client.getMemory("mem_123")).rejects.toThrow("Failed to connect to server");
    });

    test("handles timeout", async () => {
      const abortError = new Error("");
      abortError.name = "AbortError";
      globalThis.fetch = mock(() => Promise.reject(abortError));

      await expect(client.getMemory("mem_123")).rejects.toThrow("timed out");
    });
  });

  describe("transformMemory", () => {
    test("handles missing optional metadata fields", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "mem_123",
          content: "Test",
          type: "information",
          metadata: {
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        },
      };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response)
      );

      const memory = await client.getMemory("mem_123");

      expect(memory.tags).toEqual([]);
      expect(memory.createdBy).toBe("unknown");
      expect(memory.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    test("uses respondedAt as updatedAt when available", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "mem_123",
          content: "Test",
          type: "question",
          metadata: {
            createdAt: "2024-01-01T00:00:00.000Z",
            respondedAt: "2024-01-02T00:00:00.000Z",
          },
        },
      };

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
        } as Response)
      );

      const memory = await client.getMemory("mem_123");
      expect(memory.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });
  });
});

describe("getApiClient function", () => {
  test("is exported and callable", () => {
    expect(typeof getApiClient).toBe("function");
  });
});

describe("Type definitions", () => {
  test("Memory interface has required fields", () => {
    const memory: Memory = {
      id: "mem_123",
      content: "Test content",
      type: "information",
      tags: ["test"],
      createdBy: "user",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    expect(memory.id).toBeDefined();
    expect(memory.content).toBeDefined();
    expect(memory.type).toBeDefined();
    expect(Array.isArray(memory.tags)).toBe(true);
  });

  test("SearchResult has memory and score", () => {
    const searchResult: SearchResult = {
      memory: {
        id: "mem_123",
        content: "Test",
        type: "information",
        tags: [],
        createdBy: "user",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      score: 0.95,
    };

    expect(searchResult.memory).toBeDefined();
    expect(searchResult.score).toBeGreaterThan(0);
    expect(searchResult.score).toBeLessThanOrEqual(1);
  });

  test("MemoryType accepts valid values", () => {
    const types: MemoryType[] = ["question", "request", "information"];
    expect(types).toHaveLength(3);
  });
});
