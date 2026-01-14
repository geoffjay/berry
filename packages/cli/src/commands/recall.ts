import { getApiClient, formatTags, formatDate, handleApiError } from "../utils.js";

/**
 * Retrieve a specific memory by ID
 */
export async function recallCommand(id: string): Promise<void> {
  const apiClient = getApiClient();

  try {
    const memory = await apiClient.getMemory(id);

    console.log("");
    console.log("=".repeat(60));
    console.log("Memory Details");
    console.log("=".repeat(60));
    console.log("");
    console.log(`ID:         ${memory.id}`);
    console.log(`Type:       ${memory.type}`);
    console.log(`Created by: ${memory.createdBy}`);
    console.log(`Created at: ${formatDate(memory.createdAt)}`);
    console.log(`Updated at: ${formatDate(memory.updatedAt)}`);
    console.log(`Tags:       ${formatTags(memory.tags)}`);
    console.log("");
    console.log("-".repeat(60));
    console.log("Content:");
    console.log("-".repeat(60));
    console.log("");
    console.log(memory.content);
    console.log("");
    console.log("=".repeat(60));
  } catch (error) {
    handleApiError(error);
  }
}
