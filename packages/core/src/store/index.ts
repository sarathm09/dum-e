import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  Attachment,
  Comment,
  Project,
  StateMachineDef,
  Task,
  Transition,
} from '../domain/types.js';
import type { TaskFilter } from '../domain/schemas.js';
import { dbPath } from '../config/paths.js';
import { SCHEMA } from './schema.js';

interface ProjectRow {
  id: string;
  name: string;
  key: string;
  repo: string | null;
  default_branch: string | null;
  state_machine: string | null;
  created_at: string;
}

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  details: string;
  status: string;
  repo: string | null;
  branch: string | null;
  priority: string;
  type: string;
  agent_id: string | null;
  model_id: string | null;
  assignee: string;
  rejection_flag: number;
  created_at: string;
  updated_at: string;
}

interface CommentRow {
  id: string;
  task_id: string;
  author: string;
  body: string;
  created_at: string;
}

interface AttachmentRow {
  id: string;
  task_id: string;
  filename: string;
  path: string | null;
  url: string | null;
  mime: string | null;
  size: number;
  created_at: string;
}

interface TransitionRow {
  id: string;
  task_id: string;
  from_status: string | null;
  to_status: string;
  actor: string;
  comment_id: string;
  created_at: string;
}

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function toProject(r: ProjectRow): Project {
  return {
    id: r.id,
    name: r.name,
    key: r.key,
    repo: r.repo,
    defaultBranch: r.default_branch,
    stateMachine: r.state_machine ? (JSON.parse(r.state_machine) as StateMachineDef) : null,
    createdAt: r.created_at,
  };
}

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    details: r.details,
    status: r.status,
    repo: r.repo,
    branch: r.branch,
    priority: r.priority as Task['priority'],
    type: r.type as Task['type'],
    agentId: r.agent_id,
    modelId: r.model_id,
    assignee: r.assignee as Task['assignee'],
    rejectionFlag: r.rejection_flag === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toComment(r: CommentRow): Comment {
  return {
    id: r.id,
    taskId: r.task_id,
    author: r.author as Comment['author'],
    body: r.body,
    createdAt: r.created_at,
  };
}

function toAttachment(r: AttachmentRow): Attachment {
  return {
    id: r.id,
    taskId: r.task_id,
    filename: r.filename,
    path: r.url ? null : r.path,
    url: r.url ?? null,
    mime: r.mime,
    size: r.size,
    createdAt: r.created_at,
  };
}

function toTransition(r: TransitionRow): Transition {
  return {
    id: r.id,
    taskId: r.task_id,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    actor: r.actor as Transition['actor'],
    commentId: r.comment_id,
    createdAt: r.created_at,
  };
}

/** Wraps an FTS5 query so operator tokens in user input are treated as literals. */
function escapeFtsQuery(query: string): string {
  const tokens = query.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (tokens.length === 0) return '""';
  return tokens.map((t) => `"${t}"*`).join(' ');
}

export class Store {
  readonly db: Database.Database;

