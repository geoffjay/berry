import { describe, expect, test, mock, beforeEach } from "bun:test";
import { handleSearch, type SearchInput } from "./search";

// Mock the api-client module
const mockSearchMemories = mock(() =>
  Promise.resolve([
    {
      memory: {
        id: "mem_1",
        content: "First result",
        type: "information",
        tags: ["test"],
        createdBy: "user",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        visibility: "public",
      },
      score: 0.95,
    },
    {
      memory: {
        id: "mem_2",
        content: "Second result",
        type: "question",
        tags: ["work"],
        createdBy: "system",
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        visibility: "public",
      },
      score: 0.85,
    },
  ])
);

mock.module("../services/api-client", () => ({
  getApiClient: () => ({
    searchMemories: mockSearchMemories,
  }),
}));

describe("handleSearch", () => {
  beforeEach(() => {
    mockSearchMemories.mockClear();
  });

  test("searches with query text and asActor", async () => {
    const input: SearchInput = {
      query: "test query",
      asActor: "test-agent",
    };

    const result = await handleSearch(input);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.count).toBe(2);
    expect(mockSearchMemories).toHaveBeenCalledWith({
      query: "test query",
      asActor: "test-agent",
      type: undefined,
      tags: undefined,
      limit: undefined,
      from: undefined,
      to: undefined,
    });
  });

  test("searches with all filter options", async () => {
    const input: SearchInput = {
      query: "test query",
      asActor: "test-agent",
      type: "question",
      tags: ["important", "work"],
      limit: 5,
      from: "2024-01-01",
      to: "2024-12-31",
    };

    await handleSearch(input);

    expect(mockSearchMemories).toHaveBeenCalledWith({
      query: "test query",
      asActor: "test-agent",
      type: "question",
      tags: ["important", "work"],
      limit: 5,
      from: "2024-01-01",
      to: "2024-12-31",
    });
  });

  test("returns JSON-formatted response", async () => {
    const input: SearchInput = {
      query: "test",
      asActor: "test-agent",
    };

    const result = await handleSearch(input);

    // Should be valid JSON
    expect(() => JSON.parse(result)).not.toThrow();

    // Should be formatted with indentation
    expect(result).toContain("\n");
  });

  test("includes result count", async () => {
    const input: SearchInput = {
      query: "test",
      asActor: "test-agent",
    };

    const result = await handleSearch(input);
    const parsed = JSON.parse(result);

    expect(parsed.count).toBe(2);
  });

  test("includes score for each result", async () => {
    const input: SearchInput = {
      query: "test",
      asActor: "test-agent",
    };

    const result = await handleSearch(input);
    const parsed = JSON.parse(result);

    expect(parsed.results[0].score).toBe(0.95);
    expect(parsed.results[1].score).toBe(0.85);
  });

  test("includes memory details in each result", async () => {
    const input: SearchInput = {
      query: "test",
      asActor: "test-agent",
    };

    const result = await handleSearch(input);
    const parsed = JSON.parse(result);

    const firstResult = parsed.results[0];
    expect(firstResult.memory.id).toBe("mem_1");
    expect(firstResult.memory.content).toBe("First result");
    expect(firstResult.memory.type).toBe("information");
    expect(firstResult.memory.tags).toEqual(["test"]);
    expect(firstResult.memory.createdBy).toBe("user");
    expect(firstResult.memory.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(firstResult.memory.visibility).toBe("public");
  });

  test("handles empty results", async () => {
    mockSearchMemories.mockImplementationOnce(() => Promise.resolve([]));

    const input: SearchInput = {
      query: "nonexistent",
      asActor: "test-agent",
    };

    const result = await handleSearch(input);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.count).toBe(0);
    expect(parsed.results).toEqual([]);
  });

  test("rejects when asActor is missing", async () => {
    const input = {
      query: "test",
      asActor: "",
    } as SearchInput;

    const result = await handleSearch(input);
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("asActor is required");
  });

  test("propagates API errors", async () => {
    mockSearchMemories.mockImplementationOnce(() => Promise.reject(new Error("Search failed")));

    const input: SearchInput = {
      query: "test",
      asActor: "test-agent",
    };

    await expect(handleSearch(input)).rejects.toThrow("Search failed");
  });

  test("searches with type filter only", async () => {
    const input: SearchInput = {
      query: "test",
      asActor: "test-agent",
      type: "request",
    };

    await handleSearch(input);

    expect(mockSearchMemories).toHaveBeenCalledWith(expect.objectContaining({ type: "request" }));
  });

  test("searches with tags filter only", async () => {
    const input: SearchInput = {
      query: "test",
      asActor: "test-agent",
      tags: ["work", "important"],
    };

    await handleSearch(input);

    expect(mockSearchMemories).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["work", "important"] })
    );
  });

  test("searches with limit only", async () => {
    const input: SearchInput = {
      query: "test",
      asActor: "test-agent",
      limit: 10,
    };

    await handleSearch(input);

    expect(mockSearchMemories).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  test("searches with date range only", async () => {
    const input: SearchInput = {
      query: "test",
      asActor: "test-agent",
      from: "2024-01-01",
      to: "2024-06-30",
    };

    await handleSearch(input);

    expect(mockSearchMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "2024-01-01",
        to: "2024-06-30",
      })
    );
  });
});

describe("SearchInput type", () => {
  test("requires query and asActor fields", () => {
    const input: SearchInput = {
      query: "test query",
      asActor: "test-agent",
    };

    expect(input.query).toBe("test query");
    expect(input.asActor).toBe("test-agent");
  });

  test("accepts all valid memory types", () => {
    const types = ["question", "request", "information"] as const;

    types.forEach((type) => {
      const input: SearchInput = {
        query: "test",
        asActor: "test-agent",
        type,
      };
      expect(input.type).toBe(type);
    });
  });

  test("allows optional fields to be undefined", () => {
    const input: SearchInput = {
      query: "test",
      asActor: "test-agent",
    };

    expect(input.type).toBeUndefined();
    expect(input.tags).toBeUndefined();
    expect(input.limit).toBeUndefined();
    expect(input.from).toBeUndefined();
    expect(input.to).toBeUndefined();
  });
});
