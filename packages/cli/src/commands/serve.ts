import { Flags } from '@oclif/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseCommand } from '../base-command.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Command to start the Berry server
 */
export default class Serve extends BaseCommand {
  static override description = 'Start the Berry server';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --port 4114',
    '<%= config.bin %> <%= command.id %> --foreground',
  ];

  static override flags = {
    port: Flags.integer({
      char: 'p',
      description: 'Port to listen on',
      default: 4114,
    }),
    foreground: Flags.boolean({
      char: 'f',
      description: 'Run in foreground (default: background)',
      default: false,
    }),
  };

  // Skip API client initialization for serve command
  protected skipApiClientInit = true;

  async run(): Promise<void> {
    const { flags } = await this.parse(Serve);

    try {
      const serverPath = await this.resolveServerPath();

      if (flags.foreground) {
        await this.runForeground(serverPath, flags.port);
      } else {
        await this.runBackground(serverPath, flags.port);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to start server: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Resolve the path to the server package
   */
  private async resolveServerPath(): Promise<string> {
    // Development: sibling package (from dist/commands/)
    const devPaths = [
      resolve(__dirname, '../../../../server/src/index.ts'),
      resolve(__dirname, '../../../../server/dist/index.js'),
      // From src/commands/ during development
      resolve(__dirname, '../../../server/src/index.ts'),
      resolve(__dirname, '../../../server/dist/index.js'),
    ];

    for (const serverPath of devPaths) {
      const file = Bun.file(serverPath);
      if (await file.exists()) {
        return serverPath;
      }
    }

    throw new Error(
      'Could not find @berry/server. Make sure you are in the Berry workspace directory.'
    );
  }

  /**
   * Run server in foreground
   */
  private async runForeground(serverPath: string, port: number): Promise<void> {
    this.log(`Starting Berry server on port ${port}...`);

    const proc = Bun.spawn(['bun', 'run', serverPath], {
      env: { ...process.env, PORT: String(port) },
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });

    // Wait for the process
    await proc.exited;
  }

  /**
   * Run server in background
   */
  private async runBackground(serverPath: string, port: number): Promise<void> {
    this.log(`Starting Berry server in background on port ${port}...`);

    const proc = Bun.spawn(['bun', 'run', serverPath], {
      env: { ...process.env, PORT: String(port) },
      stdout: 'ignore',
      stderr: 'pipe',
      stdin: 'ignore',
      detached: true,
    });

    // Give the server a moment to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if server started successfully
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) {
        this.log(`Berry server running at http://localhost:${port}`);
        this.log(`Process ID: ${proc.pid}`);
        this.log('\nTo stop the server: kill ' + proc.pid);
        // Allow CLI to exit while server continues running
        proc.unref();
      } else {
        this.error('Server started but health check failed');
      }
    } catch {
      // Read any error output
      const stderr = await new Response(proc.stderr).text();
      if (stderr) {
        this.error(`Server failed to start: ${stderr}`);
      } else {
        this.error('Server failed to start. Check if ChromaDB is running.');
      }
    }
  }
}
