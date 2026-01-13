> [!WARNING]
> Berry is in a Beta state, it's safe to use but breaking changes are possible.

# Berry

![Member?][logo]

A memory storage system that exists between you and your AI tooling.

## Quickest Start

> [!NOTE]
> I'm still sorting out the installation process, but for now you can use the following steps to get started.

```bash
# install bun
curl -fsSL https://bun.com/install | bash

# clone and setup berry
git clone https://github.com/geoffjay/berry.git
cd berry/packages/cli
bun link
```

Add this to your `.bashrc` or `.zshrc` file:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

You should be able to run `berry` in your terminal now.

## Running

To test this out quickly run `overmind start` in the root of the project. This starts the server and the ChromaDB
server. Making it more useful involves installing the server globally and creating a ChromaDB instance in the cloud, or
by running the server locally with persistent storage.

## Installation

For more detailed installation instructions, see the [getting started guide](docs/public/getting-started.md).

Install Berry using the installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/geoffjay/berry/main/install.sh | bash
```

<!-- links -->

[logo]: docs/assets/member.png
[logo-alt]: docs/assets/i-member.png
