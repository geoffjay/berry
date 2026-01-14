import { describe, expect, test, mock, beforeEach } from "bun:test";
import { handleRecall, type RecallInput } from "./recall";

// Mock the api-client module
const mockGetMemory = mock(() =>
  Promise.resolve({
    id: "mem_123",
    content: "Test content",
    type: "information",
    tags: ["test"],
    createdBy: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  })
);

mock.module("../services/api-client", () => ({
  getApiClient: () => ({
    getMemory: mockGetMemory,
  }),
}));

describe("handleRecall", () => {
  beforeEach(() => {
    mockGetMemory.mockClear();
  });

  test("retrieves memory by ID", async () => {
    const input: RecallInput = {
      id: "mem_123",
    };

    const result = await handleRecall(input);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.memory.id).toBe("mem_123");
    expect(mockGetMemory).toHaveBeenCalledWith("mem_123");
  });

  test("returns JSON-formatted response", async () => {
    const input: RecallInput = {
      id: "mem_123",
    };

    const result = await handleRecall(input);

    // Should be valid JSON
    expect(() => JSON.parse(result)).not.toThrow();

    // Should be formatted with indentation
    expect(result).toContain("\n");
  });

  test("includes all memory details in response", async () => {
    const input: RecallInput = {
      id: "mem_123",
    };

    const result = await handleRecall(input);
    const parsed = JSON.parse(result);

    expect(parsed.memory).toBeDefined();
    expect(parsed.memory.id).toBe("mem_123");
    expect(parsed.memory.content).toBe("Test content");
    expect(parsed.memory.type).toBe("information");
    expect(parsed.memory.tags).toEqual(["test"]);
    expect(parsed.memory.createdBy).toBe("user");
    expect(parsed.memory.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(parsed.memory.updatedAt).toBe("2024-01-02T00:00:00.000Z");
  });

  test("propagates API errors", async () => {
    mockGetMemory.mockImplementationOnce(() => Promise.reject(new Error("Memory not found")));

    const input: RecallInput = {
      id: "nonexistent",
    };

    await expect(handleRecall(input)).rejects.toThrow("Memory not found");
  });

  test("handles different memory IDs", async () => {
    const ids = ["mem_001", "mem_special_chars_123", "custom-id"];

    for (const id of ids) {
      mockGetMemory.mockClear();
      await handleRecall({ id });
      expect(mockGetMemory).toHaveBeenCalledWith(id);
    }
  });
});

describe("RecallInput type", () => {
  test("requires id field", () => {
    const input: RecallInput = {
      id: "mem_123",
    };

    expect(input.id).toBe("mem_123");
  });
});
