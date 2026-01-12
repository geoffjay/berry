# Berry

> [!NOTE]
> pre-alpha, don't use this

A memory storage system that exists between you and your AI tooling.

## Prerequisites

- [bun](https://bun.sh) v1.3+
- [ChromaDB](https://www.trychroma.com/) running locally (default: `http://localhost:8000`)

## Setup

```bash
# Install dependencies
bun install

# Build packages
bun run build
```

## Running

### Server

```bash
# Start the server (default port: 3000)
bun run dev:server

# Or specify a custom port
PORT=4000 bun run dev:server
```

### CLI

```bash
# Interactive mode
bun run --filter @berry/cli dev

# Quick commands
bun run --filter @berry/cli dev remember "Something to remember"
bun run --filter @berry/cli dev search "what was that thing"
bun run --filter @berry/cli dev recall <memory-id>
bun run --filter @berry/cli dev forget <memory-id>
```

## Configuration

Create `~/.config/berry/config.jsonc`:

```jsonc
{
  "server": {
    "url": "http://localhost:3000",
    "timeout": 5000
  },
  "defaults": {
    "type": "information",
    "createdBy": "user"
  }
}
```

## Project Structure

```
berry/
├── packages/
│   ├── server/    # API server (Hono + ChromaDB)
│   └── cli/       # Command-line interface (oclif)
└── docs/
    └── development/
        ├── concept.md      # Project concept
        └── initial-plan.md # Implementation plan
```
