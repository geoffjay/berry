import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { ChromaDBService } from "./chromadb";

// Mock the ChromaDB client modules
const mockCollection = {
  add: mock(() => Promise.resolve()),
  get: mock(() =>
    Promise.resolve({
      ids: ["mem_123"],
      documents: ["test content"],
      metadatas: [
        {
          type: "information",
          createdAt: "2024-01-01T00:00:00.000Z",
          createdBy: "user",
          tags: '["test"]',
        },
      ],
    })
  ),
  delete: mock(() => Promise.resolve()),
  query: mock(() =>
    Promise.resolve({
      ids: [["mem_123", "mem_456"]],
      documents: [["content 1", "content 2"]],
      metadatas: [
        [
          {
            type: "information",
            createdAt: "2024-01-01T00:00:00.000Z",
            createdBy: "user",
            tags: "[]",
          },
          {
            type: "question",
            createdAt: "2024-01-02T00:00:00.000Z",
            createdBy: "user",
            tags: "[]",
          },
        ],
      ],
    })
  ),
};

const mockClient = {
  getOrCreateCollection: mock(() => Promise.resolve(mockCollection)),
  heartbeat: mock(() => Promise.resolve(1234567890)),
};

// Mock the chromadb module
mock.module("chromadb", () => ({
  ChromaClient: class {
    constructor() {
      return mockClient;
    }
  },
  CloudClient: class {
    constructor() {
      return mockClient;
    }
  },
  IncludeEnum: {
    Documents: "documents",
    Metadatas: "metadatas",
  },
}));

