/**
 * ChromaDB service for memory storage and retrieval
 */

import { ChromaClient, CloudClient, IncludeEnum } from "chromadb";
import type { Collection } from "chromadb";

type ChromaDBClient = ChromaClient | CloudClient;
import type {
  Memory,
  MemoryType,
  MemoryMetadata,
  CreateMemoryRequest,
  SearchMemoriesRequest,
} from "../types";

const COLLECTION_NAME = "memories";

/**
 * ChromaDB service class for managing memory collections
 */
export class ChromaDBService {
  private client: ChromaDBClient;
  private collection: Collection | null = null;

  constructor(chromaUrl?: string) {
    const provider = process.env.CHROMA_PROVIDER || "local";

    if (provider === "cloud") {
      const apiKey = process.env.CHROMA_API_KEY;
      const tenant = process.env.CHROMA_TENANT;
      const database = process.env.CHROMA_DATABASE;

      if (!apiKey || !tenant || !database) {
        throw new Error(
          "CHROMA_API_KEY, CHROMA_TENANT, and CHROMA_DATABASE environment variables are required for cloud provider"
        );
      }

      this.client = new CloudClient({
        apiKey,
        tenant,
        database,
      });
    } else {
      this.client = new ChromaClient({
        path: chromaUrl || process.env.CHROMA_URL || "http://localhost:8000",
      });
    }
  }

