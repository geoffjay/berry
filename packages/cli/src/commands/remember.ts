import { Args, Flags } from "@oclif/core";
import { input, select } from "@inquirer/prompts";
import ora from "ora";
import { BaseCommand } from "../base-command.js";
import { isValidMemoryType, type MemoryType } from "../services/config.js";

/**
 * Command to add a memory to the database
 */
export default class Remember extends BaseCommand {
  static override args = {
    content: Args.string({
      description: "Content of the memory to store",
      required: false,
    }),
  };

  static override description = "Add a memory to the database";

  static override examples = [
    '<%= config.bin %> <%= command.id %> "Remember to check the logs"',
    '<%= config.bin %> <%= command.id %> --type question "What is the meaning of life?"',
    '<%= config.bin %> <%= command.id %> --tags "work,important" "Finish the report"',
    '<%= config.bin %> <%= command.id %> --by alice "Meeting notes from standup"',
  ];

  static override flags = {
    type: Flags.string({
      char: "t",
      description: "Memory type (question/request/information)",
      options: ["question", "request", "information"],
    }),
    tags: Flags.string({
      description: "Comma-separated tags",
    }),
    by: Flags.string({
      description: "Creator identifier",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Remember);

    // Get content from args or prompt
    let content = args.content;
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
    if (flags.type && isValidMemoryType(flags.type)) {
      memoryType = flags.type;
    } else if (flags.type) {
      this.error(
        `Invalid memory type: ${flags.type}. Must be one of: question, request, information`
      );
    } else {
      // If no type flag, prompt if running interactively (no content arg)
      if (!args.content) {
        memoryType = (await select({
          message: "What type of memory is this?",
          choices: [
            { value: "information", name: "Information - A fact or piece of knowledge" },
            { value: "question", name: "Question - Something to ask or investigate" },
            { value: "request", name: "Request - An action or task to do" },
          ],
          default: this.config_.defaults.type,
        })) as MemoryType;
      } else {
        memoryType = this.config_.defaults.type;
      }
    }

    // Parse tags
    const tags = flags.tags
      ? flags.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    // Get creator
    const createdBy = flags.by ?? this.config_.defaults.createdBy;

    // Submit the memory
    const spinner = ora("Saving memory...").start();

    try {
      const memory = await this.apiClient.createMemory({
        content: content!.trim(),
        type: memoryType,
        tags,
        createdBy,
      });

      spinner.succeed("Memory saved successfully!");
      this.log("");
      this.log(`  ID: ${memory.id}`);
      this.log(`  Type: ${memory.type}`);
      this.log(`  Tags: ${this.formatTags(memory.tags)}`);
      this.log(`  Created by: ${memory.createdBy}`);
      this.log(`  Created at: ${this.formatDate(memory.createdAt)}`);
    } catch (error) {
      spinner.fail("Failed to save memory");
      this.handleApiError(error);
    }
  }
}
