> [!WARNING]
> Berry is in a Beta state, it's safe to use but breaking changes are possible.

# Berry

![Member?][logo]

A memory storage system that exists between you and your AI tooling.

## Installation

### npm (Recommended)

Install Berry globally using npm:

```bash
npm install -g berry-cli
```

Or with other package managers:

```bash
# pnpm
pnpm add -g berry-cli

# yarn
yarn global add berry-cli
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

## Quick Start

Once installed, verify the installation:

```bash
berry --version
```

For more detailed instructions, see the [getting started guide](docs/public/getting-started.md).

## Running

To test this out quickly run `overmind start` in the root of the project. This starts the server and the ChromaDB
server. Making it more useful involves installing the server globally and creating a ChromaDB instance in the cloud, or
by running the server locally with persistent storage.

<!-- links -->

[logo]: docs/assets/member.png
[logo-alt]: docs/assets/i-member.png
