#!/bin/bash
# UserPromptSubmit hook that forces a check of tools that must be used
#
# This hook requires Claude to explicitly remind iteslf of the tools that must
# be used for this project.
#
# Installation: Copy to .claude/hooks/UserPromptSubmit or set .claude/settings.json accordingly

cat <<'EOF'
REMINDER: PERFORM TASKS ACCORDING TO THESE LOCAL TOOL USE GUIDELINES

- `bun` MUST be used and NOT `yarn`/`npm`/`deno`
- Typescript SHOULD be the primary language UNLESS otherwise indicated
- ChromaDB MUST be the database used for storing memory records in all cases
- `asdf` MUST be used for managing project runtimes if required

[reminder complete]
EOF
