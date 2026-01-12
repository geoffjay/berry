#!/bin/bash
set -e

# Berry Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/geoffjay/berry/main/install.sh | bash

BERRY_REPO="https://github.com/geoffjay/berry.git"
BERRY_INSTALL_DIR="${BERRY_HOME:-$HOME/.berry}"
BERRY_VERSION="${BERRY_VERSION:-main}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check for required commands
check_requirements() {
    info "Checking requirements..."

    # Check for bun
    if ! command -v bun &> /dev/null; then
        error "Bun is required but not installed. Install it from https://bun.sh"
    fi
    info "Found bun: $(bun --version)"

    # Check for git
    if ! command -v git &> /dev/null; then
        error "Git is required but not installed."
    fi
    info "Found git: $(git --version | head -1)"

    # Check for docker (optional, for ChromaDB)
    if ! command -v docker &> /dev/null; then
        warn "Docker not found. You'll need to run ChromaDB manually."
    else
        info "Found docker: $(docker --version)"
    fi
}

# Clone or update the repository
clone_repo() {
    if [ -d "$BERRY_INSTALL_DIR" ]; then
        info "Updating existing Berry installation..."
        cd "$BERRY_INSTALL_DIR"
        git fetch origin
        git checkout "$BERRY_VERSION"
        git pull origin "$BERRY_VERSION" 2>/dev/null || true
    else
        info "Cloning Berry repository..."
        git clone "$BERRY_REPO" "$BERRY_INSTALL_DIR"
        cd "$BERRY_INSTALL_DIR"
        git checkout "$BERRY_VERSION"
    fi
}

# Install dependencies and build
build_berry() {
    info "Installing dependencies..."
    bun install

    info "Building packages..."
    bun run build
}

# Link the CLI globally
link_cli() {
    info "Linking CLI globally..."
    cd "$BERRY_INSTALL_DIR/packages/cli"
    bun link

    # Verify installation
    if command -v berry &> /dev/null; then
        info "Berry CLI installed successfully!"
    else
        warn "CLI linked but 'berry' command not found in PATH."
        warn "You may need to add ~/.bun/bin to your PATH:"
        echo ""
        echo "  export PATH=\"\$HOME/.bun/bin:\$PATH\""
        echo ""
    fi
}

# Create default configuration
setup_config() {
    local config_dir="$HOME/.config/berry"
    local config_file="$config_dir/config.jsonc"

    if [ ! -f "$config_file" ]; then
        info "Creating default configuration..."
        mkdir -p "$config_dir"
        cat > "$config_file" << 'EOF'
{
  // Berry configuration
  // Server connection settings
  "server": {
    "host": "localhost",
    "port": 4114
  }
}
EOF
        info "Configuration created at $config_file"
    else
        info "Configuration already exists at $config_file"
    fi
}

# Print post-installation instructions
print_instructions() {
    echo ""
    echo "=============================================="
    echo "  Berry installed successfully!"
    echo "=============================================="
    echo ""
    echo "Quick Start:"
    echo ""
    echo "  1. Start ChromaDB (required for storage):"
    echo "     docker run -p 8000:8000 chromadb/chroma"
    echo ""
    echo "  2. Start the Berry server:"
    echo "     berry serve"
    echo ""
    echo "  3. Store a memory:"
    echo "     berry remember \"Something important to remember\""
    echo ""
    echo "  4. Search memories:"
    echo "     berry search \"important\""
    echo ""
    echo "For more information, see:"
    echo "  https://github.com/geoffjay/berry"
    echo ""
}

# Main installation flow
main() {
    echo ""
    echo "========================================="
    echo "  Berry Installation"
    echo "========================================="
    echo ""

    check_requirements
    clone_repo
    build_berry
    link_cli
    setup_config
    print_instructions
}

main "$@"
