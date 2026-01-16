import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse, ParseError, printParseErrorCode } from "jsonc-parser";

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

export type MemoryType = "question" | "request" | "information";

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: BerryConfig = {
  server: {
    url: "http://localhost:3000",
    timeout: 5000,
  },
  defaults: {
    type: "information",
    createdBy: "user",
  },
};

/**
 * Get the path to the config file
 * Respects XDG_CONFIG_HOME if set, otherwise uses ~/.config
 */
export function getConfigPath(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  const configBase = xdgConfigHome || join(homedir(), ".config");
  return join(configBase, "berry", "config.jsonc");
}

/**
 * Load and parse the Berry configuration file
 * Falls back to defaults if file doesn't exist or is invalid
 */
export function loadConfig(): BerryConfig {
  const configPath = getConfigPath();
  let config: BerryConfig;

  if (!existsSync(configPath)) {
    config = DEFAULT_CONFIG;
  } else {
    try {
      const content = readFileSync(configPath, "utf-8");
      const errors: ParseError[] = [];
      const parsed = parse(content, errors, {
        allowTrailingComma: true,
        disallowComments: false,
      });

      if (errors.length > 0) {
        const errorMessages = errors.map((e) => printParseErrorCode(e.error)).join(", ");
        console.warn(`Warning: Config file has parse errors: ${errorMessages}`);
        console.warn("Using default configuration.");
        config = DEFAULT_CONFIG;
      } else {
        // Deep merge with defaults to ensure all required fields exist
        config = mergeConfig(DEFAULT_CONFIG, parsed);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Failed to load config: ${message}`);
      console.warn("Using default configuration.");
      config = DEFAULT_CONFIG;
    }
  }

  // Apply environment variable overrides (env vars take precedence)
  return applyEnvOverrides(config);
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
 * Apply environment variable overrides to config
 * Environment variables take precedence over config file values
 */
function applyEnvOverrides(config: BerryConfig): BerryConfig {
  return {
    ...config,
    server: {
      ...config.server,
      url: process.env.BERRY_SERVER_URL || config.server.url,
      timeout: process.env.BERRY_TIMEOUT
        ? parseInt(process.env.BERRY_TIMEOUT, 10)
        : config.server.timeout,
    },
  };
}

/**
 * Validate that a string is a valid memory type
 */
export function isValidMemoryType(value: string): value is MemoryType {
  return ["question", "request", "information"].includes(value);
}
