import { input, select } from "@inquirer/prompts";
import ora from "ora";
import { getConfig, getApiClient, formatTags, formatDate, handleApiError } from "../utils.js";
import { isValidMemoryType, type MemoryType } from "../services/config.js";

export interface RememberOptions {
  content?: string;
  type?: string;
  tags?: string;
  by?: string;
}

/**
 * Add a memory to the database
 */
export async function rememberCommand(options: RememberOptions): Promise<void> {
  const config = getConfig();
  const apiClient = getApiClient();

  // Get content from args or prompt
  let content = options.content;
  if (!content) {
    content = await input({
      message: "What would you like to remember?",
      validate: (value: string) => {
        if (!value.trim()) {
          return "Content cannot be empty";
        }
        return true;
      },
    });
  }

  // Get type from flags or prompt if not provided
  let memoryType: MemoryType;
  if (options.type && isValidMemoryType(options.type)) {
    memoryType = options.type;
  } else if (options.type) {
    console.error(
      `Invalid memory type: ${options.type}. Must be one of: question, request, information`
    );
    process.exit(1);
  } else {
    // If no type flag, prompt if running interactively (no content arg)
    if (!options.content) {
      memoryType = (await select({
        message: "What type of memory is this?",
        choices: [
          { value: "information", name: "Information - A fact or piece of knowledge" },
          { value: "question", name: "Question - Something to ask or investigate" },
          { value: "request", name: "Request - An action or task to do" },
        ],
        default: config.defaults.type,
      })) as MemoryType;
    } else {
      memoryType = config.defaults.type;
    }
  }

  // Parse tags
  const tags = options.tags
    ? options.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  // Get creator
  const createdBy = options.by ?? config.defaults.createdBy;

  // Submit the memory
  const spinner = ora("Saving memory...").start();

  try {
    const memory = await apiClient.createMemory({
      content: content!.trim(),
      type: memoryType,
      tags,
      createdBy,
    });

    spinner.succeed("Memory saved successfully!");
    console.log("");
    console.log(`  ID: ${memory.id}`);
    console.log(`  Type: ${memory.type}`);
    console.log(`  Tags: ${formatTags(memory.tags)}`);
    console.log(`  Created by: ${memory.createdBy}`);
    console.log(`  Created at: ${formatDate(memory.createdAt)}`);
  } catch (error) {
    spinner.fail("Failed to save memory");
    handleApiError(error);
  }
}
