# Configuration

Berry can be configured through a configuration file for the CLI and environment variables for the server.

## CLI Configuration

The CLI reads configuration from `~/.config/berry/config.jsonc`. This file uses JSONC format, which allows comments and
trailing commas.

### Configuration File Location

```
~/.config/berry/config.jsonc
```

If the file doesn't exist, Berry uses default values.

### Full Configuration Example

```jsonc
{
  // Berry CLI Configuration

  // Server connection settings
  "server": {
    // URL of the Berry server
    "url": "http://localhost:4114",

    // Request timeout in milliseconds
    "timeout": 5000,
  },

  // Default values for new memories
  "defaults": {
    // Default memory type: "question", "request", or "information"
    "type": "information",

    // Default creator identifier
    "createdBy": "user",
  },
}
```

### Configuration Options

#### `server.url`

The URL where the Berry server is running.

- **Type:** `string`
- **Default:** `"http://localhost:3000"`
- **Example:** `"http://localhost:4114"`

#### `server.timeout`

Request timeout in milliseconds. If the server doesn't respond within this time, the request fails.

- **Type:** `number`
- **Default:** `5000`
- **Example:** `10000` (10 seconds)

#### `defaults.type`

Default memory type when creating new memories without specifying a type.

- **Type:** `string`
- **Default:** `"information"`
- **Options:**
  - `"question"` - Questions or queries
  - `"request"` - Requests or tasks
  - `"information"` - General information

#### `defaults.createdBy`

Default creator identifier for new memories.

- **Type:** `string`
- **Default:** `"user"`
- **Example:** `"claude"`, `"system"`, or a username

## Server Configuration

The Berry server is configured through environment variables.

### Environment Variables

#### `PORT`

The port the server listens on.

- **Default:** `3000`
- **Example:** `PORT=4114`

#### `CHROMA_URL`

The URL of the ChromaDB instance for vector storage.

- **Default:** `"http://localhost:8000"`
- **Example:** `CHROMA_URL=http://chromadb:8000`

### Setting Environment Variables

#### Using a `.env` file

Create a `.env` file in the project root:

```bash
PORT=4114
CHROMA_URL=http://localhost:8000
```

#### Using shell export

```bash
export PORT=4114
export CHROMA_URL=http://localhost:8000
berry serve
```

#### Inline with command

```bash
PORT=4114 berry serve
```

## Configuration Precedence

### CLI

1. Command-line flags (highest priority)
2. Configuration file (`~/.config/berry/config.jsonc`)
3. Default values (lowest priority)

### Server

1. Environment variables (highest priority)
2. Default values (lowest priority)

## Validating Configuration

If the configuration file has syntax errors, Berry will display a warning and fall back to default values:

```
Warning: Config file has parse errors: InvalidSymbol
Using default configuration.
```

To validate your configuration file, you can use a JSON/JSONC linter or simply run any Berry command to see if warnings
appear.
