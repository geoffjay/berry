import { getApiClient } from "../services/api-client.js";

export interface ForgetInput {
  id: string;
}

export async function handleForget(input: ForgetInput): Promise<string> {
  const apiClient = getApiClient();

  await apiClient.deleteMemory(input.id);

  return JSON.stringify(
    {
      success: true,
      message: `Memory ${input.id} has been deleted`,
    },
    null,
    2
  );
}
