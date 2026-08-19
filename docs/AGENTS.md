# Agent integration

dum-e is built so that AI agents track their work as first-class tasks instead of losing it in chat. Any agent that speaks MCP, or can run a shell command, can drive the full lifecycle.

## The skill file

`skills/dum-e/SKILL.md` is a ready-to-use agent skill: drop it into an agent's skills directory (or point the agent at it) and the agent learns the lifecycle, the rules, and both the MCP and CLI flows for driving tasks. It is the fastest way to teach any agent to integrate dum-e into its workflow.

## The rule you give an agent

Run `dum-e agent-rules` to print an instruction snippet for an agent's system prompt or project rules. In short: before doing any delegated work, the agent creates or claims a task, moves it to `in_progress` with its analysis as the comment, does the work, and moves it to `manual_testing` when its own testing passes; then it stops and waits for you. Rejected tasks return top-priority and must be fixed first. Every status change carries a comment.

## MCP (recommended)

Start the server on stdio:

```bash
dum-e mcp
```

Register it with an MCP client. For Claude Code, add it to your MCP config with the command `dum-e` and args `["mcp"]` (or the absolute path to `packages/cli/dist/index.js` with arg `mcp` if `dum-e` is not on the client's PATH).

### Tools exposed

| Tool | Purpose |
|------|---------|
| `list_projects` | List projects. |
| `create_project` | Create a project. |
| `list_tasks` | List/filter tasks. |
| `get_task` | Full task detail (comments, history, attachments). |
| `create_task` | Create a task. Resolves `projectId` or `projectKey`, else uses the default project. |
| `claim_next_task` | Claim the highest-priority queued task (rejections first) and move it to `in_progress`. Returns a queue-empty message when nothing is claimable. |
| `transition_task` | Move a task to a new status. Comment required (enforced). |
| `update_task` | Update task fields. |
| `add_comment` | Add a comment to a task. |

### Resource

- `dume://queue` returns the current queue as JSON: `{ todo, inProgress }` task arrays.

## CLI (any agent that can run a shell)

An agent without MCP support can use the CLI directly, ideally with `--json` so it can parse results:

```bash
id=$(dum-e task next --json -m "starting" | jq -r '.task.id')   # claim
# ... do the work ...
dum-e task update "$id" --repo myrepo --branch fix/login --json
dum-e task move "$id" ai_testing -m "added tests, all green" --actor agent --json
dum-e task move "$id" manual_testing -m "verified locally; ready for review" --actor agent --json
```

If a task is rejected, it reappears at the top of the queue with the rejection flag set and a comment explaining why. The next `task next` claims it first; read the latest comment, fix, and move it back through `ai_testing` to `manual_testing`.

## REST (programmatic)

If the agent runs alongside a live `dum-e serve`, it can use the HTTP API instead. See [REST-API.md](REST-API.md).
