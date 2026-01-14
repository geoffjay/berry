# Release Process

Berry uses [Changesets](https://github.com/changesets/changesets) for version management and automated releases to npm.

## Package Structure

| Package | Published | Description |
|---------|-----------|-------------|
| `@berry/cli` | No (source) | Source package, version tracked by changesets |
| `@berry/server` | No (private) | Internal server package |
| `@berry/mcp` | No (private) | Internal MCP package |
| `@berry/script` | No (private) | Internal build utilities |
| `@hlfbkd/berry` | Yes | Published CLI package (built from @berry/cli) |
| `@hlfbkd/berry-darwin-*` | Yes | Platform-specific binaries |

## Creating a Release

### 1. Make Your Changes

Develop your feature or fix on the `main` branch (or a feature branch that will be merged to main).

### 2. Create a Changeset

After making changes, create a changeset to describe what changed:

```bash
bunx changeset
```

This will prompt you to:
1. Select which packages were affected (typically `@berry/cli`)
2. Choose the semver bump type:
   - **patch**: Bug fixes, minor changes (0.0.x)
   - **minor**: New features, backwards compatible (0.x.0)
   - **major**: Breaking changes (x.0.0)
3. Write a summary of the changes

A markdown file will be created in `.changeset/` describing the change.

### 3. Commit and Push

```bash
git add .
git commit -m "feat: your feature description"
git push origin main
```

### 4. Review the Version PR

When you push to `main` with changesets present, GitHub Actions will:
1. Run tests
2. Create a "Version Packages" PR that:
   - Bumps version numbers in all package.json files
   - Updates CHANGELOG.md
   - Removes the changeset files

Review this PR to verify the version bump and changelog look correct.

### 5. Merge to Publish

When you merge the "Version Packages" PR:
1. GitHub Actions runs again
2. Detects no changesets (they were consumed)
3. Builds the packages
4. Publishes to npm using trusted publishing (OIDC)
5. Creates a GitHub Release with binary tarballs for curl installation

## Manual Publishing

If you need to publish manually (e.g., for initial setup or debugging):

```bash
# Build with release channel
BERRY_CHANNEL=latest bun run build

# Publish (requires NPM_TOKEN)
NPM_TOKEN=your_token bun run scripts/publish.ts
```

## Version Flow

```
┌─────────────────┐
│  Make changes   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ bunx changeset  │  ← Creates .changeset/*.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Push to main  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CI creates PR  │  ← "chore: version packages"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Merge PR     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CI publishes to │  ← @hlfbkd/berry@x.x.x
│      npm        │
└─────────────────┘
```

## Changeset Examples

### Patch Release (bug fix)

```bash
bunx changeset
# Select: @berry/cli
# Bump: patch
# Summary: Fix memory leak in server connection handling
```

### Minor Release (new feature)

```bash
bunx changeset
# Select: @berry/cli
# Bump: minor
# Summary: Add support for custom memory tags
```

### Major Release (breaking change)

```bash
bunx changeset
# Select: @berry/cli
# Bump: major
# Summary: Change configuration file format from JSON to YAML
```

## Configuration

### Changesets Config (`.changeset/config.json`)

```json
{
  "changelog": ["@changesets/changelog-github", { "repo": "geoffjay/berry" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### GitHub Actions (`.github/workflows/release.yml`)

The release workflow:
- Triggers on push to `main`
- Runs tests before any release actions
- Uses `changesets/action` to manage PRs and publishing
- Sets `BERRY_CHANNEL=latest` for release builds
- Uses npm trusted publishing (OIDC) for authentication
- Creates GitHub Releases with binary tarballs after successful npm publish

## Installation Methods

After a release, users can install Berry via:

### curl (recommended for macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/geoffjay/berry/main/install | bash
```

This downloads binaries from GitHub Releases.

### npm

```bash
npm install -g @hlfbkd/berry
```

This installs from the npm registry.

## Trusted Publishing Setup

Each `@hlfbkd/*` package needs trusted publishing configured on npmjs.com:

1. Go to the package page on npmjs.com
2. Navigate to **Settings → Configure Trusted Publishing**
3. Add the GitHub repository: `geoffjay/berry`
4. Save the configuration

This allows GitHub Actions to publish without storing npm tokens as secrets.

## Troubleshooting

### "No changesets found"

If the release action says "No changesets found" but doesn't publish:
- Ensure you created a changeset with `bunx changeset`
- Ensure the changeset file was committed and pushed

### Publish fails with provenance error

If publishing fails with repository URL mismatch:
- Ensure all generated package.json files include the `repository` field
- Check `packages/cli/script/build.ts` adds repository to platform packages

### Version PR not created

If pushing doesn't create a version PR:
- Check that changesets exist in `.changeset/` (not just README.md)
- Verify GitHub Actions has permission to create PRs (repo settings)

### Token/auth errors

For local publishing issues:
- Ensure `NPM_TOKEN` is set and valid
- The publish script will configure `~/.npmrc` automatically
- Check token has publish permissions for `@hlfbkd` scope