  /**
   * Initialize the ChromaDB connection and get/create the memories collection
   */
  async initialize(): Promise<void> {
    this.collection = await this.client.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: {
        description: "Berry memory storage collection",
      },
    });
  }

  /**
   * Ensure the collection is initialized
   */
  private ensureCollection(): Collection {
    if (!this.collection) {
      throw new Error("ChromaDB collection not initialized. Call initialize() first.");
    }
    return this.collection;
  }

  /**
   * Generate a unique ID for a new memory
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Convert ChromaDB metadata to MemoryMetadata
   */
  private parseMetadata(chromaMetadata: Record<string, unknown>): MemoryMetadata {
    return {
      createdAt: chromaMetadata.createdAt as string,
      createdBy: chromaMetadata.createdBy as string | undefined,
      respondedBy: chromaMetadata.respondedBy as string | undefined,
      response: chromaMetadata.response as string | undefined,
      respondedAt: chromaMetadata.respondedAt as string | undefined,
      tags: chromaMetadata.tags ? JSON.parse(chromaMetadata.tags as string) : undefined,
      references: chromaMetadata.references
        ? JSON.parse(chromaMetadata.references as string)
        : undefined,
    };
  }

  /**
   * Convert MemoryMetadata to ChromaDB-compatible metadata format
   * ChromaDB only supports string, number, and boolean values
   */
  private toChromaMetadata(
    type: MemoryType,
    metadata: MemoryMetadata
  ): Record<string, string | number | boolean> {
    const chromaMetadata: Record<string, string | number | boolean> = {
      type,
      createdAt: metadata.createdAt,
    };

    if (metadata.createdBy) {
      chromaMetadata.createdBy = metadata.createdBy;
    }
    if (metadata.respondedBy) {
      chromaMetadata.respondedBy = metadata.respondedBy;
    }
    if (metadata.response) {
      chromaMetadata.response = metadata.response;
    }
    if (metadata.respondedAt) {
      chromaMetadata.respondedAt = metadata.respondedAt;
    }
    if (metadata.tags && metadata.tags.length > 0) {
      // Store tags as JSON string since ChromaDB doesn't support arrays
      chromaMetadata.tags = JSON.stringify(metadata.tags);
    }
    if (metadata.references && metadata.references.length > 0) {
      // Store references as JSON string since ChromaDB doesn't support arrays
      chromaMetadata.references = JSON.stringify(metadata.references);
    }

    return chromaMetadata;
  }

  /**
   * Add a new memory to the collection
   */
  async addMemory(request: CreateMemoryRequest): Promise<Memory> {
    const collection = this.ensureCollection();

    const id = this.generateId();
    const createdAt = new Date().toISOString();

    const metadata: MemoryMetadata = {
      createdAt,
      createdBy: request.metadata?.createdBy,
      tags: request.metadata?.tags,
      references: request.metadata?.references,
    };

    const chromaMetadata = this.toChromaMetadata(request.type, metadata);

    await collection.add({
      ids: [id],
      documents: [request.content],
      metadatas: [chromaMetadata],
    });

    return {
      id,
      content: request.content,
      type: request.type,
      metadata,
    };
  }

  /**
   * Retrieve a memory by ID
   */
  async getMemory(id: string): Promise<Memory | null> {
    const collection = this.ensureCollection();

    const result = await collection.get({
      ids: [id],
      include: [IncludeEnum.Documents, IncludeEnum.Metadatas],
    });

    if (!result.ids.length || !result.documents?.[0]) {
      return null;
    }

    const chromaMetadata = result.metadatas?.[0] as Record<string, unknown>;

    return {
      id: result.ids[0],
      content: result.documents[0],
      type: chromaMetadata?.type as MemoryType,
      metadata: this.parseMetadata(chromaMetadata || {}),
    };
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemory(id: string): Promise<boolean> {
    const collection = this.ensureCollection();

    // Check if the memory exists first
    const existing = await this.getMemory(id);
    if (!existing) {
      return false;
    }

    await collection.delete({
      ids: [id],
    });

    return true;
  }

  /**
   * Build ChromaDB where clause from search filters
   */
  private buildWhereClause(request: SearchMemoriesRequest): Record<string, unknown> | undefined {
    const filters = request.filters;
    if (!filters) {
      return undefined;
    }

    const conditions: Record<string, unknown>[] = [];

    // Filter by type
    if (filters.type) {
      conditions.push({ type: { $eq: filters.type } });
    }

    // Filter by createdBy
    if (filters.createdBy) {
      conditions.push({ createdBy: { $eq: filters.createdBy } });
    }

    // Filter by date range
    if (filters.dateRange) {
      if (filters.dateRange.from) {
        conditions.push({ createdAt: { $gte: filters.dateRange.from } });
      }
      if (filters.dateRange.to) {
        conditions.push({ createdAt: { $lte: filters.dateRange.to } });
      }
    }

    // Note: Tag filtering is handled post-query since tags are stored as JSON string

    if (conditions.length === 0) {
      return undefined;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { $and: conditions };
  }

  /**
   * Search memories by content and/or metadata filters
   */
  async searchMemories(request: SearchMemoriesRequest): Promise<Memory[]> {
    const collection = this.ensureCollection();

    const limit = request.limit || 10;
    const whereClause = this.buildWhereClause(request);

    let results: {
      ids: string[][];
      documents: (string | null)[][] | null;
      metadatas: (Record<string, unknown> | null)[][] | null;
    };

    if (request.query) {
      // Vector search with query
      results = await collection.query({
        queryTexts: [request.query],
        nResults: limit,
        where: whereClause,
        include: [IncludeEnum.Documents, IncludeEnum.Metadatas],
      });
    } else {
      // Metadata-only search (get all and filter)
      const getResult = await collection.get({
        where: whereClause,
        limit,
        include: [IncludeEnum.Documents, IncludeEnum.Metadatas],
      });

      // Convert get result format to match query result format
      results = {
        ids: [getResult.ids],
        documents: getResult.documents ? [getResult.documents] : null,
        metadatas: getResult.metadatas ? [getResult.metadatas] : null,
      };
    }

    const memories: Memory[] = [];

    const ids = results.ids[0] || [];
    const documents = results.documents?.[0] || [];
    const metadatas = results.metadatas?.[0] || [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const document = documents[i];
      const chromaMetadata = metadatas[i] as Record<string, unknown> | null;

      if (!document || !chromaMetadata) {
        continue;
      }

      const metadata = this.parseMetadata(chromaMetadata);

      // Post-filter by tags if specified
      if (request.filters?.tags && request.filters.tags.length > 0) {
        const memoryTags = metadata.tags || [];
        const hasMatchingTag = request.filters.tags.some((tag) => memoryTags.includes(tag));
        if (!hasMatchingTag) {
          continue;
        }
      }

      // Post-filter by references if specified (matches if memory references any of the specified IDs)
      if (request.filters?.references && request.filters.references.length > 0) {
        const memoryRefs = metadata.references || [];
        const hasMatchingRef = request.filters.references.some((ref) => memoryRefs.includes(ref));
        if (!hasMatchingRef) {
          continue;
        }
      }

      memories.push({
        id,
        content: document,
        type: chromaMetadata.type as MemoryType,
        metadata,
      });
    }

    return memories;
  }

  /**
   * Health check - verify connection to ChromaDB
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let chromaDBService: ChromaDBService | null = null;

/**
 * Get the ChromaDB service instance
 */
export function getChromaDBService(): ChromaDBService {
  if (!chromaDBService) {
    chromaDBService = new ChromaDBService();
  }
  return chromaDBService;
}

/**
 * Initialize the ChromaDB service
 */
export async function initializeChromaDB(): Promise<ChromaDBService> {
  const service = getChromaDBService();
  await service.initialize();
  return service;
}
