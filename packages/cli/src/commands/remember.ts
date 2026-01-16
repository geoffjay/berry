import { input, select } from "@inquirer/prompts";
import ora from "ora";
import { getConfig, getApiClient, formatTags, formatDate, handleApiError } from "../utils.js";
import { isValidMemoryType, type MemoryType } from "../services/config.js";

export interface RememberOptions {
  content?: string;
  type?: string;
  tags?: string;
  by?: string;
  references?: string;
  visibility?: string;
  sharedWith?: string;
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

  // Parse references
  const references = options.references
    ? options.references
        .split(",")
        .map((ref) => ref.trim())
        .filter(Boolean)
    : undefined;

  // Get creator
  const createdBy = options.by ?? config.defaults.createdBy;

  // Get visibility from flags or prompt if running interactively
  const validVisibilities = ["private", "shared", "public"];
  let visibility: "private" | "shared" | "public" | undefined;
  if (options.visibility) {
    if (!validVisibilities.includes(options.visibility)) {
      console.error(
        `Invalid visibility: ${options.visibility}. Must be one of: private, shared, public`
      );
      process.exit(1);
    }
    visibility = options.visibility as "private" | "shared" | "public";
  } else if (!options.content) {
    // Prompt for visibility in interactive mode
    visibility = (await select({
      message: "Who can access this memory?",
      choices: [
        { value: "public", name: "Public - Anyone can see it" },
        { value: "private", name: "Private - Only you can see it" },
        { value: "shared", name: "Shared - You and specific actors can see it" },
      ],
      default: "public",
    })) as "private" | "shared" | "public";
  }

  // Parse or prompt for sharedWith
  let sharedWith: string[] | undefined;
  if (options.sharedWith) {
    sharedWith = options.sharedWith
      .split(",")
      .map((actor) => actor.trim())
      .filter(Boolean);
  } else if (!options.content && visibility === "shared") {
    // Prompt for sharedWith in interactive mode when visibility is shared
    const sharedWithInput = await input({
      message: "Enter actor IDs to share with (comma-separated):",
      validate: (value: string) => {
        if (!value.trim()) {
          return "At least one actor ID is required for shared visibility";
        }
        return true;
      },
    });
    sharedWith = sharedWithInput
      .split(",")
      .map((actor) => actor.trim())
      .filter(Boolean);
  }

  // Submit the memory
  const spinner = ora("Saving memory...").start();

  try {
    const memory = await apiClient.createMemory({
      content: content!.trim(),
      type: memoryType,
      tags,
      createdBy,
      references,
      visibility,
      sharedWith,
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
