/**
 * Logger service for MCP server
 * Uses stderr for all output since stdout is reserved for MCP protocol
 */

let verboseEnabled = false;

/**
 * Enable or disable verbose logging
 */
export function setVerbose(enabled: boolean): void {
  verboseEnabled = enabled;
}

/**
 * Check if verbose logging is enabled
 */
export function isVerbose(): boolean {
  return verboseEnabled;
}

/**
 * Log a debug message (only when verbose is enabled)
 */
export function debug(message: string, data?: unknown): void {
  if (!verboseEnabled) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [DEBUG]`;

  if (data !== undefined) {
    console.error(
      `${prefix} ${message}`,
      typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    );
  } else {
    console.error(`${prefix} ${message}`);
  }
}

/**
 * Log an info message (only when verbose is enabled)
 */
export function info(message: string, data?: unknown): void {
  if (!verboseEnabled) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [INFO]`;

  if (data !== undefined) {
    console.error(
      `${prefix} ${message}`,
      typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    );
  } else {
    console.error(`${prefix} ${message}`);
  }
}

/**
 * Log an error message (always logged, regardless of verbose setting)
 */
export function error(message: string, err?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [ERROR]`;

  if (err !== undefined) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    console.error(`${prefix} ${message}: ${errorDetail}`);
  } else {
    console.error(`${prefix} ${message}`);
  }
}

/**
 * Log an HTTP request (only when verbose is enabled)
 */
export function logRequest(method: string, url: string, body?: unknown): void {
  if (!verboseEnabled) return;

  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [HTTP] --> ${method} ${url}`);

  if (body !== undefined) {
    console.error(`[${timestamp}] [HTTP] Request body:`, JSON.stringify(body, null, 2));
  }
}

/**
 * Log an HTTP response (only when verbose is enabled)
 */
export function logResponse(method: string, url: string, status: number, body?: unknown): void {
  if (!verboseEnabled) return;

  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [HTTP] <-- ${method} ${url} ${status}`);

  if (body !== undefined) {
    console.error(`[${timestamp}] [HTTP] Response body:`, JSON.stringify(body, null, 2));
  }
}