  constructor(path: string = dbPath()) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA);
    this.migrate();
  }

  /** Idempotent migrations for existing databases created before schema additions. */
  private migrate(): void {
    try {
      const cols = this.db.prepare(`PRAGMA table_info('attachments')`).all() as Array<{
        name: string;
      }>;
      if (!cols.some((c) => c.name === 'url')) {
        this.db.exec('ALTER TABLE attachments ADD COLUMN url TEXT');
      }
    } catch {
      // best-effort; if this fails the table likely doesn't exist yet or already has the column
    }
  }

  close(): void {
    this.db.close();
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  // --- projects ---

  insertProject(p: Project): Project {
    this.db
      .prepare(
        `INSERT INTO projects (id, name, key, repo, default_branch, state_machine, created_at)
         VALUES (@id, @name, @key, @repo, @default_branch, @state_machine, @created_at)`,
      )
      .run({
        id: p.id,
        name: p.name,
        key: p.key,
        repo: p.repo,
        default_branch: p.defaultBranch,
        state_machine: p.stateMachine ? JSON.stringify(p.stateMachine) : null,
        created_at: p.createdAt,
      });
    return p;
  }

  getProject(id: string): Project | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
      | ProjectRow
      | undefined;
    return row ? toProject(row) : null;
  }

  getProjectByKey(key: string): Project | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE key = ?').get(key) as
      | ProjectRow
      | undefined;
    return row ? toProject(row) : null;
  }

  listProjects(): Project[] {
    const rows = this.db
      .prepare('SELECT * FROM projects ORDER BY created_at ASC')
      .all() as ProjectRow[];
    return rows.map(toProject);
  }

  // --- tasks ---

  insertTask(t: Task): Task {
    this.db
      .prepare(
        `INSERT INTO tasks
           (id, project_id, title, details, status, repo, branch, priority, type,
            agent_id, model_id, assignee, rejection_flag, created_at, updated_at)
         VALUES
           (@id, @project_id, @title, @details, @status, @repo, @branch, @priority, @type,
            @agent_id, @model_id, @assignee, @rejection_flag, @created_at, @updated_at)`,
      )
      .run(this.taskParams(t));
    return t;
  }

  updateTask(t: Task): Task {
    this.db
      .prepare(
        `UPDATE tasks SET
           title=@title, details=@details, status=@status, repo=@repo, branch=@branch,
           priority=@priority, type=@type, agent_id=@agent_id, model_id=@model_id,
           assignee=@assignee, rejection_flag=@rejection_flag, updated_at=@updated_at
         WHERE id=@id`,
      )
      .run(this.taskParams(t));
    return t;
  }

  private taskParams(t: Task) {
    return {
      id: t.id,
      project_id: t.projectId,
      title: t.title,
      details: t.details,
      status: t.status,
      repo: t.repo,
      branch: t.branch,
      priority: t.priority,
      type: t.type,
      agent_id: t.agentId,
      model_id: t.modelId,
      assignee: t.assignee,
      rejection_flag: t.rejectionFlag ? 1 : 0,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    };
  }

  getTask(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return row ? toTask(row) : null;
  }

  listTasks(filter: TaskFilter = {}): Task[] {
    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.projectId) {
      where.push('project_id = @projectId');
      params.projectId = filter.projectId;
    }
    if (filter.status) {
      where.push('status = @status');
      params.status = filter.status;
    }
    if (filter.priority) {
      where.push('priority = @priority');
      params.priority = filter.priority;
    }
    if (filter.type) {
      where.push('type = @type');
      params.type = filter.type;
    }
    if (filter.agentId) {
      where.push('agent_id = @agentId');
      params.agentId = filter.agentId;
    }

    if (filter.search) {
      const ids = this.searchTaskIds(filter.search);
      if (ids.length === 0) return [];
      where.push(`id IN (${ids.map((_, i) => `@s${i}`).join(',')})`);
      ids.forEach((id, i) => {
        params[`s${i}`] = id;
      });
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`SELECT * FROM tasks ${clause} ORDER BY updated_at DESC`)
      .all(params) as TaskRow[];
    return rows.map(toTask);
  }

  private searchTaskIds(query: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT tasks.id AS id FROM tasks_fts
         JOIN tasks ON tasks.rowid = tasks_fts.rowid
         WHERE tasks_fts MATCH ? ORDER BY rank`,
      )
      .all(escapeFtsQuery(query)) as Array<{ id: string }>;
    return rows.map((r) => r.id);
  }

  /**
   * Highest-priority claimable task in a status (default `todo`), rejection-flagged
   * first, then by priority rank, then oldest. Returns null if the queue is empty.
   */
  nextClaimable(status = 'todo', projectId?: string): Task | null {
    const rows = this.listTasks({ status, ...(projectId ? { projectId } : {}) });
    if (rows.length === 0) return null;
    return rows.sort((a, b) => {
      if (a.rejectionFlag !== b.rejectionFlag) return a.rejectionFlag ? -1 : 1;
      const pr = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      if (pr !== 0) return pr;
      return a.createdAt.localeCompare(b.createdAt);
    })[0]!;
  }

  // --- comments ---

  insertComment(c: Comment): Comment {
    this.db
      .prepare(
        `INSERT INTO comments (id, task_id, author, body, created_at)
         VALUES (@id, @task_id, @author, @body, @created_at)`,
      )
      .run({
        id: c.id,
        task_id: c.taskId,
        author: c.author,
        body: c.body,
        created_at: c.createdAt,
      });
    return c;
  }

  listComments(taskId: string): Comment[] {
    const rows = this.db
      .prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC')
      .all(taskId) as CommentRow[];
    return rows.map(toComment);
  }

  // --- attachments ---

  insertAttachment(a: Attachment): Attachment {
    this.db
      .prepare(
        `INSERT INTO attachments (id, task_id, filename, path, url, mime, size, created_at)
         VALUES (@id, @task_id, @filename, @path, @url, @mime, @size, @created_at)`,
      )
      .run({
        id: a.id,
        task_id: a.taskId,
        filename: a.filename,
        path: a.path ?? '',
        url: a.url ?? null,
        mime: a.mime,
        size: a.size,
        created_at: a.createdAt,
      });
    return a;
  }

  listAttachments(taskId: string): Attachment[] {
    const rows = this.db
      .prepare('SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at ASC')
      .all(taskId) as AttachmentRow[];
    return rows.map(toAttachment);
  }

  getAttachment(id: string): Attachment | undefined {
    const row = this.db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as
      | AttachmentRow
      | undefined;
    return row ? toAttachment(row) : undefined;
  }

  // --- transitions ---

  insertTransition(t: Transition): Transition {
    this.db
      .prepare(
        `INSERT INTO transitions (id, task_id, from_status, to_status, actor, comment_id, created_at)
         VALUES (@id, @task_id, @from_status, @to_status, @actor, @comment_id, @created_at)`,
      )
      .run({
        id: t.id,
        task_id: t.taskId,
        from_status: t.fromStatus,
        to_status: t.toStatus,
        actor: t.actor,
        comment_id: t.commentId,
        created_at: t.createdAt,
      });
    return t;
  }

  listTransitions(taskId: string): Transition[] {
    const rows = this.db
      .prepare('SELECT * FROM transitions WHERE task_id = ? ORDER BY created_at ASC')
      .all(taskId) as TransitionRow[];
    return rows.map(toTransition);
  }
}
