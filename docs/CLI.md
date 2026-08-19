# CLI reference

`dum-e` is the command-line surface over the shared core. Every command works offline against the local SQLite database; no server needs to be running.

Run `dum-e --help` for the top-level overview, or `dum-e <command> --help` (and `dum-e <group> <command> --help`) for details on any command. The CLI suggests the closest match on a typo and prints usage after errors.

## Global options

| Option | Description |
|--------|-------------|
| `--json` | Emit machine-readable JSON instead of formatted text. Applies to every command. Pipeable, e.g. `dum-e task ls --json \| jq '.[].id'`. |
| `-v, --version` | Print the version. |
| `-h, --help` | Show help for the program or a command. |

`--json` is global, so it can appear anywhere: `dum-e --json task ls` and `dum-e task ls --json` are equivalent. In JSON mode, success chatter (the `✓` lines) is suppressed and the created/updated/returned entity is printed as JSON.

## Environment

- `DUM_E_HOME` overrides the state directory (default `~/.config/dum-e`). Useful for isolated testing: `DUM_E_HOME=/tmp/dume-test dum-e init`.

## Commands

### `dum-e init`
Create the config file and SQLite database if they do not exist. Idempotent, safe to run repeatedly. Prints the resolved paths.

### Projects

| Command | Description |
|---------|-------------|
| `dum-e project add <name>` | Create a project. Options: `-k, --key <key>` (short key, e.g. `WEB`), `-r, --repo <repo>`, `-b, --branch <branch>`. |
| `dum-e project ls` (alias `list`) | List all projects with key, id, name, repo. |

### Tasks

| Command | Description |
|---------|-------------|
| `dum-e task add <title>` | Create a task in the queue. Options below. |
| `dum-e task ls` (alias `list`) | List tasks. Filters: `-p, --project`, `-s, --status`, `--priority`, `--type`, `--agent`, `--search <query>` (full-text over title + details). |
| `dum-e task show <id>` | Full task view: fields, details, attachments, comment thread, transition history. |
| `dum-e task update <id>` | Update fields (same flags as `add`). |
| `dum-e task next` | Claim the highest-priority queued task and move it to `in_progress`. Rejection-flagged tasks are claimed first. Options: `-p, --project`, `-m, --message <comment>`. |
| `dum-e task move <id> <status>` | Transition a task. Requires `-m, --message <comment>`. Option `--actor <human\|agent\|system>` (default `human`). |
| `dum-e task comment <id>` | Add a comment. Requires `-m, --message <text>`. Option `--author <human\|agent\|system>`. |

`task add` / `task update` options:

| Option | Values / default |
|--------|------------------|
| `-p, --project <idOrKey>` | target project (default: first project, else an auto-created `Inbox`) |
| `-d, --details <text>` | markdown details |
| `--priority <priority>` | `low` \| `medium` \| `high` \| `urgent` (default `medium`) |
| `--type <type>` | `bug` \| `feature` \| `documentation` \| `chore` (default `feature`) |
| `--agent <id>` | preferred agent id (from config) |
| `--model <id>` | preferred model id (from config) |
| `-r, --repo <repo>` / `-b, --branch <branch>` | git context |
| `--assignee <kind>` | `human` \| `agent` (default `agent`) |

### Config

| Command | Description |
|---------|-------------|
| `dum-e config show` | Print the effective config (YAML by default, JSON with `--json`). |
| `dum-e config path` | Print the config file path. |

### Servers

| Command | Description |
|---------|-------------|
| `dum-e serve` | Start the REST API + SSE and serve the web UI. Options: `-p, --port`, `-H, --host`, `-o, --open` (open the UI in your browser). |
| `dum-e mcp` | Start the MCP server on stdio. Register this with an agent. |

### Agent integration

`dum-e agent-rules` prints an instruction snippet you can paste into an agent's system prompt or project rules, telling it to create/claim tasks in dum-e before doing any delegated work. See [AGENTS.md](AGENTS.md).

## Lifecycle rules enforced by the CLI

- A transition to a status not reachable from the current one is rejected.
- Every `task move` requires a comment; the comment and the transition are written atomically with the status change.
- Rejecting (moving back to `in_progress` from `manual_testing` or `deployment`) bumps the task's priority and sets its rejection flag, so `task next` picks it up first.

## Scripting examples

```bash
# IDs of everything waiting on my review
dum-e task ls --status manual_testing --json | jq -r '.[].id'

# create a task and capture its id
id=$(dum-e task add "Investigate flaky test" --type bug --json | jq -r '.id')
dum-e task move "$id" in_progress -m "reproducing locally"

# full snapshot of a task as JSON
dum-e task show "$id" --json
```
