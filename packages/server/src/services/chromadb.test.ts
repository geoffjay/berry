import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { ChromaDBService } from "./chromadb";

// Mock the ChromaDB client modules
const mockCollection: Record<string, ReturnType<typeof mock>> = {
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
  update: mock(() => Promise.resolve()),
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
    mockCollection.update.mockClear();
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

describe("checkMemoryAccess", () => {
  let service: ChromaDBService;

  beforeEach(async () => {
    service = new ChromaDBService();
    await service.initialize();
  });

  test("allows access to public memories", () => {
    const memory = {
      id: "mem_1",
      content: "test",
      type: "information" as const,
      metadata: {
        createdAt: "2024-01-01",
        visibility: "public" as const,
        owner: "owner1",
      },
    };

    expect(service.checkMemoryAccess(memory, "anyone")).toBe(true);
  });

  test("allows owner access to private memories", () => {
    const memory = {
      id: "mem_1",
      content: "test",
      type: "information" as const,
      metadata: {
        createdAt: "2024-01-01",
        visibility: "private" as const,
        owner: "owner1",
      },
    };

    expect(service.checkMemoryAccess(memory, "owner1")).toBe(true);
  });

  test("denies non-owner access to private memories", () => {
    const memory = {
      id: "mem_1",
      content: "test",
      type: "information" as const,
      metadata: {
        createdAt: "2024-01-01",
        visibility: "private" as const,
        owner: "owner1",
      },
    };

    expect(service.checkMemoryAccess(memory, "other_user")).toBe(false);
  });

  test("allows access to shared memories for sharedWith actors", () => {
    const memory = {
      id: "mem_1",
      content: "test",
      type: "information" as const,
      metadata: {
        createdAt: "2024-01-01",
        visibility: "shared" as const,
        owner: "owner1",
        sharedWith: ["user2", "user3"],
      },
    };

    expect(service.checkMemoryAccess(memory, "user2")).toBe(true);
    expect(service.checkMemoryAccess(memory, "user3")).toBe(true);
  });

  test("denies access to shared memories for non-shared actors", () => {
    const memory = {
      id: "mem_1",
      content: "test",
      type: "information" as const,
      metadata: {
        createdAt: "2024-01-01",
        visibility: "shared" as const,
        owner: "owner1",
        sharedWith: ["user2"],
      },
    };

    expect(service.checkMemoryAccess(memory, "user4")).toBe(false);
  });

  test("allows owner access to shared memories", () => {
    const memory = {
      id: "mem_1",
      content: "test",
      type: "information" as const,
      metadata: {
        createdAt: "2024-01-01",
        visibility: "shared" as const,
        owner: "owner1",
        sharedWith: ["user2"],
      },
    };

    expect(service.checkMemoryAccess(memory, "owner1")).toBe(true);
  });

  test("allows human admin bypass with adminAccess flag", () => {
    const memory = {
      id: "mem_1",
      content: "test",
      type: "information" as const,
      metadata: {
        createdAt: "2024-01-01",
        visibility: "private" as const,
        owner: "owner1",
      },
    };

    expect(service.checkMemoryAccess(memory, "human", true)).toBe(true);
  });

  test("treats legacy memories without visibility as public", () => {
    const memory = {
      id: "mem_1",
      content: "test",
      type: "information" as const,
      metadata: {
        createdAt: "2024-01-01",
        createdBy: "owner1",
      },
    };

    expect(service.checkMemoryAccess(memory, "anyone")).toBe(true);
  });

  test("falls back to createdBy when owner is not set", () => {
    const memory = {
      id: "mem_1",
      content: "test",
      type: "information" as const,
      metadata: {
        createdAt: "2024-01-01",
        visibility: "private" as const,
        createdBy: "creator1",
      },
    };

    expect(service.checkMemoryAccess(memory, "creator1")).toBe(true);
    expect(service.checkMemoryAccess(memory, "other")).toBe(false);
  });

  test("handles empty sharedWith array", () => {
    const memory = {
      id: "mem_1",
      content: "test",
      type: "information" as const,
      metadata: {
        createdAt: "2024-01-01",
        visibility: "shared" as const,
        owner: "owner1",
        sharedWith: [],
      },
    };

    expect(service.checkMemoryAccess(memory, "other")).toBe(false);
  });
});

describe("updateVisibility", () => {
  let service: ChromaDBService;

  beforeEach(async () => {
    service = new ChromaDBService();
    await service.initialize();
  });

  test("updates visibility to private", async () => {
    mockCollection.get.mockImplementationOnce(() =>
      Promise.resolve({
        ids: ["mem_123"],
        documents: ["test content"],
        metadatas: [
          {
            type: "information",
            createdAt: "2024-01-01T00:00:00.000Z",
            visibility: "public",
            owner: "user1",
          },
        ],
      })
    );

    const result = await service.updateVisibility("mem_123", "private");

    expect(result).not.toBeNull();
    expect(result?.metadata.visibility).toBe("private");
    expect(mockCollection.update).toHaveBeenCalled();
  });

  test("updates visibility to shared with sharedWith list", async () => {
    mockCollection.get.mockImplementationOnce(() =>
      Promise.resolve({
        ids: ["mem_123"],
        documents: ["test content"],
        metadatas: [
          {
            type: "information",
            createdAt: "2024-01-01T00:00:00.000Z",
            visibility: "public",
            owner: "user1",
          },
        ],
      })
    );

    const result = await service.updateVisibility("mem_123", "shared", ["user2", "user3"]);

    expect(result).not.toBeNull();
    expect(result?.metadata.visibility).toBe("shared");
    expect(result?.metadata.sharedWith).toEqual(["user2", "user3"]);
  });

  test("returns null for non-existent memory", async () => {
    mockCollection.get.mockImplementationOnce(() =>
      Promise.resolve({
        ids: [],
        documents: [],
        metadatas: [],
      })
    );

    const result = await service.updateVisibility("non_existent", "private");
    expect(result).toBeNull();
  });
});

describe("searchMemories with visibility context", () => {
  let service: ChromaDBService;

  beforeEach(async () => {
    service = new ChromaDBService();
    await service.initialize();
  });

  test("filters results by visibility context", async () => {
    mockCollection.query.mockImplementationOnce(() =>
      Promise.resolve({
        ids: [["mem_1", "mem_2", "mem_3"]],
        documents: [["public content", "private content", "shared content"]],
        metadatas: [
          [
            {
              type: "information",
              createdAt: "2024-01-01",
              visibility: "public",
              owner: "owner1",
            },
            {
              type: "information",
              createdAt: "2024-01-02",
              visibility: "private",
              owner: "owner1",
            },
            {
              type: "information",
              createdAt: "2024-01-03",
              visibility: "shared",
              owner: "owner1",
              sharedWith: '["user2"]',
            },
          ],
        ],
      })
    );

    const results = await service.searchMemories(
      { query: "test" },
      { asActor: "user2", adminAccess: false }
    );

    // user2 should see: public, shared (they're in sharedWith)
    expect(results.some((r) => r.metadata.visibility === "public")).toBe(true);
    expect(results.some((r) => r.metadata.visibility === "shared")).toBe(true);
    expect(results.some((r) => r.metadata.visibility === "private")).toBe(false);
  });

  test("human admin bypasses visibility filters", async () => {
    mockCollection.query.mockImplementationOnce(() =>
      Promise.resolve({
        ids: [["mem_1", "mem_2"]],
        documents: [["public content", "private content"]],
        metadatas: [
          [
            {
              type: "information",
              createdAt: "2024-01-01",
              visibility: "public",
              owner: "owner1",
            },
            {
              type: "information",
              createdAt: "2024-01-02",
              visibility: "private",
              owner: "owner1",
            },
          ],
        ],
      })
    );

    const results = await service.searchMemories(
      { query: "test" },
      { asActor: "human", adminAccess: true }
    );

    // Human admin should see all memories
    expect(results).toHaveLength(2);
  });

  test("over-fetches when visibility filtering is applied", async () => {
    // Clear query mock to get clean call tracking
    mockCollection.query.mockClear();

    await service.searchMemories({ query: "test", limit: 5 }, { asActor: "user1" });

    // Should request 15 (5 * 3) to account for post-filtering
    const calls = mockCollection.query.mock.calls as unknown as Array<[{ nResults?: number }]>;
    expect(calls[0]?.[0]?.nResults).toBe(15);
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
