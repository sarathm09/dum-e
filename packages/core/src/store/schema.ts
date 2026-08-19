export const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  key            TEXT NOT NULL UNIQUE,
  repo           TEXT,
  default_branch TEXT,
  state_machine  TEXT,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  details        TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL,
  repo           TEXT,
  branch         TEXT,
  priority       TEXT NOT NULL DEFAULT 'medium',
  type           TEXT NOT NULL DEFAULT 'feature',
  agent_id       TEXT,
  model_id       TEXT,
  assignee       TEXT NOT NULL DEFAULT 'agent',
  rejection_flag INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks(updated_at);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);

CREATE TABLE IF NOT EXISTS attachments (
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename   TEXT NOT NULL,
  path       TEXT,
  url        TEXT,
  mime       TEXT,
  size       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id);

CREATE TABLE IF NOT EXISTS transitions (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  actor       TEXT NOT NULL,
  comment_id  TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transitions_task ON transitions(task_id);

CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
  title,
  details,
  content='tasks',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
  INSERT INTO tasks_fts(rowid, title, details) VALUES (new.rowid, new.title, new.details);
END;
CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, title, details) VALUES ('delete', old.rowid, old.title, old.details);
END;
CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, title, details) VALUES ('delete', old.rowid, old.title, old.details);
  INSERT INTO tasks_fts(rowid, title, details) VALUES (new.rowid, new.title, new.details);
END;
`;
