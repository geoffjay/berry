# Developing Berry

This guide covers setting up a local development environment for the Berry project.

## Prerequisites

- [Bun](https://bun.sh/) runtime
- [Docker](https://www.docker.com/) for running ChromaDB
- [Overmind](https://github.com/DarthSim/overmind) process manager

## Setup

```bash
# Install dependencies
bun install

# Build packages
bun run build
```

## Running the Services

Berry requires two services to be running:

1. **ChromaDB** - Vector database for storing memories
2. **Berry Server** - HTTP API server

Both services are managed via Overmind using the `Procfile` at the project root.

### Start Services

```bash
overmind start
```

This starts:

- ChromaDB on port 8000 (via Docker)
- Berry server on port 4114

### Environment Configuration

The `.overmind.env` file contains environment variables for the services:

```
PORT=4114
OVERMIND_NO_PORT=1
```

`OVERMIND_NO_PORT=1` is required to prevent Overmind from auto-assigning ports to processes.

### Managing Services

```bash
# View logs for a specific service
overmind connect server

# Restart a service
overmind restart server

# Stop all services
overmind kill
```

## CLI Development

### Configuration

Create `~/.config/berry/config.jsonc`:

```jsonc
{
  "server": {
    "url": "http://localhost:4114",
    "timeout": 5000,
  },
  "defaults": {
    "type": "information",
    "createdBy": "user",
  },
}
```

### Linking the CLI

The CLI uses interactive prompts that require a proper TTY connection. Running through `bun run --filter` or similar package manager commands doesn't properly pass through stdin, causing interactive prompts to hang.

To develop and test the CLI, link it globally:

```bash
cd packages/cli
bun link
```

This creates both `berry` and `berry-dev` commands that run directly from your development checkout.

### Avoiding Conflicts with Installed Versions

If you have Berry installed system-wide and want to avoid conflicts during development, remove the `berry` symlink and use only `berry-dev`:

```bash
rm ~/.bun/bin/berry
```

This ensures your development checkout uses `berry-dev` while any installed version remains accessible as `berry`.

### Testing Commands

```bash
# Interactive commands work properly when run directly
berry-dev search "test query"
berry-dev remember "some information"

# Non-interactive commands can also be run via bun
bun run --filter @berry/cli dev recall
```

### Why Not Use Package Manager Scripts?

When running interactive CLI commands through `bun run --filter`:

1. stdin is not properly attached as a TTY
2. Interactive prompts (select lists, confirmations) will hang
3. Ctrl+C handling may not work correctly

Running the CLI directly via `berry-dev` or `./bin/run.js` ensures proper terminal handling.

### Rebuilding After Changes

After modifying CLI source files:

```bash
cd packages/cli
bun run build
```

The linked `berry-dev` command will automatically use the rebuilt files.

## Project Structure

```
berry/
├── packages/
│   ├── cli/          # Command-line interface (@berry/cli)
│   └── server/       # HTTP API server (@berry/server)
├── Procfile          # Overmind process definitions
├── .overmind.env     # Environment for overmind processes
└── .env              # Project environment variables
```
