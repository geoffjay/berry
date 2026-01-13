import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse, ParseError, printParseErrorCode } from 'jsonc-parser';

/**
 * Configuration schema for the Berry CLI
 */
export interface BerryConfig {
  server: {
    url: string;
    timeout: number;
  };
  defaults: {
    type: MemoryType;
    createdBy: string;
  };
}

export type MemoryType = 'question' | 'request' | 'information';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: BerryConfig = {
  server: {
    url: 'http://localhost:3000',
    timeout: 5000,
  },
  defaults: {
    type: 'information',
    createdBy: 'user',
  },
};

/**
 * Get the path to the config file
 */
export function getConfigPath(): string {
  return join(homedir(), '.config', 'berry', 'config.jsonc');
}

/**
 * Load and parse the Berry configuration file
 * Falls back to defaults if file doesn't exist or is invalid
 */
export function loadConfig(): BerryConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const errors: ParseError[] = [];
    const parsed = parse(content, errors, {
      allowTrailingComma: true,
      disallowComments: false,
    });

    if (errors.length > 0) {
      const errorMessages = errors.map((e) => printParseErrorCode(e.error)).join(', ');
      console.warn(`Warning: Config file has parse errors: ${errorMessages}`);
      console.warn('Using default configuration.');
      return DEFAULT_CONFIG;
    }

    // Deep merge with defaults to ensure all required fields exist
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Failed to load config: ${message}`);
    console.warn('Using default configuration.');
    return DEFAULT_CONFIG;
  }
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(defaults: BerryConfig, overrides: Partial<BerryConfig>): BerryConfig {
  return {
    server: {
      ...defaults.server,
      ...overrides.server,
    },
    defaults: {
      ...defaults.defaults,
      ...overrides.defaults,
    },
  };
}

/**
 * Validate that a string is a valid memory type
 */
export function isValidMemoryType(value: string): value is MemoryType {
  return ['question', 'request', 'information'].includes(value);
}
