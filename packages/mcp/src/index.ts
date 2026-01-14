#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  handleRemember,
  handleRecall,
  handleForget,
  handleSearch,
  type RememberInput,
  type RecallInput,
  type ForgetInput,
  type SearchInput,
} from "./tools/index.js";
import { ApiClientError } from "./services/api-client.js";
import { setVerbose, info, debug, error as logError } from "./services/logger.js";
import { getConfig, getConfigPath } from "./services/config.js";

// Parse command-line arguments
const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");

/**
 * Berry MCP Server
 *
 * Provides tools for AI agents to interact with the Berry memory system:
 * - remember: Store a new memory
 * - recall: Retrieve a memory by ID
 * - forget: Delete a memory
 * - search: Search memories using vector similarity
 */

const server = new Server(
  {
    name: "berry",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools = [
  {
    name: "remember",
    description:
      "Store a new memory in Berry. Use this to save information, questions, or requests for later retrieval.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description: "The memory content to store",
        },
        type: {
          type: "string",
          enum: ["question", "request", "information"],
          description: "The type of memory (default: information)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization",
        },
        createdBy: {
          type: "string",
          description: "Identifier for who created this memory",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "recall",
    description: "Retrieve a specific memory by its ID. Returns the full memory details.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The memory ID to retrieve",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "forget",
    description: "Delete a memory by its ID. This action is permanent and cannot be undone.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The memory ID to delete",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "search",
    description:
      "Search memories using vector similarity. Returns memories matching the query, optionally filtered by type, tags, or date range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query for vector similarity matching",
        },
        type: {
          type: "string",
          enum: ["question", "request", "information"],
          description: "Filter by memory type",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags (matches if any tag is present)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
        },
        from: {
          type: "string",
          description: "Start date filter in ISO format (e.g., 2024-01-01)",
        },
        to: {
          type: "string",
          description: "End date filter in ISO format (e.g., 2024-12-31)",
        },
      },
      required: ["query"],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  debug(`Tool called: ${name}`, args);

  try {
    let result: string;

    switch (name) {
      case "remember":
        result = await handleRemember(args as unknown as RememberInput);
        break;
      case "recall":
        result = await handleRecall(args as unknown as RecallInput);
        break;
      case "forget":
        result = await handleForget(args as unknown as ForgetInput);
        break;
      case "search":
        result = await handleSearch(args as unknown as SearchInput);
        break;
      default:
        logError(`Unknown tool: ${name}`);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }

    debug(`Tool ${name} completed successfully`);
    return {
      content: [{ type: "text" as const, text: result }],
    };
  } catch (error) {
    logError(`Tool ${name} failed`, error);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: error instanceof ApiClientError ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  // Initialize verbose logging if requested
  setVerbose(verbose);

  if (verbose) {
    const config = getConfig();
    const configPath = getConfigPath();

    info("Berry MCP Server starting in verbose mode");
    info(`Config file path: ${configPath}`);
    info("Loaded configuration:", {
      serverUrl: config.server.url,
      timeout: config.server.timeout,
      defaults: config.defaults,
    });
    info(
      `Environment overrides: BERRY_SERVER_URL=${process.env.BERRY_SERVER_URL || "(not set)"}, BERRY_TIMEOUT=${process.env.BERRY_TIMEOUT || "(not set)"}`
    );
  }

  const transport = new StdioServerTransport();

  debug("Connecting to stdio transport...");
  await server.connect(transport);
  info("MCP server connected and ready");
}

main().catch((error) => {
  logError("Failed to start MCP server", error);
  process.exit(1);
});
