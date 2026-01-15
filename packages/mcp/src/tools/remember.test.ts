import { describe, expect, test, mock, beforeEach } from "bun:test";
import { handleRemember, type RememberInput } from "./remember";

// Mock the api-client module
const mockCreateMemory = mock(() =>
  Promise.resolve({
    id: "mem_123",
    content: "Test content",
    type: "information",
    tags: ["test"],
    createdBy: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  })
);

mock.module("../services/api-client", () => ({
  getApiClient: () => ({
    createMemory: mockCreateMemory,
  }),
}));

describe("handleRemember", () => {
  beforeEach(() => {
    mockCreateMemory.mockClear();
  });

  test("creates memory with minimal input", async () => {
    const input: RememberInput = {
      content: "Test memory content",
      createdBy: "test-agent",
    };

    const result = await handleRemember(input);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.memory.id).toBe("mem_123");
    expect(parsed.memory.content).toBe("Test content");
  });

  test("creates memory with all optional fields", async () => {
    const input: RememberInput = {
      content: "Test memory content",
      type: "question",
      tags: ["important", "work"],
      createdBy: "test-user",
      visibility: "shared",
      sharedWith: ["other-agent"],
    };

    const result = await handleRemember(input);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(mockCreateMemory).toHaveBeenCalledWith({
      content: "Test memory content",
      type: "question",
      tags: ["important", "work"],
      createdBy: "test-user",
      visibility: "shared",
      sharedWith: ["other-agent"],
    });
  });

  test("returns JSON-formatted response", async () => {
    const input: RememberInput = {
      content: "Test content",
      createdBy: "test-agent",
    };

    const result = await handleRemember(input);

    // Should be valid JSON
    expect(() => JSON.parse(result)).not.toThrow();

    // Should be formatted with indentation
    expect(result).toContain("\n");
  });

  test("includes memory details in response", async () => {
    const input: RememberInput = {
      content: "Test content",
      createdBy: "test-agent",
    };

    const result = await handleRemember(input);
    const parsed = JSON.parse(result);

    expect(parsed.memory).toBeDefined();
    expect(parsed.memory.id).toBeDefined();
    expect(parsed.memory.content).toBeDefined();
    expect(parsed.memory.type).toBeDefined();
    expect(parsed.memory.tags).toBeDefined();
    expect(parsed.memory.createdBy).toBeDefined();
    expect(parsed.memory.createdAt).toBeDefined();
  });

  test("rejects when createdBy is missing", async () => {
    const input = {
      content: "Test content",
      createdBy: "",
    } as RememberInput;

    const result = await handleRemember(input);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("createdBy is required");
  });

  test("propagates API errors", async () => {
    mockCreateMemory.mockImplementationOnce(() => Promise.reject(new Error("API error")));

    const input: RememberInput = {
      content: "Test content",
      createdBy: "test-agent",
    };

    await expect(handleRemember(input)).rejects.toThrow("API error");
  });
});

describe("RememberInput type", () => {
  test("accepts all valid memory types", () => {
    const types = ["question", "request", "information"] as const;

    types.forEach((type) => {
      const input: RememberInput = {
        content: "Test",
        createdBy: "test-agent",
        type,
      };
      expect(input.type).toBe(type);
    });
  });

  test("allows optional fields to be undefined", () => {
    const input: RememberInput = {
      content: "Test",
      createdBy: "test-agent",
    };

    expect(input.type).toBeUndefined();
    expect(input.tags).toBeUndefined();
    expect(input.visibility).toBeUndefined();
    expect(input.sharedWith).toBeUndefined();
  });
});
