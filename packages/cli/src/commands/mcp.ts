import { Flags } from "@oclif/core";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BaseCommand } from "../base-command.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Command to start the Berry MCP server
 */
export default class MCP extends BaseCommand {
  static override description = "Start the Berry MCP server for AI agent integration";

  static override examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --server-url http://localhost:4114",
  ];

  static override flags = {
    "server-url": Flags.string({
      char: "s",
      description: "Berry server URL (defaults to config file value)",
    }),
    verbose: Flags.boolean({
      char: "v",
      description: "Enable verbose logging for debugging",
      default: false,
    }),
  };

  // Skip API client initialization for mcp command
  protected skipApiClientInit = true;

  async run(): Promise<void> {
    const { flags } = await this.parse(MCP);

    try {
      const mcpPath = await this.resolveMcpPath();
      // Only pass server URL if explicitly provided via flag
      // Otherwise let MCP server read from config file
      await this.runMcpServer(mcpPath, flags["server-url"], flags.verbose);
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to start MCP server: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Resolve the path to the MCP server package
   */
  private async resolveMcpPath(): Promise<string> {
    // Development: sibling package (from dist/commands/)
    const devPaths = [
      resolve(__dirname, "../../../../mcp/src/index.ts"),
      resolve(__dirname, "../../../../mcp/dist/index.js"),
      // From src/commands/ during development
      resolve(__dirname, "../../../mcp/src/index.ts"),
      resolve(__dirname, "../../../mcp/dist/index.js"),
    ];

    for (const mcpPath of devPaths) {
      const file = Bun.file(mcpPath);
      if (await file.exists()) {
        return mcpPath;
      }
    }

    throw new Error(
      "Could not find @berry/mcp. Make sure you are in the Berry workspace directory."
    );
  }

  /**
   * Run MCP server (always foreground for stdio transport)
   */
  private async runMcpServer(
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
}
