# Getting Started

This guide walks you through installing and using Berry for the first time.

## Prerequisites

Before installing Berry, ensure you have the following:

- [Bun](https://bun.sh/) - JavaScript runtime
- [Docker](https://www.docker.com/) - For running ChromaDB
- [Git](https://git-scm.com/) - For cloning the repository

### Installing Bun

If you don't have Bun installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Installation

Install Berry using the installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/geoffjay/berry/main/install.sh | bash
```

This script will:

1. Clone the Berry repository to `~/.berry`
2. Install dependencies
3. Build the packages
4. Link the `berry` command globally
5. Create a default configuration file

### Custom Installation Directory

To install to a custom location, set the `BERRY_HOME` environment variable:

```bash
BERRY_HOME=/opt/berry curl -fsSL https://raw.githubusercontent.com/geoffjay/berry/main/install.sh | bash
```

### Installing a Specific Version

To install a specific version or branch:

```bash
BERRY_VERSION=v0.1.0 curl -fsSL https://raw.githubusercontent.com/geoffjay/berry/main/install.sh | bash
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

Ensure `~/.bun/bin` is in your PATH:

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
