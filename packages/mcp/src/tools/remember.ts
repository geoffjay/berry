import { getApiClient, type MemoryType } from '../services/api-client.js';

export interface RememberInput {
  content: string;
  type?: MemoryType;
  tags?: string[];
  createdBy?: string;
}

export async function handleRemember(input: RememberInput): Promise<string> {
  const apiClient = getApiClient();

  const memory = await apiClient.createMemory({
    content: input.content,
    type: input.type,
    tags: input.tags,
    createdBy: input.createdBy,
  });

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
      },
    },
    null,
    2
  );
}
