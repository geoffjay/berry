import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface McpOptions {
  serverUrl?: string;
  verbose: boolean;
}

/**
 * Start the Berry MCP server for AI agent integration
 */
export async function mcpCommand(options: McpOptions): Promise<void> {
  try {
    const mcpPath = await resolveMcpPath();
    await runMcpServer(mcpPath, options.serverUrl, options.verbose);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to start MCP server: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Resolve the path to the MCP server package
 */
async function resolveMcpPath(): Promise<string> {
  // Development: sibling package (from dist/commands/)
  const devPaths = [
    resolve(__dirname, "../../../../mcp/src/index.ts"),
    resolve(__dirname, "../../../../mcp/dist/index.js"),
    // From src/commands/ during development
    resolve(__dirname, "../../../mcp/src/index.ts"),
    resolve(__dirname, "../../../mcp/dist/index.js"),
    // From compiled binary (bunfs)
    resolve(__dirname, "../../mcp/src/index.ts"),
    resolve(__dirname, "../../mcp/dist/index.js"),
  ];

  for (const mcpPath of devPaths) {
    const file = Bun.file(mcpPath);
    if (await file.exists()) {
      return mcpPath;
    }
  }

  throw new Error("Could not find @berry/mcp. Make sure you are in the Berry workspace directory.");
}

/**
 * Run MCP server (always foreground for stdio transport)
 */
async function runMcpServer(
  mcpPath: string,
  serverUrl: string | undefined,
  verbose: boolean
): Promise<void> {
  // Build environment - only include BERRY_SERVER_URL if explicitly provided
  const env: Record<string, string | undefined> = { ...process.env };

  if (serverUrl) {
    env.BERRY_SERVER_URL = serverUrl;
  }

  // Build command args
  const args = ["bun", "run", mcpPath];
  if (verbose) {
    args.push("--verbose");
  }

  const proc = Bun.spawn(args, {
    env,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  // Wait for the process to exit
  await proc.exited;
}
