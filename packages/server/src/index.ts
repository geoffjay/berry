/**
 * Berry Server - Main entry point
 *
 * A memory storage service using Hono and ChromaDB
 */

import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { honoLogger } from "@logtape/hono";
import { memoryRoutes } from "./routes/memory";
import { initializeChromaDB, getChromaDBService } from "./services/chromadb";
import { initializeLogging, getServerLogger } from "./services/logger";
import type { ApiResponse } from "./types";

const app = new Hono();

// Middleware - LogTape for structured logging, CORS for cross-origin requests
app.use("*", honoLogger({ category: ["berry", "http"] }));
app.use("*", cors());

// Global error handler
app.onError((err: Error, c: Context) => {
  const logger = getServerLogger("error");
  logger.error("Unhandled error: {message}", {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

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
  // Initialize logging first
  await initializeLogging();

  const logger = getServerLogger();
  const port = options.port ?? parseInt(process.env.PORT || "3000", 10);

  logger.info("Initializing Berry server...");
  logger.info("Connecting to ChromaDB...");

  try {
    await initializeChromaDB();
    logger.info("ChromaDB connection established");
    logger.info("Berry server is running", {
      url: `http://localhost:${port}`,
      port,
    });
    logger.info("Available endpoints", {
      endpoints: [
        "GET  /health",
        "GET  /v1/memory/:id",
        "POST /v1/memory",
        "DELETE /v1/memory/:id",
        "PATCH /v1/memory/:id/visibility",
        "POST /v1/search",
      ],
    });

    // Start the server and wait indefinitely
    Bun.serve({
      port,
      fetch: app.fetch,
    });

    // Keep the process running
    await new Promise(() => {});
  } catch (error) {
    logger.error("Failed to initialize ChromaDB", {
      error: error instanceof Error ? error.message : String(error),
    });
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
