# Initial Implementation Plan

This document outlines the implementation plan for Berry, derived from the [concept document](./concept.md).

## Phase 1: Project Foundation

### 1.1 Repository Setup

- Initialize bun workspace monorepo structure
- Create workspace packages:
  - `packages/server` - API server for ChromaDB interactions
  - `packages/cli` - Command-line interface
- Configure shared TypeScript settings
- Set up asdf with `.tool-versions` for runtime management
- Add EditorConfig and formatting configuration

### 1.2 Development Tooling

- Configure TypeScript with strict mode
- Set up ESLint for code quality
- Add Prettier for formatting
- Create shared tsconfig for workspace packages

## Phase 2: Server Implementation

### 2.1 Core Server Setup

- Initialize Express/Hono server in `packages/server`
- Configure ChromaDB client connection
- Implement health check endpoint
- Set up error handling middleware

### 2.2 Memory Collection Schema

Define the ChromaDB collection with the following structure:

```typescript
interface Memory {
  id: string; // Unique identifier (ChromaDB document ID)
  content: string; // The actual memory content (embedded for vector search)
  type: "question" | "request" | "information";
  metadata: {
    createdAt: string; // ISO timestamp
    createdBy?: string; // Who created this memory
    respondedBy?: string; // Who responded (for two-way types)
    response?: string; // The response content (for questions/requests)
    respondedAt?: string; // When the response was provided
    tags?: string[]; // Optional categorization
  };
}
```

### 2.3 API Endpoints

Implement REST endpoints:

| Method | Endpoint         | Description                         |
| ------ | ---------------- | ----------------------------------- |
| GET    | `/v1/memory/:id` | Retrieve a single memory by ID      |
| POST   | `/v1/memory`     | Create a new memory                 |
| DELETE | `/v1/memory/:id` | Delete a memory by ID               |
| POST   | `/v1/search`     | Search memories by content/metadata |

#### Request/Response Specifications

**POST /v1/memory**

```json
{
  "content": "string",
  "type": "question | request | information",
  "metadata": {
    "createdBy": "string (optional)",
    "tags": ["string"] (optional)
  }
}
```

**POST /v1/search**

```json
{
  "query": "string (optional, for vector search)",
  "filters": {
    "type": "question | request | information (optional)",
    "createdBy": "string (optional)",
    "tags": ["string"] (optional),
    "dateRange": {
      "from": "ISO date (optional)",
      "to": "ISO date (optional)"
    }
  },
  "limit": "number (default: 10)"
}
```

### 2.4 ChromaDB Integration

- Create ChromaDB service abstraction
- Implement collection initialization and management
- Handle embedding generation for vector search
- Implement metadata filtering for search queries

## Phase 3: CLI Implementation

### 3.1 CLI Foundation

- Initialize oclif project in `packages/cli`
- Configure oclif for TypeScript
- Set up base command class with shared functionality
- Implement configuration loading from `~/.config/berry/config.jsonc`

### 3.2 Configuration Schema

```jsonc
// ~/.config/berry/config.jsonc
{
  "server": {
    "url": "http://localhost:3000",
    "timeout": 5000,
  },
  "defaults": {
    "type": "information",
    "createdBy": "user",
  },
}
```

### 3.3 CLI Commands

#### `berry` (default)

- Launch TUI mode using `@opentui/core`
- Present form for memory input
- Support all memory types and metadata entry

#### `berry remember [content]`

- Add a memory to the database
- Flags:
  - `--type, -t`: Memory type (question/request/information)
  - `--tags`: Comma-separated tags
  - `--by`: Creator identifier
- If no content provided, prompt with `@inquirer/prompts`
- Show spinner during submission with `ora`

#### `berry search <query>`

- Search memories using vector similarity
- Flags:
  - `--type, -t`: Filter by type
  - `--tags`: Filter by tags
  - `--limit, -l`: Number of results (default: 10)
  - `--from`: Start date filter
  - `--to`: End date filter
- Display results in formatted table

#### `berry forget <id>`

- Remove a memory by ID
- Prompt for confirmation using `@inquirer/prompts`
- Show spinner during deletion

#### `berry recall <id>`

- Retrieve a specific memory by ID
- Display full memory details with formatting

### 3.4 TUI Implementation

- Create main TUI application shell
- Implement memory input form:
  - Content textarea
  - Type selector
  - Metadata fields
- Add navigation and keyboard shortcuts
- Display recent memories list

## Phase 4: Integration & Testing

### 4.1 API Client

- Create shared HTTP client in CLI package
- Implement typed API methods
- Handle errors and timeouts gracefully
- Support configuration-based server URL

### 4.2 Testing Strategy

- Unit tests for server services
- Integration tests for API endpoints
- CLI command tests using oclif testing utilities
- End-to-end tests with running server

### 4.3 Documentation

- API documentation with OpenAPI/Swagger
- CLI help text and man pages
- README files for each package
- Getting started guide

## Dependency Summary

### Server (`packages/server`)

```json
{
  "dependencies": {
    "chromadb": "latest",
    "hono": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "@types/bun": "latest"
  }
}
```

### CLI (`packages/cli`)

```json
{
  "dependencies": {
    "@oclif/core": "latest",
    "@inquirer/prompts": "latest",
    "@opentui/core": "latest",
    "ora": "latest",
    "jsonc-parser": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "@types/bun": "latest",
    "@oclif/test": "latest"
  }
}
```

## Implementation Order

1. **Foundation**: Repository setup, workspaces, tooling
2. **Server Core**: Basic server, ChromaDB connection, health check
3. **Memory CRUD**: Implement all four API endpoints
4. **CLI Base**: oclif setup, configuration loading
5. **CLI Commands**: Implement remember, search, forget, recall
6. **TUI**: Default command with @opentui/core interface
7. **Polish**: Error handling, spinners, formatting, tests

## Future Considerations

Items deferred from initial implementation:

- Notification system using `node-notifier`
- MCP server integration
- Web client
- Mobile client
- Multi-user support
- Authentication/authorization
