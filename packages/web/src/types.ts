// Frontend mirror of the @dum-e/core domain (kept local so the web bundle never
// pulls in the native SQLite dependency). Shapes match the JSON the REST API returns.

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'bug' | 'feature' | 'documentation' | 'chore';
export type AssigneeKind = 'human' | 'agent';
export type CommentAuthor = 'human' | 'agent' | 'system';

export const STATUSES = [
  'todo',
  'in_progress',
  'ai_testing',
  'manual_testing',
  'deployment',
  'completed',
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  ai_testing: 'AI Testing',
  manual_testing: 'Manual Testing',
  deployment: 'Deployment',
  completed: 'Completed',
};

/** from-status → allowed to-statuses, mirroring the core default machine. */
export const TRANSITIONS: Record<string, string[]> = {
  todo: ['in_progress'],
  in_progress: ['ai_testing', 'todo'],
  ai_testing: ['manual_testing', 'in_progress'],
  manual_testing: ['deployment', 'in_progress'],
  deployment: ['completed', 'in_progress'],
  completed: [],
};

export interface Project {
  id: string;
  name: string;
  key: string;
  repo: string | null;
  defaultBranch: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  details: string;
  status: Status;
  repo: string | null;
  branch: string | null;
  priority: Priority;
  type: TaskType;
  agentId: string | null;
  modelId: string | null;
  assignee: AssigneeKind;
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

export interface Transition {
  id: string;
  taskId: string;
  fromStatus: string | null;
  toStatus: string;
  actor: CommentAuthor;
  commentId: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  filename: string;
  size: number;
  mime: string | null;
  /** Non-null for link attachments; null for uploaded files. */
  url: string | null;
  path: string | null;
  createdAt: string;
}

export interface TaskDetail {
  task: Task;
  comments: Comment[];
  history: Transition[];
  attachments: Attachment[];
}

export interface AgentDef {
  id: string;
  name: string;
  description?: string;
  tool?: string;
}

export interface ModelDef {
  id: string;
  name: string;
  provider?: string;
}

export interface TransitionResult {
  task: Task;
  transition: Transition;
  comment: Comment;
}

export interface AppConfig {
  agents: AgentDef[];
  models: ModelDef[];
  defaultAgent?: string;
  defaultModel?: string;
  server?: { host: string; port: number };
  ui?: Record<string, unknown>;
}

export interface StateDuration {
  status: string;
  totalMs: number;
  visits: number;
  avgMs: number;
}

export interface TaskStat {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  type: TaskType;
  createdAt: string;
  updatedAt: string;
  ageMs: number;
  transitions: number;
  timeInStatus: Record<string, number>;
  completed: boolean;
}

export interface Metrics {
  total: number;
  completed: number;
  open: number;
  avgCycleMs: number | null;
  avgOpenAgeMs: number | null;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  stateDurations: StateDuration[];
  taskStats: TaskStat[];
  recentTransitions: Transition[];
}
