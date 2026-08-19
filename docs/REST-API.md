# REST API

Start it with `dum-e serve` (add `--open` to launch the web UI). Default bind is `127.0.0.1:4319`, configurable via `config.yaml` (`server.host`, `server.port`) or the `-H` / `-p` flags. All routes are under `/api`. Errors return `{ "error": string, "code": string }` with an appropriate status (`404` not_found, `400` validation, `409` invalid_transition).

## Endpoints

### Health
- `GET /api/health` -> `{ "ok": true }`

### Projects
- `GET /api/projects` -> `Project[]`
- `POST /api/projects` body `{ name, key?, repo? }` -> `Project` (201)
- `GET /api/projects/:id` -> `Project`

### Tasks
- `GET /api/tasks` -> `Task[]`. Query filters: `projectId`, `status`, `priority`, `type`, `agentId`, `search`.
- `POST /api/tasks` body `{ projectId, title, ... }` -> `Task` (201)
- `GET /api/tasks/:id` -> `{ task, comments, history, attachments }`
- `PATCH /api/tasks/:id` body: partial task fields -> `Task`
- `POST /api/tasks/:id/transition` body `{ to, comment, actor? }` -> `{ task, transition, comment }`. Comment is required; invalid transitions return 409.
- `POST /api/tasks/next` body `{ projectId?, comment? }` -> `{ task, transition, comment }` or `null` when the queue is empty.

### Comments
- `GET /api/tasks/:id/comments` -> `Comment[]`
- `POST /api/tasks/:id/comments` body `{ body, author? }` -> `Comment` (201)

### Attachments
- `GET /api/tasks/:id/attachments` -> `Attachment[]`
- `POST /api/tasks/:id/attachments` multipart form, field `file` -> `Attachment` (201)

### Config / reference data
- `GET /api/agents` -> `AgentDef[]`
- `GET /api/models` -> `ModelDef[]`
- `GET /api/config` -> the effective config

### Metrics
- `GET /api/metrics` -> `{ total, byStatus, byPriority, byType, recentTransitions }`

### Live updates
- `GET /api/events` -> Server-Sent Events stream. Named events: `task:created`, `task:updated`, `task:transitioned`, `comment:added`. Each event's `data` is a JSON payload. The web UI subscribes to keep every view live.

## Static assets

When `packages/web/dist` exists, the server serves it for all non-API routes, so `dum-e serve` gives you the full web UI at the same origin as the API.

## Example

```bash
curl -s localhost:4319/api/health
pid=$(curl -s -X POST localhost:4319/api/projects -H 'content-type: application/json' \
  -d '{"name":"Demo"}' | jq -r .id)
tid=$(curl -s -X POST localhost:4319/api/tasks -H 'content-type: application/json' \
  -d "{\"projectId\":\"$pid\",\"title\":\"First task\",\"type\":\"bug\",\"priority\":\"high\"}" | jq -r .id)
curl -s -X POST localhost:4319/api/tasks/$tid/transition -H 'content-type: application/json' \
  -d '{"to":"in_progress","comment":"starting"}' | jq .
```
