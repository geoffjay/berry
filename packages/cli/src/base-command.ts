import { Command } from '@oclif/core';
import { loadConfig, type BerryConfig } from './services/config.js';
import { ApiClient, ApiClientError } from './services/api-client.js';

/**
 * Base command class with shared functionality for all Berry CLI commands
 */
export abstract class BaseCommand extends Command {
  protected config_!: BerryConfig;
  protected apiClient!: ApiClient;

  /**
   * Initialize the command with configuration and API client
   */
  async init(): Promise<void> {
    await super.init();
    this.config_ = loadConfig();
    this.apiClient = new ApiClient(this.config_);
  }

  /**
   * Handle API errors with user-friendly messages
   */
  protected handleApiError(error: unknown): never {
    if (error instanceof ApiClientError) {
      if (error.code === 'CONNECTION_ERROR') {
        this.error(error.message, { exit: 1 });
      }
      if (error.code === 'TIMEOUT') {
        this.error(error.message, { exit: 1 });
      }
      if (error.statusCode === 404) {
        this.error('Resource not found', { exit: 1 });
      }
      this.error(error.message, { exit: 1 });
    }

    if (error instanceof Error) {
      this.error(error.message, { exit: 1 });
    }

    this.error(String(error), { exit: 1 });
  }

  /**
   * Format a date string for display
   */
  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  /**
   * Format tags for display
   */
  protected formatTags(tags: string[]): string {
    if (tags.length === 0) {
      return '(none)';
    }
    return tags.map((tag) => `#${tag}`).join(' ');
  }

  /**
   * Truncate text to a maximum length
   */
  protected truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 3) + '...';
  }
}
