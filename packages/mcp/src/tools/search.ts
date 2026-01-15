import { getApiClient, type MemoryType } from "../services/api-client.js";

export interface SearchInput {
  query: string;
  asEntity: string;
  type?: MemoryType;
  tags?: string[];
  limit?: number;
  from?: string;
  to?: string;
}

export async function handleSearch(input: SearchInput): Promise<string> {
  // Validate asEntity is provided
  if (!input.asEntity || input.asEntity.trim() === "") {
    return JSON.stringify(
      {
        success: false,
        error: "asEntity is required for searching memories",
      },
      null,
      2
    );
  }

  const apiClient = getApiClient();

  const results = await apiClient.searchMemories({
    query: input.query,
    asEntity: input.asEntity,
    type: input.type,
    tags: input.tags,
    limit: input.limit,
    from: input.from,
    to: input.to,
  });

  return JSON.stringify(
    {
      success: true,
      count: results.length,
      results: results.map((result) => ({
        score: result.score,
        memory: {
          id: result.memory.id,
          content: result.memory.content,
          type: result.memory.type,
          tags: result.memory.tags,
          createdBy: result.memory.createdBy,
          createdAt: result.memory.createdAt,
          visibility: result.memory.visibility,
          sharedWith: result.memory.sharedWith,
        },
      })),
    },
    null,
    2
  );
}
