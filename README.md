<p align="center">
  <img src="assets/logo.svg" alt="dum-e" width="96" />
</p>

# dum-e

Named for Tony Stark's clumsy robot arm. A personal, single-user AI task manager that AI agents (Claude, Codex, opencode, any LLM) drive through a defined lifecycle, with you as the approval gate.

Three surfaces, one shared core: a powerful CLI, a REST API with live updates, and an MCP server that any agent can plug into.

## The idea

Whenever you delegate work to an AI agent, it first creates a task here. The agent pulls the highest-priority task from the queue, analyzes it, works it, runs AI-level testing, then hands it to **manual testing**. It waits there for your approve or reject. Rejected tasks bounce back with high-priority comments the agent must address; approved tasks flow to deployment (PR review and merge) then completed. The loop repeats until you approve. Tool- and LLM-agnostic.

```
              agent auto-advances                    human gate
   ┌──────┐   ┌─────────────┐   ┌────────────┐   ┌────────────────┐   ┌────────────┐   ┌───────────┐
   │ todo │ → │ in_progress │ → │ ai_testing │ → │ manual_testing │ → │ deployment │ → │ completed │
   └──────┘   └─────────────┘   └────────────┘   └────────────────┘   └────────────┘   └───────────┘
                    ↑                                    │                   │
                    └────────────── reject ──────────────┴───────────────────┘
                      (priority bumped, flagged for the agent to fix first)
```

Every transition requires a comment, recorded in an append-only history.

## Install

Requires Node.js 22+ and pnpm 9+.

```bash
git clone <repo> dum-e && cd dum-e
pnpm install
pnpm build
```

Then put `dum-e` on your PATH. The recommended way is a small launcher that pins the Node the native dependency (`better-sqlite3`) was built against, so the CLI works no matter which `node` is first on your PATH (a plain symlink to `dist/index.js` breaks if your default `node` differs from the one you built with):

```bash
mkdir -p ~/.local/bin
cat > ~/.local/bin/dum-e <<EOF
#!/bin/sh
exec "$(command -v node)" "$PWD/packages/cli/dist/index.js" "\$@"
EOF
chmod +x ~/.local/bin/dum-e
```

Ensure `~/.local/bin` is on your PATH. Alternatively, if you have run `pnpm setup` (so pnpm has a global bin dir): `pnpm --filter @dum-e/cli link --global`.

> If you rebuild against a different Node version later (e.g. after `pnpm install` under a new node), regenerate the launcher so it points at the matching interpreter.

Verify:

```bash
dum-e --version
dum-e --help
```

## Quickstart

```bash
dum-e init                                   # create ~/.config/dum-e/{config.yaml,db}
dum-e project add "Web App" -k WEB           # a project
dum-e task add "Fix login" --type bug --priority high
dum-e task next -m "starting"                # claim the highest-priority queued task
dum-e task move <id> ai_testing -m "unit tests green"
dum-e task move <id> manual_testing -m "verified locally"   # now waits for you
dum-e task ls --status manual_testing        # what awaits your review
dum-e serve --open                           # REST API + web UI, opens the browser
```

## Surfaces

- **CLI** (`dum-e ...`): full task and project lifecycle from the terminal. Add `--json` to any command for scriptable output. See [docs/CLI.md](docs/CLI.md).
- **REST + web** (`dum-e serve`): Hono API with Server-Sent Events for live updates, serving the React web UI (kanban board, table view, metrics, detail drawer). See [docs/REST-API.md](docs/REST-API.md).
- **MCP** (`dum-e mcp`): a Model Context Protocol server on stdio exposing task tools to any agent. See [docs/AGENTS.md](docs/AGENTS.md). Teach an agent to use dum-e by handing it [skills/dum-e/SKILL.md](skills/dum-e/SKILL.md).

All three open the same local SQLite database directly (WAL mode: concurrent readers, serialized writes), so none of them needs the others to be running.

## Architecture

Modular monolith, pnpm workspaces. Every surface is a thin adapter over `@dum-e/core`.

| Package | Responsibility |
|---------|----------------|
| `@dum-e/core` | Domain types, storage (SQLite + FTS5), config, state machine, services, event bus |
| `@dum-e/server` | Hono REST API + SSE; serves the web build |
| `@dum-e/mcp` | MCP server (stdio): task tools for any agent |
| `@dum-e/cli` | commander CLI |
| `@dum-e/web` | Vite + React: kanban board, table view, charts, detail drawer |

Runtime state lives in `~/.config/dum-e/` (`config.yaml`, `db`, `attachments/`), auto-created on first run. Override the location with `$DUM_E_HOME`. Full detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Configuration

`~/.config/dum-e/config.yaml` holds the agent roster, model roster, defaults, and server host/port. Show or locate it:

```bash
dum-e config show      # effective config (YAML, or JSON with --json)
dum-e config path      # path to the file
```

## Development

```bash
pnpm build        # build every package (tsup for libs, Vite for web)
pnpm test         # Vitest (state machine + services)
pnpm typecheck    # tsc --noEmit across the workspace
pnpm lint         # oxlint
```

After editing the CLI, rebuild it: `pnpm --filter @dum-e/cli build`. The global `dum-e` symlink points at the build output, so it picks up changes automatically.

## License

MIT
