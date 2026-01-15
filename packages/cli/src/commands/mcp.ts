import { startMcpServer } from "@berry/mcp";

export interface McpOptions {
  serverUrl?: string;
  verbose: boolean;
}

/**
 * Start the Berry MCP server for AI agent integration
 */
export async function mcpCommand(options: McpOptions): Promise<void> {
  try {
    await startMcpServer({
      serverUrl: options.serverUrl,
      verbose: options.verbose,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to start MCP server: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}
