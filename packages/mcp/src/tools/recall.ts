import { getApiClient } from "../services/api-client.js";

export interface RecallInput {
  id: string;
}

export async function handleRecall(input: RecallInput): Promise<string> {
  const apiClient = getApiClient();

  const memory = await apiClient.getMemory(input.id);

  return JSON.stringify(
    {
      success: true,
      memory: {
        id: memory.id,
        content: memory.content,
        type: memory.type,
        tags: memory.tags,
        createdBy: memory.createdBy,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
      },
    },
    null,
    2
  );
}