describe("ChromaDBService", () => {
  let service: ChromaDBService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear mocks
    mockCollection.add.mockClear();
    mockCollection.get.mockClear();
    mockCollection.delete.mockClear();
    mockCollection.query.mockClear();
    mockClient.getOrCreateCollection.mockClear();
    mockClient.heartbeat.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    test("creates local client by default", () => {
      process.env.CHROMA_PROVIDER = "local";
      service = new ChromaDBService();
      expect(service).toBeDefined();
    });

    test("uses custom URL if provided", () => {
      service = new ChromaDBService("http://custom:8000");
      expect(service).toBeDefined();
    });

    test("uses CHROMA_URL environment variable", () => {
      process.env.CHROMA_URL = "http://env-url:8000";
      service = new ChromaDBService();
      expect(service).toBeDefined();
    });

    test("throws error for cloud provider without required env vars", () => {
      process.env.CHROMA_PROVIDER = "cloud";
      delete process.env.CHROMA_API_KEY;

      expect(() => new ChromaDBService()).toThrow(
        "CHROMA_API_KEY, CHROMA_TENANT, and CHROMA_DATABASE environment variables are required"
      );
    });

    test("creates cloud client when all env vars present", () => {
      process.env.CHROMA_PROVIDER = "cloud";
      process.env.CHROMA_API_KEY = "test-key";
      process.env.CHROMA_TENANT = "test-tenant";
      process.env.CHROMA_DATABASE = "test-db";

      service = new ChromaDBService();
      expect(service).toBeDefined();
    });
  });

  describe("initialize", () => {
    test("creates or gets collection", async () => {
      service = new ChromaDBService();
      await service.initialize();

      expect(mockClient.getOrCreateCollection).toHaveBeenCalledWith({
        name: "memories",
        metadata: {
          description: "Berry memory storage collection",
        },
      });
    });
  });

  describe("addMemory", () => {
    beforeEach(async () => {
      service = new ChromaDBService();
      await service.initialize();
    });

    test("adds memory with required fields", async () => {
      const memory = await service.addMemory({
        content: "Test memory content",
        type: "information",
      });

      expect(memory.content).toBe("Test memory content");
      expect(memory.type).toBe("information");
      expect(memory.id).toMatch(/^mem_\d+_[a-z0-9]+$/);
      expect(memory.metadata.createdAt).toBeDefined();
    });

    test("adds memory with optional metadata", async () => {
      const memory = await service.addMemory({
        content: "Test memory",
        type: "question",
        metadata: {
          createdBy: "test-user",
          tags: ["important", "work"],
          references: ["mem_001"],
        },
      });

      expect(memory.metadata.createdBy).toBe("test-user");
      expect(memory.metadata.tags).toEqual(["important", "work"]);
      expect(memory.metadata.references).toEqual(["mem_001"]);
    });

    test("throws error if collection not initialized", async () => {
      const uninitializedService = new ChromaDBService();

      await expect(
        uninitializedService.addMemory({
          content: "test",
          type: "information",
        })
      ).rejects.toThrow("ChromaDB collection not initialized");
    });
  });

  describe("getMemory", () => {
    beforeEach(async () => {
      service = new ChromaDBService();
      await service.initialize();
    });

    test("retrieves memory by ID", async () => {
      const memory = await service.getMemory("mem_123");

      expect(memory).not.toBeNull();
      expect(memory?.id).toBe("mem_123");
      expect(memory?.content).toBe("test content");
      expect(memory?.type).toBe("information");
    });

    test("returns null for non-existent memory", async () => {
      mockCollection.get.mockImplementationOnce(() =>
        Promise.resolve({
          ids: [],
          documents: [],
          metadatas: [],
        })
      );

      const memory = await service.getMemory("non_existent");
      expect(memory).toBeNull();
    });

    test("parses metadata with tags and references", async () => {
      mockCollection.get.mockImplementationOnce(() =>
        Promise.resolve({
          ids: ["mem_123"],
          documents: ["test content"],
          metadatas: [
            {
              type: "information",
              createdAt: "2024-01-01T00:00:00.000Z",
              createdBy: "user",
              tags: '["tag1","tag2"]',
              references: '["ref1"]',
            },
          ],
        })
      );

      const memory = await service.getMemory("mem_123");
      expect(memory?.metadata.tags).toEqual(["tag1", "tag2"]);
      expect(memory?.metadata.references).toEqual(["ref1"]);
    });
  });

  describe("deleteMemory", () => {
    beforeEach(async () => {
      service = new ChromaDBService();
      await service.initialize();
    });

    test("deletes existing memory", async () => {
      const result = await service.deleteMemory("mem_123");

      expect(result).toBe(true);
      expect(mockCollection.delete).toHaveBeenCalledWith({
        ids: ["mem_123"],
      });
    });

    test("returns false for non-existent memory", async () => {
      mockCollection.get.mockImplementationOnce(() =>
        Promise.resolve({
          ids: [],
          documents: [],
          metadatas: [],
        })
      );

      const result = await service.deleteMemory("non_existent");
      expect(result).toBe(false);
    });
  });

  describe("searchMemories", () => {
    beforeEach(async () => {
      service = new ChromaDBService();
      await service.initialize();
    });

    test("searches with query text", async () => {
      const results = await service.searchMemories({
        query: "test query",
        limit: 5,
      });

      expect(mockCollection.query).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    test("searches with type filter", async () => {
      await service.searchMemories({
        query: "test",
        filters: { type: "information" },
      });

      expect(mockCollection.query).toHaveBeenCalled();
    });

    test("searches with date range filter", async () => {
      await service.searchMemories({
        query: "test",
        filters: {
          dateRange: {
            from: "2024-01-01",
            to: "2024-12-31",
          },
        },
      });

      expect(mockCollection.query).toHaveBeenCalled();
    });

    test("filters results by tags", async () => {
      mockCollection.query.mockImplementationOnce(() =>
        Promise.resolve({
          ids: [["mem_1", "mem_2"]],
          documents: [["content 1", "content 2"]],
          metadatas: [
            [
              { type: "information", createdAt: "2024-01-01", createdBy: "user", tags: '["work"]' },
              {
                type: "information",
                createdAt: "2024-01-02",
                createdBy: "user",
                tags: '["personal"]',
              },
            ],
          ],
        })
      );

      const results = await service.searchMemories({
        query: "test",
        filters: { tags: ["work"] },
      });

      expect(results).toHaveLength(1);
      expect(results[0].metadata.tags).toContain("work");
    });

    test("filters results by references", async () => {
      mockCollection.query.mockImplementationOnce(() =>
        Promise.resolve({
          ids: [["mem_1", "mem_2"]],
          documents: [["content 1", "content 2"]],
          metadatas: [
            [
              {
                type: "information",
                createdAt: "2024-01-01",
                createdBy: "user",
                tags: "[]",
                references: '["ref_1"]',
              },
              {
                type: "information",
                createdAt: "2024-01-02",
                createdBy: "user",
                tags: "[]",
                references: '["ref_2"]',
              },
            ],
          ],
        })
      );

      const results = await service.searchMemories({
        query: "test",
        filters: { references: ["ref_1"] },
      });

      expect(results).toHaveLength(1);
    });

    test("uses get for metadata-only search without query", async () => {
      mockCollection.get.mockImplementationOnce(() =>
        Promise.resolve({
          ids: ["mem_1"],
          documents: ["content"],
          metadatas: [
            { type: "information", createdAt: "2024-01-01", createdBy: "user", tags: "[]" },
          ],
        })
      );

      await service.searchMemories({
        filters: { type: "information" },
      });

      expect(mockCollection.get).toHaveBeenCalled();
    });

    test("applies default limit of 10", async () => {
      await service.searchMemories({ query: "test" });

      const calls = mockCollection.query.mock.calls as unknown as Array<[{ nResults?: number }]>;
      expect(calls[0]?.[0]?.nResults).toBe(10);
    });
  });

  describe("healthCheck", () => {
    beforeEach(() => {
      service = new ChromaDBService();
    });

    test("returns true when heartbeat succeeds", async () => {
      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    test("returns false when heartbeat fails", async () => {
      mockClient.heartbeat.mockImplementationOnce(() =>
        Promise.reject(new Error("Connection failed"))
      );

      const result = await service.healthCheck();
      expect(result).toBe(false);
    });
  });
});

describe("Metadata serialization", () => {
  test("handles empty metadata", async () => {
    const service = new ChromaDBService();
    await service.initialize();

    mockCollection.get.mockImplementationOnce(() =>
      Promise.resolve({
        ids: ["mem_123"],
        documents: ["test"],
        metadatas: [
          { type: "information", createdAt: "2024-01-01", createdBy: "user", tags: "[]" },
        ],
      })
    );

    const memory = await service.getMemory("mem_123");
    expect(memory?.metadata.tags).toEqual([]);
    expect(memory?.metadata.references).toBeUndefined();
  });

  test("handles all optional metadata fields", async () => {
    const service = new ChromaDBService();
    await service.initialize();

    mockCollection.get.mockImplementationOnce(() =>
      Promise.resolve({
        ids: ["mem_123"],
        documents: ["test"],
        metadatas: [
          {
            type: "question",
            createdAt: "2024-01-01T00:00:00.000Z",
            createdBy: "user1",
            respondedBy: "user2",
            response: "The answer is 42",
            respondedAt: "2024-01-02T00:00:00.000Z",
            tags: '["qa"]',
            references: '["ref1","ref2"]',
          },
        ],
      })
    );

    const memory = await service.getMemory("mem_123");
    expect(memory?.metadata.createdBy).toBe("user1");
    expect(memory?.metadata.respondedBy).toBe("user2");
    expect(memory?.metadata.response).toBe("The answer is 42");
    expect(memory?.metadata.respondedAt).toBe("2024-01-02T00:00:00.000Z");
    expect(memory?.metadata.tags).toEqual(["qa"]);
    expect(memory?.metadata.references).toEqual(["ref1", "ref2"]);
  });
});
