import { getApiClient, type MemoryType } from "../services/api-client.js";

export interface SearchInput {
  query: string;
  type?: MemoryType;
  tags?: string[];
  limit?: number;
  from?: string;
  to?: string;
}

export async function handleSearch(input: SearchInput): Promise<string> {
  const apiClient = getApiClient();

  const results = await apiClient.searchMemories({
    query: input.query,
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
        },
      })),
    },
    null,
    2
  );
}
