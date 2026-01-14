import { confirm } from "@inquirer/prompts"
import ora from "ora"
import { getApiClient, truncate, handleApiError } from "../utils.js"

/**
 * Remove a memory by ID
 */
export async function forgetCommand(id: string): Promise<void> {
  const apiClient = getApiClient()

  // First, try to fetch the memory to show what will be deleted
  let memoryContent: string | undefined
  try {
    const memory = await apiClient.getMemory(id)
    memoryContent = memory.content
  } catch {
    // Memory might not exist, we'll get an error during delete
  }

  // Show memory preview if available
  if (memoryContent) {
    console.log(`Memory to delete:`)
    console.log(`  "${truncate(memoryContent, 60)}"`)
    console.log("")
  }

  // Prompt for confirmation
  const confirmed = await confirm({
    message: `Are you sure you want to forget memory ${id}? This action cannot be undone.`,
    default: false,
  })

  if (!confirmed) {
    console.log("Deletion cancelled.")
    return
  }

  // Delete the memory
  const spinner = ora("Forgetting memory...").start()

  try {
    await apiClient.deleteMemory(id)
    spinner.succeed("Memory forgotten successfully.")
  } catch (error) {
    spinner.fail("Failed to forget memory")
    handleApiError(error)
  }
}
