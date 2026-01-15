import { getApiClient } from "../services/api-client.js";

export interface ForgetInput {
  id: string;
  asEntity?: string;
}

export async function handleForget(input: ForgetInput): Promise<string> {
  const apiClient = getApiClient();

  await apiClient.deleteMemory(input.id, input.asEntity);

  return JSON.stringify(
    {
      success: true,
      message: `Memory ${input.id} has been deleted`,
    },
    null,
    2
  );
}
