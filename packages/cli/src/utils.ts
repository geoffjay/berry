import { loadConfig, type BerryConfig } from "./services/config.js";
import { ApiClient, ApiClientError } from "./services/api-client.js";

let cachedConfig: BerryConfig | null = null;
let cachedApiClient: ApiClient | null = null;

/**
 * Get the Berry configuration
 */
export function getConfig(): BerryConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Get the API client
 */
export function getApiClient(): ApiClient {
  if (!cachedApiClient) {
    cachedApiClient = new ApiClient(getConfig());
  }
  return cachedApiClient;
}

/**
 * Handle API errors with user-friendly messages
 */
export function handleApiError(error: unknown): never {
  if (error instanceof ApiClientError) {
    if (error.code === "CONNECTION_ERROR") {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    if (error.code === "TIMEOUT") {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    if (error.statusCode === 404) {
      console.error("Error: Resource not found");
      process.exit(1);
    }
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  console.error(`Error: ${String(error)}`);
  process.exit(1);
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Format tags for display
 */
export function formatTags(tags: string[]): string {
  if (tags.length === 0) {
    return "(none)";
  }
  return tags.map((tag) => `#${tag}`).join(" ");
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Validate ISO date format
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}
