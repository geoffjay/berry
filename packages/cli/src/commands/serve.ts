import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServeOptions {
  port: number;
  foreground: boolean;
}

/**
 * Start the Berry server
 */
export async function serveCommand(options: ServeOptions): Promise<void> {
  try {
    const serverPath = await resolveServerPath();

    if (options.foreground) {
      await runForeground(serverPath, options.port);
    } else {
      await runBackground(serverPath, options.port);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to start server: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Resolve the path to the server package
 */
async function resolveServerPath(): Promise<string> {
  // Development: sibling package (from dist/commands/)
  const devPaths = [
    resolve(__dirname, "../../../../server/src/index.ts"),
    resolve(__dirname, "../../../../server/dist/index.js"),
    // From src/commands/ during development
    resolve(__dirname, "../../../server/src/index.ts"),
    resolve(__dirname, "../../../server/dist/index.js"),
    // From compiled binary (bunfs)
    resolve(__dirname, "../../server/src/index.ts"),
    resolve(__dirname, "../../server/dist/index.js"),
  ];

  for (const serverPath of devPaths) {
    const file = Bun.file(serverPath);
    if (await file.exists()) {
      return serverPath;
    }
  }

  throw new Error(
    "Could not find @berry/server. Make sure you are in the Berry workspace directory."
  );
}

/**
 * Run server in foreground
 */
async function runForeground(serverPath: string, port: number): Promise<void> {
  console.log(`Starting Berry server on port ${port}...`);

  const proc = Bun.spawn(["bun", "run", serverPath], {
    env: { ...process.env, PORT: String(port) },
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  // Wait for the process
  await proc.exited;
}

/**
 * Run server in background
 */
async function runBackground(serverPath: string, port: number): Promise<void> {
  console.log(`Starting Berry server in background on port ${port}...`);

  const proc = Bun.spawn(["bun", "run", serverPath], {
    env: { ...process.env, PORT: String(port) },
    stdout: "ignore",
    stderr: "pipe",
    stdin: "ignore",
    detached: true,
  });

  // Give the server a moment to start
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Check if server started successfully
  try {
    const response = await fetch(`http://localhost:${port}/health`);
    if (response.ok) {
      console.log(`Berry server running at http://localhost:${port}`);
      console.log(`Process ID: ${proc.pid}`);
      console.log("\nTo stop the server: kill " + proc.pid);
      // Allow CLI to exit while server continues running
      proc.unref();
    } else {
      console.error("Server started but health check failed");
      process.exit(1);
    }
  } catch {
    // Read any error output
    const stderr = await new Response(proc.stderr).text();
    if (stderr) {
      console.error(`Server failed to start: ${stderr}`);
    } else {
      console.error("Server failed to start. Check if ChromaDB is running.");
    }
    process.exit(1);
  }
}
