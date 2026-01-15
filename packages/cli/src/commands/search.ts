import { select } from "@inquirer/prompts";
import ora from "ora";
import { getApiClient, formatTags, formatDate, isValidDate, handleApiError } from "../utils.js";
import type { SearchResult } from "../services/api-client.js";

export interface SearchOptions {
  query: string;
  type?: string;
  tags?: string;
  references?: string;
  limit?: number;
  from?: string;
  to?: string;
}

/**
 * Search memories using vector similarity
 */
export async function searchCommand(options: SearchOptions): Promise<void> {
  const apiClient = getApiClient();

  // Validate type flag
  if (options.type && !["question", "request", "information"].includes(options.type)) {
    console.error(
      `Invalid memory type: ${options.type}. Must be one of: question, request, information`
    );
    process.exit(1);
  }

  // Validate date formats
  if (options.from && !isValidDate(options.from)) {
    console.error(
      `Invalid date format for --from: ${options.from}. Use ISO format (e.g., 2024-01-01)`
    );
    process.exit(1);
  }
  if (options.to && !isValidDate(options.to)) {
    console.error(`Invalid date format for --to: ${options.to}. Use ISO format (e.g., 2024-12-31)`);
    process.exit(1);
  }

  // Parse tags
  const tags = options.tags
    ? options.tags
        .split(",")
        .map((tag: string) => tag.trim())
        .filter(Boolean)
    : undefined;

  // Parse references
  const references = options.references
    ? options.references
        .split(",")
        .map((ref: string) => ref.trim())
        .filter(Boolean)
    : undefined;

  const spinner = ora("Searching memories...").start();

  try {
    const results = await apiClient.searchMemories({
      query: options.query,
      type: options.type as "question" | "request" | "information" | undefined,
      tags,
      references,
      limit: options.limit,
      from: options.from,
      to: options.to,
    });

    spinner.stop();

    if (results.length === 0) {
      console.log("No memories found matching your query.");
      return;
    }

    // Show interactive selection
    await showInteractiveResults(results, options.query);
  } catch (error) {
    spinner.fail("Search failed");
    handleApiError(error);
  }
}

/**
 * Truncate text to specified length with ellipsis
 */
function truncateContent(text: string, maxLength: number = 60): string {
  const cleaned = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.slice(0, maxLength - 3) + "...";
}

/**
 * Get icon for memory type
 */
function getTypeIcon(type: string): string {
  switch (type) {
    case "question":
      return "?";
    case "request":
      return "!";
    case "information":
    default:
      return "i";
  }
}

/**
 * Format a search result for display in the select list
 */
function formatResultChoice(result: SearchResult): {
  value: SearchResult;
  name: string;
  description: string;
} {
  const { memory, score } = result;
  const typeIcon = getTypeIcon(memory.type);
  const truncatedContent = truncateContent(memory.content);

  return {
    value: result,
    name: `${typeIcon} ${truncatedContent}`,
    description: `Score: ${(score * 100).toFixed(0)}% | ${memory.type} | ${formatTags(memory.tags)}`,
  };
}

/**
 * Display full memory details
 */
function showMemoryDetails(result: SearchResult): void {
  const { memory, score } = result;

  console.log("\n" + "=".repeat(70));
  console.log("Memory Details");
  console.log("=".repeat(70));
  console.log("");
  console.log(`ID:           ${memory.id}`);
  console.log(`Type:         ${memory.type}`);
  console.log(`Created by:   ${memory.createdBy}`);
  console.log(`Created at:   ${formatDate(memory.createdAt)}`);
  console.log(`Updated at:   ${formatDate(memory.updatedAt)}`);
  console.log(`Tags:         ${formatTags(memory.tags)}`);
  console.log("");
  console.log("-".repeat(70));
  console.log("Search Relevance");
  console.log("-".repeat(70));
  console.log(`Score:        ${(score * 100).toFixed(1)}%`);
  console.log(`Raw score:    ${score.toFixed(6)}`);
  console.log("");
  console.log("-".repeat(70));
  console.log("Content");
  console.log("-".repeat(70));
  console.log("");
  console.log(memory.content);
  console.log("");
  console.log("=".repeat(70));
}

/**
 * Prompt to continue viewing results or exit
 */
async function promptContinue(results: SearchResult[], query: string): Promise<void> {
  const continueChoice = await select({
    message: "What would you like to do?",
    choices: [
      { value: "list", name: "View another result" },
      { value: "exit", name: "Exit search" },
    ],
  });

  if (continueChoice === "list") {
    await showInteractiveResults(results, query);
  } else {
    console.log("\nSearch complete.");
  }
}

/**
 * Show interactive select list and handle selection
 */
async function showInteractiveResults(results: SearchResult[], query: string): Promise<void> {
  console.log(
    `\nFound ${results.length} result${results.length === 1 ? "" : "s"} for "${query}":\n`
  );

  const choices = results.map((result) => formatResultChoice(result));

  // Add exit option
  const exitChoice = {
    value: null as SearchResult | null,
    name: "<- Exit search",
    description: "Return to command line",
  };

  try {
    const selected = await select({
      message: "Select a memory to view details:",
      choices: [...choices, exitChoice],
      loop: true,
    });

    if (!selected) {
      console.log("\nSearch complete.");
      return;
    }

    // Show full details
    showMemoryDetails(selected as SearchResult);

    // Offer to select another
    await promptContinue(results, query);
  } catch (error) {
    // Handle Ctrl+C gracefully
    if (error instanceof Error && error.message.includes("User force closed")) {
      console.log("\nSearch cancelled.");
      return;
    }
    throw error;
  }
}
