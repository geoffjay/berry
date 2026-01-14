import { Args, Flags } from "@oclif/core";
import { select } from "@inquirer/prompts";
import ora from "ora";
import { BaseCommand } from "../base-command.js";
import { isValidMemoryType } from "../services/config.js";
import type { SearchResult } from "../services/api-client.js";

/**
 * Command to search memories using vector similarity
 */
export default class Search extends BaseCommand {
  static override args = {
    query: Args.string({
      description: "Search query",
      required: true,
    }),
  };

  static override description = "Search memories using vector similarity";

  static override examples = [
    '<%= config.bin %> <%= command.id %> "meeting notes"',
    '<%= config.bin %> <%= command.id %> "project ideas" --type information --limit 5',
    '<%= config.bin %> <%= command.id %> "todo" --tags "work,urgent"',
    '<%= config.bin %> <%= command.id %> "bugs" --from 2024-01-01 --to 2024-12-31',
  ];

  static override flags = {
    type: Flags.string({
      char: "t",
      description: "Filter by memory type",
      options: ["question", "request", "information"],
    }),
    tags: Flags.string({
      description: "Filter by tags (comma-separated)",
    }),
    limit: Flags.integer({
      char: "l",
      description: "Number of results to return",
      default: 10,
    }),
    from: Flags.string({
      description: "Start date filter (ISO format)",
    }),
    to: Flags.string({
      description: "End date filter (ISO format)",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Search);

    // Validate type flag
    if (flags.type && !isValidMemoryType(flags.type)) {
      this.error(
        `Invalid memory type: ${flags.type}. Must be one of: question, request, information`
      );
    }

    // Validate date formats
    if (flags.from && !this.isValidDate(flags.from)) {
      this.error(
        `Invalid date format for --from: ${flags.from}. Use ISO format (e.g., 2024-01-01)`
      );
    }
    if (flags.to && !this.isValidDate(flags.to)) {
      this.error(`Invalid date format for --to: ${flags.to}. Use ISO format (e.g., 2024-12-31)`);
    }

    // Parse tags
    const tags = flags.tags
      ? flags.tags
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean)
      : undefined;

    const spinner = ora("Searching memories...").start();

    try {
      const results = await this.apiClient.searchMemories({
        query: args.query,
        type: flags.type as "question" | "request" | "information" | undefined,
        tags,
        limit: flags.limit,
        from: flags.from,
        to: flags.to,
      });

      spinner.stop();

      if (results.length === 0) {
        this.log("No memories found matching your query.");
        return;
      }

      // Show interactive selection
      await this.showInteractiveResults(results, args.query);
    } catch (error) {
      spinner.fail("Search failed");
      this.handleApiError(error);
    }
  }

  /**
   * Validate ISO date format
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Truncate text to specified length with ellipsis
   */
  private truncateContent(text: string, maxLength: number = 60): string {
    const cleaned = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return cleaned.slice(0, maxLength - 3) + "...";
  }

  /**
   * Format a search result for display in the select list
   */
  private formatResultChoice(result: SearchResult): {
    value: SearchResult;
    name: string;
    description: string;
  } {
    const { memory, score } = result;
    const typeIcon = this.getTypeIcon(memory.type);
    const truncatedContent = this.truncateContent(memory.content);

    return {
      value: result,
      name: `${typeIcon} ${truncatedContent}`,
      description: `Score: ${(score * 100).toFixed(0)}% | ${memory.type} | ${this.formatTags(memory.tags)}`,
    };
  }

  /**
   * Get icon for memory type
   */
  private getTypeIcon(type: string): string {
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
   * Show interactive select list and handle selection
   */
  private async showInteractiveResults(results: SearchResult[], query: string): Promise<void> {
    this.log(
      `\nFound ${results.length} result${results.length === 1 ? "" : "s"} for "${query}":\n`
    );

    const choices = results.map((result) => this.formatResultChoice(result));

    // Add exit option
    const exitChoice = {
      value: null as SearchResult | null,
      name: "← Exit search",
      description: "Return to command line",
    };

    try {
      const selected = await select({
        message: "Select a memory to view details:",
        choices: [...choices, exitChoice],
        loop: true,
      });

      if (!selected) {
        this.log("\nSearch complete.");
        return;
      }

      // Show full details
      this.showMemoryDetails(selected as SearchResult);

      // Offer to select another
      await this.promptContinue(results, query);
    } catch (error) {
      // Handle Ctrl+C gracefully
      if (error instanceof Error && error.message.includes("User force closed")) {
        this.log("\nSearch cancelled.");
        return;
      }
      throw error;
    }
  }

  /**
   * Display full memory details
   */
  private showMemoryDetails(result: SearchResult): void {
    const { memory, score } = result;

    this.log("\n" + "=".repeat(70));
    this.log("Memory Details");
    this.log("=".repeat(70));
    this.log("");
    this.log(`ID:           ${memory.id}`);
    this.log(`Type:         ${memory.type}`);
    this.log(`Created by:   ${memory.createdBy}`);
    this.log(`Created at:   ${this.formatDate(memory.createdAt)}`);
    this.log(`Updated at:   ${this.formatDate(memory.updatedAt)}`);
    this.log(`Tags:         ${this.formatTags(memory.tags)}`);
    this.log("");
    this.log("-".repeat(70));
    this.log("Search Relevance");
    this.log("-".repeat(70));
    this.log(`Score:        ${(score * 100).toFixed(1)}%`);
    this.log(`Raw score:    ${score.toFixed(6)}`);
    this.log("");
    this.log("-".repeat(70));
    this.log("Content");
    this.log("-".repeat(70));
    this.log("");
    this.log(memory.content);
    this.log("");
    this.log("=".repeat(70));
  }

  /**
   * Prompt to continue viewing results or exit
   */
  private async promptContinue(results: SearchResult[], query: string): Promise<void> {
    const continueChoice = await select({
      message: "What would you like to do?",
      choices: [
        { value: "list", name: "View another result" },
        { value: "exit", name: "Exit search" },
      ],
    });

    if (continueChoice === "list") {
      await this.showInteractiveResults(results, query);
    } else {
      this.log("\nSearch complete.");
    }
  }
}
