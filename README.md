> [!WARNING]
> Berry is in a Beta state, it's safe to use but breaking changes are possible.

# Berry

![Member?][logo]

A memory storage system that exists between you and your AI tooling.

## Installation

### npm (Recommended)

Install Berry globally using npm:

```bash
npm install -g @hlfbkd/berry
```

Or with other package managers:

```bash
# pnpm
pnpm add -g @hlfbkd/berry

# yarn
yarn global add @hlfbkd/berry
```

### Installation Script

Install Berry using the installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/geoffjay/berry/main/install.sh | bash
```

### From Source

For development or if you prefer building from source:

```bash
# install bun
curl -fsSL https://bun.sh/install | bash

# clone and build berry
git clone https://github.com/geoffjay/berry.git
cd berry
bun install
bun run build

# link the CLI globally
cd packages/cli
bun link
```

If using `bun link`, add this to your `.bashrc` or `.zshrc`:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

### Verify Installation

Once installed, verify the installation:

```bash
berry --version
```

## Setup

The recommended way to use Berry is to create a new ChromaDB instance in the cloud. To do this visit the
[ChromaDB website](https://trychroma.com) and create a user and a new instance, the free version has a usage limit but
is sufficient to get started. Once you have created an instance, you need to generate an API key, save it as well as the
tenant ID and database name. The server will use the following environment variables to connect to the database:

```
CHROMA_PROVIDER=cloud
CHROMA_API_KEY=<insert_chroma_api_key>
CHROMA_TENANT=<insert_chroma_tenant_id>
CHROMA_DATABASE=<insert_chroma_database_name>
```

If you want to use a local instance of ChromaDB, you can use the following environment variables:

```
CHROMA_PROVIDER=local
CHROMA_URL=http://localhost:8000
```

Depending on how you want to run the server these should be set. If you only want to run this for a single project that
could be managed using any number of task runners, if you want it for many projects and conversational sessions it would
be better to use a launch system.

### Initialize Configuration

The CLI and MCP server both use a common configuration file for settings. The configuration file is located at
`~/.config/berry/config.jsonc` and is created using the command `berry init`.

### Launchd

#### Configuration

Create a file called `berry.plist` in `~/Library/LaunchAgents` with the following contents:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.berry.server</string>

    <key>ProgramArguments</key>
    <array>
        <string>/Users/username/.bun/bin/berry</string>
        <string>serve</string>
        <string>--foreground</string>
    </array>

    <key>EnvironmentVariables</key>
    <dict>
        <key>CHROMA_PROVIDER</key>
        <string>cloud</string>
        <key>CHROMA_API_KEY</key>
        <string>your-api-key-here</string>
        <key>CHROMA_TENANT</key>
        <string>your-tenant-id</string>
        <key>CHROMA_DATABASE</key>
        <string>your-database-name</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/Users/username/.local/state/berry/server.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/username/.local/state/berry/server.error.log</string>

    <key>WorkingDirectory</key>
    <string>/Users/username</string>
</dict>
</plist>
```

Replacing "username" appropriately.

#### Installation

Perform the following steps to install the `launchd` service:

```bash
# Create log directory
mkdir -p ~/.local/state/berry

# Save the plist (adjust the path to berry if using npm install)
# For npm: use the output of `which berry` for ProgramArguments

# Copy to LaunchAgents
cp com.berry.server.plist ~/Library/LaunchAgents/

# Load the service
launchctl load ~/Library/LaunchAgents/com.berry.server.plist
```

Management commands:

```bash
# Check status
launchctl list | grep berry

# Test health
curl http://localhost:4114/health

# Stop
launchctl stop com.berry.server

# Start
launchctl start com.berry.server

# Unload (disable)
launchctl unload ~/Library/LaunchAgents/com.berry.server.plist

# View logs
tail -f ~/.local/state/berry/server.log
```

## CLI

### Configuration

The CLI uses a configuration file located at `~/.config/berry/config.jsonc`, create it with `berry init` if you haven't
already.

### Sample Commands

```bash
# Store some memories
berry remember "The API uses JWT tokens for authentication"
berry remember "Database backups run at 3am daily" --type information --tags "ops,database"
berry remember "How do I reset a user's password?" --type question --tags "auth,faq"

# Search memories
berry search "authentication"
berry search "database" --limit 5
berry search "password" --type question

# Recall a specific memory by ID
berry recall mem_abc123

# Remove a memory
berry forget mem_abc123

# Interactive mode (guided prompts)
berry

# Remember with all options
berry remember "Deploy process requires approval" \
  --type request \
  --tags "deploy,process" \
  --by "engineering"

# Search with filters
berry search "meeting" \
  --type information \
  --tags "notes" \
  --limit 20 \
  --from "2024-01-01" \
  --to "2024-12-31"
```

## MCP Server

### Configuration

The MCP server uses a configuration file located at `~/.config/berry/config.jsonc`, create it with `berry init` if you
haven't already.

### Claude Code

```json
{
  "mcpServers": {
    "berry": {
      "type": "stdio",
      "command": "berry",
      "args": ["mcp"]
    }
  }
}
```

### OpenCode

```json
{
  "mcp": {
    "berry": {
      "type": "local",
      "command": ["berry", "mcp"],
      "enabled": true
    }
  }
}
```

<!-- links -->

[logo]: docs/assets/member.png
