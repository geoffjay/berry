import { input, select, confirm } from "@inquirer/prompts"
import ora from "ora"
import { getConfig, getApiClient, formatTags, formatDate, handleApiError } from "../utils.js"
import { type MemoryType } from "../services/config.js"

/**
 * Interactive mode for memory input
 */
export async function interactiveCommand(): Promise<void> {
  const config = getConfig()
  const apiClient = getApiClient()

  console.log("")
  console.log("  Berry - Interactive Memory Input")
  console.log("  ================================")
  console.log("")

  let continueSession = true

  while (continueSession) {
    try {
      // Get content
      const content = await input({
        message: "What would you like to remember?",
        validate: (value: string) => {
          if (!value.trim()) {
            return "Content cannot be empty"
          }
          return true
        },
      })

      // Get type
      const memoryType = (await select({
        message: "What type of memory is this?",
        choices: [
          {
            value: "information",
            name: "Information - A fact or piece of knowledge",
          },
          {
            value: "question",
            name: "Question - Something to ask or investigate",
          },
          { value: "request", name: "Request - An action or task to do" },
        ],
        default: config.defaults.type,
      })) as MemoryType

      // Get tags
      const tagsInput = await input({
        message: "Tags (comma-separated, or press Enter to skip):",
      })

      const tags = tagsInput
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean)

      // Get createdBy
      const createdBy = await input({
        message: "Created by:",
        default: config.defaults.createdBy,
      })

      // Save the memory
      const spinner = ora("Saving memory...").start()

      try {
        const memory = await apiClient.createMemory({
          content: content.trim(),
          type: memoryType,
          tags,
          createdBy,
        })

        spinner.succeed("Memory saved successfully!")
        console.log("")
        console.log(`  ID: ${memory.id}`)
        console.log(`  Type: ${memory.type}`)
        console.log(`  Tags: ${formatTags(memory.tags)}`)
        console.log(`  Created by: ${memory.createdBy}`)
        console.log(`  Created at: ${formatDate(memory.createdAt)}`)
        console.log("")
      } catch (error) {
        spinner.fail("Failed to save memory")
        handleApiError(error)
      }

      // Ask if they want to add another
      continueSession = await confirm({
        message: "Add another memory?",
        default: true,
      })
    } catch (error) {
      // Handle Ctrl+C gracefully
      if (error instanceof Error && error.message.includes("User force closed")) {
        console.log("")
        console.log("Goodbye!")
        break
      }
      throw error
    }
  }

  console.log("")
  console.log("Session ended. Use `berry remember` for quick one-off memories.")
}
