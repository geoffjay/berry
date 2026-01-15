import { getApiClient, type MemoryType, type VisibilityLevel } from "../services/api-client.js";

export interface RememberInput {
  content: string;
  type?: MemoryType;
  tags?: string[];
  createdBy: string;
  visibility?: VisibilityLevel;
  sharedWith?: string[];
}

export async function handleRemember(input: RememberInput): Promise<string> {
  // Validate createdBy is provided
  if (!input.createdBy || input.createdBy.trim() === "") {
    return JSON.stringify(
      {
        success: false,
        error: "createdBy is required for creating memories",
      },
      null,
      2
    );
  }

  const apiClient = getApiClient();

  const memory = await apiClient.createMemory({
    content: input.content,
    type: input.type,
    tags: input.tags,
    createdBy: input.createdBy,
    visibility: input.visibility,
    sharedWith: input.sharedWith,
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
        visibility: memory.visibility,
        sharedWith: memory.sharedWith,
      },
    },
    null,
    2
  );
}
