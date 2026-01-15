import { describe, expect, test, mock, beforeEach } from "bun:test";
import { handleForget, type ForgetInput } from "./forget";

// Mock the api-client module
const mockDeleteMemory = mock(() => Promise.resolve());

mock.module("../services/api-client", () => ({
  getApiClient: () => ({
    deleteMemory: mockDeleteMemory,
  }),
}));

describe("handleForget", () => {
  beforeEach(() => {
    mockDeleteMemory.mockClear();
  });

  test("deletes memory by ID", async () => {
    const input: ForgetInput = {
      id: "mem_123",
    };

    const result = await handleForget(input);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(mockDeleteMemory).toHaveBeenCalledWith("mem_123", undefined);
  });

  test("deletes memory with asEntity for ownership check", async () => {
    const input: ForgetInput = {
      id: "mem_123",
      asEntity: "test-agent",
    };

    await handleForget(input);

    expect(mockDeleteMemory).toHaveBeenCalledWith("mem_123", "test-agent");
  });

  test("returns success message", async () => {
    const input: ForgetInput = {
      id: "mem_123",
    };

    const result = await handleForget(input);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.message).toContain("mem_123");
    expect(parsed.message).toContain("deleted");
  });

  test("returns JSON-formatted response", async () => {
    const input: ForgetInput = {
      id: "mem_123",
    };

    const result = await handleForget(input);

    // Should be valid JSON
    expect(() => JSON.parse(result)).not.toThrow();

    // Should be formatted with indentation
    expect(result).toContain("\n");
  });

  test("propagates API errors", async () => {
    mockDeleteMemory.mockImplementationOnce(() => Promise.reject(new Error("Memory not found")));

    const input: ForgetInput = {
      id: "nonexistent",
    };

    await expect(handleForget(input)).rejects.toThrow("Memory not found");
  });

  test("handles different memory IDs", async () => {
    const ids = ["mem_001", "mem_special_123", "custom-id"];

    for (const id of ids) {
      mockDeleteMemory.mockClear();
      const result = await handleForget({ id });
      const parsed = JSON.parse(result);

      expect(mockDeleteMemory).toHaveBeenCalledWith(id, undefined);
      expect(parsed.message).toContain(id);
    }
  });
});

describe("ForgetInput type", () => {
  test("requires id field", () => {
    const input: ForgetInput = {
      id: "mem_123",
    };

    expect(input.id).toBe("mem_123");
  });
});
