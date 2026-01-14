import { describe, expect, test } from "bun:test";
import type {
  MemoryType,
  Memory,
  MemoryMetadata,
  CreateMemoryRequest,
  SearchMemoriesRequest,
  ApiResponse,
} from "./types";

describe("Type definitions", () => {
  test("MemoryType accepts valid values", () => {
    const types: MemoryType[] = ["question", "request", "information"];
    expect(types).toHaveLength(3);
  });

  test("Memory structure is correct", () => {
    const memory: Memory = {
      id: "mem_123",
      content: "Test content",
      type: "information",
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: "user",
        tags: ["test"],
      },
    };

    expect(memory.id).toBe("mem_123");
    expect(memory.content).toBe("Test content");
    expect(memory.type).toBe("information");
    expect(memory.metadata.createdBy).toBe("user");
  });

  test("MemoryMetadata handles optional fields", () => {
    const minimalMetadata: MemoryMetadata = {
      createdAt: new Date().toISOString(),
    };

    expect(minimalMetadata.createdAt).toBeDefined();
    expect(minimalMetadata.createdBy).toBeUndefined();
    expect(minimalMetadata.tags).toBeUndefined();
  });

  test("CreateMemoryRequest structure is correct", () => {
    const request: CreateMemoryRequest = {
      content: "New memory",
      type: "question",
      metadata: {
        createdBy: "test-user",
        tags: ["important"],
      },
    };

    expect(request.content).toBe("New memory");
    expect(request.type).toBe("question");
    expect(request.metadata?.tags).toContain("important");
  });

  test("SearchMemoriesRequest handles optional fields", () => {
    const minimalSearch: SearchMemoriesRequest = {};
    expect(minimalSearch.query).toBeUndefined();

    const fullSearch: SearchMemoriesRequest = {
      query: "test query",
      limit: 10,
      filters: {
        type: "information",
        tags: ["work"],
        dateRange: {
          from: "2024-01-01",
          to: "2024-12-31",
        },
      },
    };

    expect(fullSearch.query).toBe("test query");
    expect(fullSearch.limit).toBe(10);
    expect(fullSearch.filters?.type).toBe("information");
  });

  test("ApiResponse success structure", () => {
    const successResponse: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: "123" },
    };

    expect(successResponse.success).toBe(true);
    expect(successResponse.data?.id).toBe("123");
    expect(successResponse.error).toBeUndefined();
  });

  test("ApiResponse error structure", () => {
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: "Something went wrong",
    };

    expect(errorResponse.success).toBe(false);
    expect(errorResponse.error).toBe("Something went wrong");
    expect(errorResponse.data).toBeUndefined();
  });
});
