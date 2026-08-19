# Architecture

dum-e is a modular monolith built as pnpm workspaces. There is one domain core; the CLI, REST server, and MCP server are thin adapters over it. Each adapter opens the same local SQLite database directly, so none depends on another being up.

## Packages

```
packages/
  core/     @dum-e/core    domain, storage, config, state machine, services, bus
  server/   @dum-e/server  Hono REST API + SSE; serves the web build
  mcp/       @dum-e/mcp     MCP server (stdio)
  cli/       @dum-e/cli     commander CLI
  web/       @dum-e/web     Vite + React UI
```

`@dum-e/server` and `@dum-e/mcp` are optional dependencies of the CLI, so `dum-e serve` and `dum-e mcp` resolve inside the workspace while the CLI can still be published without them.

## `@dum-e/core`

Sub-modules, each with one responsibility, communicating through typed interfaces.

- **domain/**: entity types (`Project`, `Task`, `Comment`, `Attachment`, `Transition`, `AgentDef`, `ModelDef`) and their Zod schemas. Method inputs use `z.input` types so defaulted fields are optional for callers.
- **config/**: YAML + Zod loader. `configDir()` resolves `$DUM_E_HOME ?? ~/.config/dum-e`. `ConfigLoader.load()` writes defaults if the file is missing. Holds the agent roster, model roster, defaults, and server host/port.
- **store/**: SQLite via `better-sqlite3`. On open: `PRAGMA journal_mode=WAL`, `foreign_keys=ON`, and an idempotent `CREATE TABLE IF NOT EXISTS` schema. An FTS5 virtual table over task title + details powers search, kept in sync by triggers.
- **statemachine/**: the default state machine (states + allowed transitions + which transitions count as rejections). Designed so a project can override it later via a config-driven table rather than hardcoded conditionals.
- **services/**: `TaskService`, `ProjectService`, `CommentService`, `AttachmentService`, wired together by a `Kernel`. All writes flow through here, so every surface behaves identically.
- **bus/**: a typed `EventBus` emitting `task:created`, `task:updated`, `task:transitioned`, `comment:added`, `project:created`. The REST server subscribes and fans these out over SSE.

### Data model

| Table | Key columns |
|-------|-------------|
| `projects` | id, name, key, repo, default_branch, state_machine (JSON, nullable), created_at |
| `tasks` | id, project_id, title, details, status, repo, branch, priority, type, agent_id, model_id, assignee, rejection_flag, created_at, updated_at |
| `comments` | id, task_id, author, body, created_at |
| `attachments` | id, task_id, filename, path, mime, size, created_at (blobs on disk under `attachments/<task_id>/`) |
| `transitions` | id, task_id, from_status, to_status, actor, comment_id, created_at (append-only audit) |
| `tasks_fts` | FTS5 over title + details |

## State machine

Default states: `todo → in_progress → ai_testing → manual_testing → deployment → completed`.

- The agent auto-advances a task up to `manual_testing`.
- Human gate at `manual_testing`: approve moves to `deployment`; reject moves back to `in_progress` with the rejection flag set and priority bumped.
- `deployment → completed` on merge.
- Every edge writes a comment. The `transition()` service call writes the comment row, the transition row, and the new task status atomically in one SQLite transaction.

## Claim ordering

`task next` (and the MCP `claim_next_task`) selects the next task by: rejection-flagged tasks first, then by priority rank (`urgent > high > medium > low`), then oldest first. This guarantees rejected work is picked up before anything new.

## Concurrency model

Single user, no auth. WAL mode gives concurrent readers and serialized writers, which is safe for one person driving the tool from several surfaces at once (CLI while the web UI is open, an agent over MCP, etc.). There is no requirement that the server be running for the CLI or MCP to work.

## Live updates

`dum-e serve` exposes `GET /api/events` as a Server-Sent Events stream bridged from the core `EventBus`. The web UI subscribes and invalidates its TanStack Query caches on each event, so the board, table, and metrics stay live as tasks change from any surface.

## Build

- Libraries (`core`, `server`, `mcp`, `cli`) build with `tsup` to ESM in `dist/`.
- The web app builds with Vite. `@dum-e/server` serves `packages/web/dist` when present.
- TypeScript is strict (`noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`/`noUnusedParameters`).
