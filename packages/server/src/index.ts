/**
 * Berry Server - Main entry point
 *
 * A memory storage service using Hono and ChromaDB
 */

import { Hono, type Context } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { memoryRoutes } from "./routes/memory";
import { initializeChromaDB, getChromaDBService } from "./services/chromadb";
import type { ApiResponse } from "./types";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Global error handler
app.onError((err: Error, c: Context) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);

  const response: ApiResponse<null> = {
    success: false,
    error: err.message || "Internal server error",
  };

  return c.json(response, 500);
});

// 404 handler
app.notFound((c: Context) => {
  const response: ApiResponse<null> = {
    success: false,
    error: "Not found",
  };
  return c.json(response, 404);
});

// Health check endpoint
app.get("/health", async (c: Context) => {
  const chromaDB = getChromaDBService();
  const chromaHealthy = await chromaDB.healthCheck();

  const status = {
    status: chromaHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      chromadb: chromaHealthy ? "connected" : "disconnected",
    },
  };

  const httpStatus = chromaHealthy ? 200 : 503;
  return c.json(status, httpStatus);
});

// Mount memory routes
app.route("/", memoryRoutes);

/**
 * Server startup options
 */
export interface ServerOptions {
  port?: number;
}

/**
 * Start the Berry server
 */
export async function startServer(options: ServerOptions = {}): Promise<void> {
  const port = options.port ?? parseInt(process.env.PORT || "3000", 10);

  console.log("Initializing Berry server...");
  console.log("Connecting to ChromaDB...");

  try {
    await initializeChromaDB();
    console.log("ChromaDB connection established.");
    console.log(`Berry server is running at http://localhost:${port}`);
    console.log("Available endpoints:");
    console.log("  GET  /health         - Health check");
    console.log("  GET  /v1/memory/:id  - Get memory by ID");
    console.log("  POST /v1/memory      - Create new memory");
    console.log("  DELETE /v1/memory/:id - Delete memory by ID");
    console.log("  POST /v1/search      - Search memories");

    // Start the server and wait indefinitely
    Bun.serve({
      port,
      fetch: app.fetch,
    });

    // Keep the process running
    await new Promise(() => {});
  } catch (error) {
    console.error("Failed to initialize ChromaDB:", error);
    process.exit(1);
  }
}

// Run directly if this is the main module
const isMainModule = import.meta.main || process.argv[1]?.endsWith("index.ts");
if (isMainModule) {
  startServer();
}

// Export app for testing
export { app };
