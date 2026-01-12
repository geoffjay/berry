import { input, select, confirm } from '@inquirer/prompts';
import ora from 'ora';
import { BaseCommand } from '../base-command.js';
import { type MemoryType } from '../services/config.js';

/**
 * Default command that launches interactive mode for memory input
 */
export default class Default extends BaseCommand {
  static override description = 'Launch Berry interactive mode for memory input';

  static override examples = ['<%= config.bin %>'];

  async run(): Promise<void> {
    this.log('');
    this.log('  Berry - Interactive Memory Input');
    this.log('  ================================');
    this.log('');

    let continueSession = true;

    while (continueSession) {
      try {
        // Get content
        const content = await input({
          message: 'What would you like to remember?',
          validate: (value: string) => {
            if (!value.trim()) {
              return 'Content cannot be empty';
            }
            return true;
          },
        });

        // Get type
        const memoryType = (await select({
          message: 'What type of memory is this?',
          choices: [
            {
              value: 'information',
              name: 'Information - A fact or piece of knowledge',
            },
            {
              value: 'question',
              name: 'Question - Something to ask or investigate',
            },
            { value: 'request', name: 'Request - An action or task to do' },
          ],
          default: this.config_.defaults.type,
        })) as MemoryType;

        // Get tags
        const tagsInput = await input({
          message: 'Tags (comma-separated, or press Enter to skip):',
        });

        const tags = tagsInput
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);

        // Get createdBy
        const createdBy = await input({
          message: 'Created by:',
          default: this.config_.defaults.createdBy,
        });

        // Save the memory
        const spinner = ora('Saving memory...').start();

        try {
          const memory = await this.apiClient.createMemory({
            content: content.trim(),
            type: memoryType,
            tags,
            createdBy,
          });

          spinner.succeed('Memory saved successfully!');
          this.log('');
          this.log(`  ID: ${memory.id}`);
          this.log(`  Type: ${memory.type}`);
          this.log(`  Tags: ${this.formatTags(memory.tags)}`);
          this.log(`  Created by: ${memory.createdBy}`);
          this.log(`  Created at: ${this.formatDate(memory.createdAt)}`);
          this.log('');
        } catch (error) {
          spinner.fail('Failed to save memory');
          this.handleApiError(error);
        }

        // Ask if they want to add another
        continueSession = await confirm({
          message: 'Add another memory?',
          default: true,
        });
      } catch (error) {
        // Handle Ctrl+C gracefully
        if (
          error instanceof Error &&
          error.message.includes('User force closed')
        ) {
          this.log('');
          this.log('Goodbye!');
          break;
        }
        throw error;
      }
    }

    this.log('');
    this.log('Session ended. Use `berry remember` for quick one-off memories.');
  }
}
