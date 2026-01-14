import { Args } from "@oclif/core";
import { BaseCommand } from "../base-command.js";

/**
 * Command to retrieve a specific memory by ID
 */
export default class Recall extends BaseCommand {
  static override args = {
    id: Args.string({
      description: "ID of the memory to recall",
      required: true,
    }),
  };

  static override description = "Retrieve a specific memory by ID";

  static override examples = ["<%= config.bin %> <%= command.id %> abc123"];

  static override flags = {};

  async run(): Promise<void> {
    const { args } = await this.parse(Recall);

    try {
      const memory = await this.apiClient.getMemory(args.id);

      this.log("");
      this.log("=".repeat(60));
      this.log("Memory Details");
      this.log("=".repeat(60));
      this.log("");
      this.log(`ID:         ${memory.id}`);
      this.log(`Type:       ${memory.type}`);
      this.log(`Created by: ${memory.createdBy}`);
      this.log(`Created at: ${this.formatDate(memory.createdAt)}`);
      this.log(`Updated at: ${this.formatDate(memory.updatedAt)}`);
      this.log(`Tags:       ${this.formatTags(memory.tags)}`);
      this.log("");
      this.log("-".repeat(60));
      this.log("Content:");
      this.log("-".repeat(60));
      this.log("");
      this.log(memory.content);
      this.log("");
      this.log("=".repeat(60));
    } catch (error) {
      this.handleApiError(error);
    }
  }
}
