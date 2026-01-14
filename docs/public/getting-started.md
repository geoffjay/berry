# Getting Started

This guide walks you through installing and using Berry for the first time.

## Prerequisites

Before installing Berry, ensure you have the following:

- [Node.js](https://nodejs.org/) v18+ (for npm installation) or [Bun](https://bun.sh/) (for source installation)
- [Docker](https://www.docker.com/) - For running ChromaDB

## Installation

### npm (Recommended)

The easiest way to install Berry is via npm:

```bash
npm install -g @berry/cli
```

Or with other package managers:

```bash
# pnpm
pnpm add -g @berry/cli

# yarn
yarn global add @berry/cli

# bun
bun add -g @berry/cli
```

This installs a platform-specific native binary for optimal performance.

### Installation Script

Alternatively, use the installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/geoffjay/berry/main/install.sh | bash
```

### From Source

For development or contributing, install from source:

```bash
# Install Bun if you don't have it
curl -fsSL https://bun.sh/install | bash

# Clone and build
git clone https://github.com/geoffjay/berry.git
cd berry
bun install
bun run build

# Link the CLI globally
cd packages/cli
bun link
```

If using `bun link`, ensure `~/.bun/bin` is in your PATH:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

Add this line to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to make it permanent.

### Create Configuration

Create the configuration directory and file:

```bash
mkdir -p ~/.config/berry
cat > ~/.config/berry/config.jsonc << 'EOF'
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
EOF
```

## Starting the Services

Berry requires ChromaDB for vector storage. Start it with Docker:

```bash
docker run -d -p 8000:8000 chromadb/chroma
```

Then start the Berry server:

```bash
berry serve
```

You should see:

```
Starting Berry server in background on port 4114...
Berry server running at http://localhost:4114
Process ID: 12345

To stop the server: kill 12345
```

### Running in Foreground

To run the server in the foreground (useful for debugging):

```bash
berry serve --foreground
```

## Basic Usage

### Store a Memory

```bash
berry remember "The API endpoint for users is /api/v1/users"
```

With type and tags:

```bash
berry remember "How do I reset my password?" --type question --tags "auth,faq"
```

### Search Memories

```bash
berry search "API endpoint"
```

This opens an interactive list where you can select a result to view full details.

### Recall a Specific Memory

If you know the memory ID:

```bash
berry recall mem_1234567890_abcdef
```

### Remove a Memory

```bash
berry forget mem_1234567890_abcdef
```

## Verify Installation

Check that everything is working:

```bash
# Check version
berry version

# Check server health
curl http://localhost:4114/health
```

Expected health response:

```json
{"status":"healthy","timestamp":"...","services":{"chromadb":"connected"}}
```

## Next Steps

- [Configuration](./configuration.md) - Customize Berry settings
- [Development](./develop.md) - Set up a development environment

## Troubleshooting

### Command not found: berry

If installed via npm/pnpm/yarn, ensure your global bin directory is in your PATH. You can find the location with:

```bash
npm bin -g
# or
pnpm bin -g
```

If installed via `bun link`, ensure `~/.bun/bin` is in your PATH:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

Add this line to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to make it permanent.

### Server failed to start

Ensure ChromaDB is running:

```bash
docker ps | grep chroma
```

If not running, start it:

```bash
docker run -d -p 8000:8000 chromadb/chroma
```

### Connection refused

Check that the server URL in your configuration matches where the server is running:

```bash
cat ~/.config/berry/config.jsonc
```

The default configuration expects the server at `http://localhost:4114`.
