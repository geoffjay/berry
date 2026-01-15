import { getApiClient } from "../services/api-client.js";

export interface RecallInput {
  id: string;
  asActor?: string;
}

export async function handleRecall(input: RecallInput): Promise<string> {
  const apiClient = getApiClient();

  const memory = await apiClient.getMemory(input.id, input.asActor);

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
        visibility: memory.visibility,
        sharedWith: memory.sharedWith,
      },
    },
    null,
    2
  );
}
