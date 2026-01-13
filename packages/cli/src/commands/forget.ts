import { Args } from '@oclif/core';
import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import { BaseCommand } from '../base-command.js';

/**
 * Command to remove a memory by ID
 */
export default class Forget extends BaseCommand {
  static override args = {
    id: Args.string({
      description: 'ID of the memory to forget',
      required: true,
    }),
  };

  static override description = 'Remove a memory from the database';

  static override examples = ['<%= config.bin %> <%= command.id %> abc123'];

  static override flags = {};

  async run(): Promise<void> {
    const { args } = await this.parse(Forget);

    // First, try to fetch the memory to show what will be deleted
    let memoryContent: string | undefined;
    try {
      const memory = await this.apiClient.getMemory(args.id);
      memoryContent = memory.content;
    } catch {
      // Memory might not exist, we'll get an error during delete
    }

    // Show memory preview if available
    if (memoryContent) {
      this.log(`Memory to delete:`);
      this.log(`  "${this.truncate(memoryContent, 60)}"`);
      this.log('');
    }

    // Prompt for confirmation
    const confirmed = await confirm({
      message: `Are you sure you want to forget memory ${args.id}? This action cannot be undone.`,
      default: false,
    });

    if (!confirmed) {
      this.log('Deletion cancelled.');
      return;
    }

    // Delete the memory
    const spinner = ora('Forgetting memory...').start();

    try {
      await this.apiClient.deleteMemory(args.id);
      spinner.succeed('Memory forgotten successfully.');
    } catch (error) {
      spinner.fail('Failed to forget memory');
      this.handleApiError(error);
    }
  }
}
