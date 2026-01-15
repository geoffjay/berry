import { startServer } from "@berry/server";

export interface ServeOptions {
  port: number;
  foreground: boolean;
}

/**
 * Start the Berry server
 */
export async function serveCommand(options: ServeOptions): Promise<void> {
  if (options.foreground) {
    await runForeground(options.port);
  } else {
    await runBackground(options.port);
  }
}

/**
 * Run server in foreground (same process)
 */
async function runForeground(port: number): Promise<void> {
  console.log(`Starting Berry server on port ${port}...`);
  await startServer({ port });
}

/**
 * Run server in background (spawns self with internal command)
 */
async function runBackground(port: number): Promise<void> {
  console.log(`Starting Berry server in background on port ${port}...`);

  // Re-execute self with internal serve command
  const proc = Bun.spawn([process.execPath, "$internal-serve", "--port", String(port)], {
    env: { ...process.env },
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
