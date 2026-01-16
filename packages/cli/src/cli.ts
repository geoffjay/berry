#!/usr/bin/env bun
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { rememberCommand } from "./commands/remember.js";
import { recallCommand } from "./commands/recall.js";
import { forgetCommand } from "./commands/forget.js";
import { searchCommand } from "./commands/search.js";
import { serveCommand } from "./commands/serve.js";
import { mcpCommand } from "./commands/mcp.js";
import { initCommand } from "./commands/init.js";
import { interactiveCommand } from "./commands/index.js";

const VERSION = process.env.BERRY_VERSION || "0.1.0";

await yargs(hideBin(process.argv))
  .scriptName("berry")
  .version(VERSION)
  .command(
    "$0",
    "Launch Berry interactive mode for memory input",
    () => {},
    async () => {
      await interactiveCommand();
    }
  )
  .command(
    "remember [content]",
    "Add a memory to the database",
    (yargs) =>
      yargs
        .positional("content", {
          type: "string",
          description: "Content of the memory to store",
        })
        .option("type", {
          alias: "t",
          type: "string",
          description: "Memory type (question/request/information)",
          choices: ["question", "request", "information"] as const,
        })
        .option("tags", {
          type: "string",
          description: "Comma-separated tags",
        })
        .option("by", {
          type: "string",
          description: "Creator identifier",
        })
        .option("references", {
          alias: "r",
          type: "string",
          description: "Comma-separated memory IDs to reference",
        }),
    async (argv) => {
      await rememberCommand({
        content: argv.content,
        type: argv.type,
        tags: argv.tags,
        by: argv.by,
        references: argv.references,
      });
    }
  )
  .command(
    "recall <id>",
    "Retrieve a specific memory by ID",
    (yargs) =>
      yargs.positional("id", {
        type: "string",
        description: "ID of the memory to recall",
        demandOption: true,
      }),
    async (argv) => {
      await recallCommand(argv.id!);
    }
  )
  .command(
    "forget <id>",
    "Remove a memory from the database",
    (yargs) =>
      yargs.positional("id", {
        type: "string",
        description: "ID of the memory to forget",
        demandOption: true,
      }),
    async (argv) => {
      await forgetCommand(argv.id!);
    }
  )
  .command(
    "search <query>",
    "Search memories using vector similarity",
    (yargs) =>
      yargs
        .positional("query", {
          type: "string",
          description: "Search query",
          demandOption: true,
        })
        .option("as-actor", {
          alias: "a",
          type: "string",
          description: "Actor ID for visibility filtering (see only memories accessible to this actor)",
        })
        .option("type", {
          alias: "t",
          type: "string",
          description: "Filter by memory type",
          choices: ["question", "request", "information"] as const,
        })
        .option("tags", {
          type: "string",
          description: "Filter by tags (comma-separated)",
        })
        .option("references", {
          alias: "r",
          type: "string",
          description: "Filter by referenced memory IDs (comma-separated)",
        })
        .option("limit", {
          alias: "l",
          type: "number",
          description: "Number of results to return",
          default: 10,
        })
        .option("from", {
          type: "string",
          description: "Start date filter (ISO format)",
        })
        .option("to", {
          type: "string",
          description: "End date filter (ISO format)",
        }),
    async (argv) => {
      await searchCommand({
        query: argv.query!,
        asActor: argv["as-actor"],
        type: argv.type,
        tags: argv.tags,
        references: argv.references,
        limit: argv.limit,
        from: argv.from,
        to: argv.to,
      });
    }
  )
  .command(
    "serve",
    "Start the Berry server",
    (yargs) =>
      yargs
        .option("port", {
          alias: "p",
          type: "number",
          description: "Port to listen on",
          default: 4114,
        })
        .option("foreground", {
          alias: "f",
          type: "boolean",
          description: "Run in foreground (default: background)",
          default: false,
        }),
    async (argv) => {
      await serveCommand({
        port: argv.port,
        foreground: argv.foreground,
      });
    }
  )
  .command(
    "mcp",
    "Start the Berry MCP server for AI agent integration",
    (yargs) =>
      yargs
        .option("server-url", {
          alias: "s",
          type: "string",
          description: "Berry server URL (defaults to config file value)",
        })
        .option("verbose", {
          alias: "v",
          type: "boolean",
          description: "Enable verbose logging for debugging",
          default: false,
        }),
    async (argv) => {
      await mcpCommand({
        serverUrl: argv["server-url"],
        verbose: argv.verbose,
      });
    }
  )
  .command(
    "init",
    "Initialize Berry configuration",
    () => {},
    async () => {
      await initCommand();
    }
  )
  .command(
    "$internal-serve",
    false, // Hidden command
    (yargs) =>
      yargs.option("port", {
        alias: "p",
        type: "number",
        description: "Port to listen on",
        default: 4114,
      }),
    async (argv) => {
      // Internal command used by background serve mode
      const { startServer } = await import("@berry/server");
      await startServer({ port: argv.port });
    }
  )
  .example("berry", "Start interactive mode")
  .example("berry init", "Create default configuration")
  .example('berry remember "Buy milk"', "Quick add a memory")
  .example('berry search "meeting notes"', "Search memories")
  .example("berry serve --foreground", "Start server in foreground")
  .strict()
  .help()
  .alias("h", "help")
  .parse();
