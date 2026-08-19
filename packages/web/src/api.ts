import type {
  AgentDef,
  AppConfig,
  Attachment,
  Comment,
  Metrics,
  ModelDef,
  Project,
  Task,
  TaskDetail,
  TransitionResult,
} from './types';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface TaskFilter {
  projectId?: string;
  status?: string;
  priority?: string;
  type?: string;
  agentId?: string;
  search?: string;
}

export const api = {
  listProjects: () => req<Project[]>('/projects'),
  createProject: (body: { name: string; key?: string; repo?: string }) =>
    req<Project>('/projects', { method: 'POST', body: JSON.stringify(body) }),

  listTasks: (filter: TaskFilter = {}) => {
    const qs = new URLSearchParams(
      Object.entries(filter).filter(([, v]) => v) as [string, string][],
    ).toString();
    return req<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
  },
  getTask: (id: string) => req<TaskDetail>(`/tasks/${id}`),
  createTask: (body: Partial<Task> & { projectId: string; title: string }) =>
    req<Task>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: string, body: Partial<Task>) =>
    req<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  transitionTask: (id: string, body: { to: string; comment: string; actor?: string }) =>
    req<TransitionResult>(`/tasks/${id}/transition`, { method: 'POST', body: JSON.stringify(body) }),
  claimNext: (body: { projectId?: string; comment?: string }) =>
    req<TransitionResult | null>('/tasks/next', { method: 'POST', body: JSON.stringify(body) }),
  addComment: (id: string, body: { body: string; author?: string }) =>
    req<Comment>(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),

  addAttachmentFile: async (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    // Do not set Content-Type; the browser adds the multipart boundary.
    const res = await fetch(`${BASE}/tasks/${id}/attachments`, { method: 'POST', body: form });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(b.error ?? `${res.status} ${res.statusText}`);
    }
    return (await res.json()) as Attachment;
  },
  addAttachmentLink: (id: string, body: { url: string; filename?: string }) =>
    req<Attachment>(`/tasks/${id}/attachments`, { method: 'POST', body: JSON.stringify(body) }),
  attachmentRawUrl: (taskId: string, attId: string) =>
    `${BASE}/tasks/${taskId}/attachments/${attId}/raw`,

  listAgents: () => req<AgentDef[]>('/agents'),
  listModels: () => req<ModelDef[]>('/models'),
  config: () => req<AppConfig>('/config'),
  metrics: () => req<Metrics>('/metrics'),
};
