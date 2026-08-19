---
name: dum-e
description: Use when doing any delegated software work (a fix, feature, chore, or investigation) so it is tracked as a first-class task in dum-e. Create or claim a task, drive it through the lifecycle with a comment on every transition, and stop at manual_testing for the human to approve. Works over MCP tools or the `dum-e` CLI.
---

# dum-e — track delegated work as tasks

dum-e is a single-user AI task manager. When a human delegates work to you, the
work belongs in dum-e as a task, not lost in chat. You move it through a fixed
lifecycle; the human is the approval gate.

## The lifecycle

```
todo → in_progress → ai_testing → manual_testing → deployment → completed
                          ↑                              │
                          └──────────── reject ──────────┘
```

- You auto-advance a task up to `manual_testing`.
- **Hard stop at `manual_testing`.** The human approves (→ `deployment`) or
  rejects (→ `in_progress`, priority bumped, rejection flag set). Never move a
  task past `manual_testing` yourself.
- `deployment → completed` happens on merge.
- **Every transition requires a comment.** It is enforced; a move without a
  comment is rejected.

## Rules you follow

1. Before starting delegated work, **create** a task (if none exists) or
   **claim** the highest-priority queued one. Claiming moves it to
   `in_progress`.
2. Rejection-flagged tasks are claimed first. If you claim one, read its latest
   comment (the rejection reason), fix that first, then re-run testing.
3. Put your analysis / plan in the `in_progress` transition comment, your test
   results in the `ai_testing` comment, and a review-ready summary in the
   `manual_testing` comment.
4. Then **stop and wait** for the human. Do not self-approve.
5. Every status change carries a comment explaining why.

## Path A — MCP (preferred)

Register the server (command `dum-e`, args `["mcp"]`) with your MCP client.
Tools:

| Tool | Use |
|------|-----|
| `claim_next_task` | Claim highest-priority queued task (rejections first) → `in_progress`. |
| `create_task` | Create a task. Resolves `projectId`/`projectKey`, else default project. |
| `get_task` | Full detail: comments, history, attachments. |
| `list_tasks` | List / filter tasks. |
| `transition_task` | Move to a new status. Comment required. |
| `update_task` | Update fields (repo, branch, agent, model, etc.). |
| `add_comment` | Add a comment without a transition. |
| `list_projects` / `create_project` | Manage projects. |

Resource `dume://queue` returns `{ todo, inProgress }` as JSON.

Typical flow:
1. `claim_next_task` (comment: "starting; analysis: ...").
2. work; `update_task` with repo/branch.
3. `transition_task` → `ai_testing` (comment: what you tested, results).
4. `transition_task` → `manual_testing` (comment: review-ready summary). Stop.

## Path B — CLI (any agent with a shell)

Use `--json` so you can parse output.

```bash
# claim the top task, capture its id
id=$(dum-e task next --json -m "starting; reproducing the bug" | jq -r '.task.id')

# record git context
dum-e task update "$id" --repo myrepo --branch fix/login --json

# advance with a comment on every move
dum-e task move "$id" ai_testing -m "added unit tests, all green" --actor agent --json
dum-e task move "$id" manual_testing -m "verified locally; ready for review" --actor agent --json
# ...then STOP and wait for the human.

# create a task up front if one doesn't exist
dum-e task add "Fix flaky login test" --type bug --priority high --json

# see what's waiting on the human
dum-e task ls --status manual_testing --json
```

If a task comes back rejected, `dum-e task next` claims it first; read the
latest comment with `dum-e task show "$id" --json`, fix the flagged issue, and
walk it back through `ai_testing` to `manual_testing`.

## Fields

- **priority**: `low | medium | high | urgent`
- **type**: `bug | feature | documentation | chore`
- **actor / author**: `human | agent | system` (use `agent` for your actions)

Run `dum-e agent-rules` to print this contract for pasting into a system prompt.
See the repo's `docs/AGENTS.md` for more.
