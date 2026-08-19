/**
 * Domain entities for dum-e. Storage-agnostic shapes shared across every surface
 * (CLI, REST, MCP). Zod schemas in ./schemas.ts validate untrusted input into these.
 */

/** Default lifecycle states. Projects may override the machine later. */
export const DEFAULT_STATES = [
  'todo',
  'in_progress',
  'ai_testing',
  'manual_testing',
  'deployment',
  'completed',
] as const;

export type TaskStatus = (typeof DEFAULT_STATES)[number] | (string & {});

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TASK_TYPES = ['bug', 'feature', 'documentation', 'chore'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const ASSIGNEE_KINDS = ['human', 'agent'] as const;
export type AssigneeKind = (typeof ASSIGNEE_KINDS)[number];

export const COMMENT_AUTHORS = ['human', 'agent', 'system'] as const;
export type CommentAuthor = (typeof COMMENT_AUTHORS)[number];

export interface Project {
  id: string;
  name: string;
  key: string;
  repo: string | null;
  defaultBranch: string | null;
  /** JSON state machine override; null → use the default machine. */
  stateMachine: StateMachineDef | null;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  details: string;
  status: TaskStatus;
  repo: string | null;
  branch: string | null;
  priority: Priority;
  type: TaskType;
  agentId: string | null;
  modelId: string | null;
  assignee: AssigneeKind;
  /** Set when a task was bounced back from manual testing; agents pick these first. */
  rejectionFlag: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  author: CommentAuthor;
  body: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  filename: string;
  path: string;
  mime: string | null;
  size: number;
  createdAt: string;
}

export interface Transition {
  id: string;
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  actor: CommentAuthor;
  commentId: string;
  createdAt: string;
}

/** Predefined agent an operator can assign to a task (tool/LLM-agnostic). */
export interface AgentDef {
  id: string;
  name: string;
  description?: string;
  /** e.g. "claude-code", "codex", "opencode" — informational, not enforced. */
  tool?: string;
}

/** Predefined model selectable per task or as a default. */
export interface ModelDef {
  id: string;
  name: string;
  provider?: string;
}

export interface StateMachineDef {
  states: string[];
  /** from-status → allowed to-statuses. */
  transitions: Record<string, string[]>;
  /** Statuses that require human approval to leave (informational for UI gating). */
  humanGates: string[];
  initial: string;
  terminal: string[];
}
