import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { isValidMemoryType } from '../services/config.js';

/**
 * Command to search memories using vector similarity
 */
export default class Search extends BaseCommand {
  static override args = {
    query: Args.string({
      description: 'Search query',
      required: true,
    }),
  };

  static override description = 'Search memories using vector similarity';

  static override examples = [
    '<%= config.bin %> <%= command.id %> "meeting notes"',
    '<%= config.bin %> <%= command.id %> "project ideas" --type information --limit 5',
    '<%= config.bin %> <%= command.id %> "todo" --tags "work,urgent"',
    '<%= config.bin %> <%= command.id %> "bugs" --from 2024-01-01 --to 2024-12-31',
  ];

  static override flags = {
    type: Flags.string({
      char: 't',
      description: 'Filter by memory type',
      options: ['question', 'request', 'information'],
    }),
    tags: Flags.string({
      description: 'Filter by tags (comma-separated)',
    }),
    limit: Flags.integer({
      char: 'l',
      description: 'Number of results to return',
      default: 10,
    }),
    from: Flags.string({
      description: 'Start date filter (ISO format)',
    }),
    to: Flags.string({
      description: 'End date filter (ISO format)',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Search);

    // Validate type flag
    if (flags.type && !isValidMemoryType(flags.type)) {
      this.error(`Invalid memory type: ${flags.type}. Must be one of: question, request, information`);
    }

    // Validate date formats
    if (flags.from && !this.isValidDate(flags.from)) {
      this.error(`Invalid date format for --from: ${flags.from}. Use ISO format (e.g., 2024-01-01)`);
    }
    if (flags.to && !this.isValidDate(flags.to)) {
      this.error(`Invalid date format for --to: ${flags.to}. Use ISO format (e.g., 2024-12-31)`);
    }

    // Parse tags
    const tags = flags.tags
      ? flags.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : undefined;

    try {
      const results = await this.apiClient.searchMemories({
        query: args.query,
        type: flags.type as 'question' | 'request' | 'information' | undefined,
        tags,
        limit: flags.limit,
        from: flags.from,
        to: flags.to,
      });

      if (results.length === 0) {
        this.log('No memories found matching your query.');
        return;
      }

      this.log(`Found ${results.length} memory${results.length === 1 ? '' : 'ies'}:\n`);

      // Display results in a formatted table
      this.printTable(results);
    } catch (error) {
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
   * Print search results in a formatted table
   */
  private printTable(results: Array<{ memory: { id: string; content: string; type: string; tags: string[]; createdBy: string; createdAt: string }; score: number }>): void {
    // Calculate column widths
    const idWidth = 8;
    const typeWidth = 12;
    const contentWidth = 40;
    const tagsWidth = 20;
    const scoreWidth = 8;

    // Print header
    const header = [
      'ID'.padEnd(idWidth),
      'Type'.padEnd(typeWidth),
      'Content'.padEnd(contentWidth),
      'Tags'.padEnd(tagsWidth),
      'Score'.padEnd(scoreWidth),
    ].join(' | ');

    const separator = '-'.repeat(header.length);

    this.log(header);
    this.log(separator);

    // Print rows
    for (const result of results) {
      const { memory, score } = result;

      const row = [
        this.truncate(memory.id, idWidth).padEnd(idWidth),
        memory.type.padEnd(typeWidth),
        this.truncate(memory.content.replace(/\n/g, ' '), contentWidth).padEnd(contentWidth),
        this.truncate(this.formatTags(memory.tags), tagsWidth).padEnd(tagsWidth),
        score.toFixed(3).padStart(scoreWidth),
      ].join(' | ');

      this.log(row);
    }

    this.log('');
    this.log(`Use 'berry recall <id>' to view full memory details.`);
  }
}
