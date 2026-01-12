import { Command } from '@oclif/core';

/**
 * Command to display version information
 */
export default class Version extends Command {
  static override description = 'Display version information';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  async run(): Promise<void> {
    this.log(this.config.userAgent);
  }
}
