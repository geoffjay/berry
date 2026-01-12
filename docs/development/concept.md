# Project Concept

This is a pre-planning document meant to provide high-level context for the intention of the project. It will be used as
input into the planning stage.

## Project

"Berry", don't worry about the name, is a memory that exists between myself and any AI tooling that is setup to interact
with it.

### Structure

This project should be built as a monorepo using `bun` workspaces, initially there should be one for `cli` and another
for `server`. Eventually, this will be expanded for other projects, such as `client` and `mcp`.

## Problem

I want a system that tracks information, I'm starting to attempt to use AI tooling to better direct and guide my
behaviours and decisions and in order to do this I inform the AI through a custom system context that is set for
differenpurposes to question and challenge me and what I've done. Doing this manually for every individual scenario is
annoying and inconsistent, so I want to create a single system that is used for input questions and their answers,
requests and their resolutions, and just plain old thoughts that were generating by me without being prompted.

## Solution

A program that is running on a user's (my) machine provides an API to a Chroma database, the API should be simple and
provide endpoints for typical operations for interacting with the data, as well as a couple of additional search
endpoints.

- `GET /v1/memory/<id>`: get a single memory by ID
- `POST /v1/memory`: create a memory with a given collection body
- `DELETE /v1/memory/<id>`: delete a memory by ID
- `POST /v1/search/`: search for all memories that match the question, answer, or metadata provided in the body

### Collection Schema

At a minimum the memory collection should be created to include:

- the type of information: question, request as two-way types, or information as one-way
- metadata related to the information, eg. who requested it, who answered it, who produced the response
- when the memory was created

### Technologies

The following technologies should be used for this project:

- `bun` MUST be used and NOT `yarn`/`npm`/`deno`
- Typescript SHOULD be the primary language UNLESS otherwise indicated
- ChromaDB MUST be the database used for storing memory records in all cases
- `asdf` MUST be used for managing project runtimes if required

### User Interface

Eventually, I'd like to support web, mobile, MCP, and CLI for interacting with the backend. Initially, just CLI would be
sufficient in order to fully evaluate the system and its value. Starting with an MVP that supports:

- `berry`
  - load configuration from XDG path for `~/.config/berry/config.jsonc` that supports JSON and JSONC formats
  - enters a TUI for the user to input information from a form using `opentui`
- `berry remember`: add a memory to the database, accepts optional metadata and memory type (eg. question/request)
- `berry search`: search for memories that match a string using the ChromaDB for vector search, filterable by metadata
- `berry forget`: remove a memory by ID
- `berry recall`: retrieve a single memory using specific criteria or document ID

The CLI functionality should be built using `oclif` and `@inquirer/prompts`, and the TUI functionality should be added using
the `@opentui/core` package. Long running tasks, for example querying the database, should be displayed using spinners
using the `ora` package.

### Future

Initially it won't be critical to support this functionality, but eventually displaying notifications to the user in
certain cases could be extremely useful functionality. This can be accomplished using the `node-notifier` package. One
such scenario could be an AI agent posing a question to a user, it does this using the MCP server that creates a new
document containing the question and the user could then drop into their terminal, or other interface, to see the
question and provide an answer that's stored in the database.
