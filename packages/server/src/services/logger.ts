/**
 * Structured logging configuration using LogTape
 */

import {
  configure,
  getConsoleSink,
  getLogger,
  type LogLevel,
  type LogRecord,
} from "@logtape/logtape";

/**
 * Initialize the LogTape logging system
 * Call this once at server startup before any logging occurs
 */
export async function initializeLogging(): Promise<void> {
  const logLevel = (process.env.LOG_LEVEL || "info") as LogLevel;

  await configure({
    sinks: {
      console: getConsoleSink({
        formatter: formatLogRecord,
      }),
    },
    loggers: [
      {
        category: ["berry"],
        lowestLevel: logLevel,
        sinks: ["console"],
      },
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["console"],
      },
    ],
  });
}

/**
 * Format log records as structured JSON
 */
function formatLogRecord(record: LogRecord): string {
  const timestamp = new Date(record.timestamp).toISOString();
  const category = record.category.join(".");

  const logEntry: Record<string, unknown> = {
    timestamp,
    level: record.level.toUpperCase(),
    category,
    message: record.message.join(""),
  };

  // Add any additional properties from the log record
  for (const [key, value] of Object.entries(record.properties)) {
    logEntry[key] = value;
  }

  return JSON.stringify(logEntry);
}

/**
 * Get a logger for the Berry server
 */
export function getServerLogger(component?: string) {
  const category = component ? ["berry", "server", component] : ["berry", "server"];
  return getLogger(category);
}

/**
 * Get a logger for ChromaDB service
 */
export function getChromaLogger() {
  return getLogger(["berry", "chromadb"]);
}

/**
 * Get a logger for API routes
 */
export function getRouteLogger() {
  return getLogger(["berry", "routes"]);
}
