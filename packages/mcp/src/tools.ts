import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  Kernel,
  DumeError,
  PRIORITIES,
  TASK_TYPES,
  ASSIGNEE_KINDS,
  COMMENT_AUTHORS,
} from '@dum-e/core';

type ToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function fail(err: unknown): ToolResult {
  const message = err instanceof DumeError ? `${err.code}: ${err.message}` : String(err);
  return { content: [{ type: 'text', text: message }], isError: true };
}

/** Resolve a project id from either an explicit projectId, a projectKey, or the default project. */
function resolveProjectId(kernel: Kernel, opts: { projectId?: string; projectKey?: string }): string {
  if (opts.projectId) return opts.projectId;
  if (opts.projectKey) return kernel.projects.resolve(opts.projectKey).id;
  return kernel.projects.requireDefault().id;
}

export function registerTools(server: McpServer, kernel: Kernel): void {
  server.tool('list_projects', 'List all projects.', {}, async () => {
    try {
      return ok(kernel.projects.list());
    } catch (err) {
      return fail(err);
    }
  });

  server.tool(
    'create_project',
    'Create a new project.',
    {
      name: z.string().min(1),
      key: z.string().optional(),
      repo: z.string().optional(),
    },
    async ({ name, key, repo }) => {
      try {
        return ok(await kernel.projects.create({ name, key, repo }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    'list_tasks',
    'List tasks, optionally filtered.',
    {
      projectId: z.string().optional(),
      status: z.string().optional(),
      priority: z.enum(PRIORITIES).optional(),
      type: z.enum(TASK_TYPES).optional(),
      agentId: z.string().optional(),
      search: z.string().optional(),
    },
    async (filter) => {
      try {
        return ok(kernel.tasks.list(filter));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    'get_task',
    'Get a task by id, including its comments and transition history.',
    { id: z.string().min(1) },
    async ({ id }) => {
      try {
        const task = kernel.tasks.get(id);
        const comments = kernel.comments.list(id);
        const history = kernel.tasks.history(id);
        return ok({ task, comments, history });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    'create_task',
    'Create a task in a project (by id or key; falls back to the default project).',
    {
      projectId: z.string().optional(),
      projectKey: z.string().optional(),
      title: z.string().min(1),
      details: z.string().optional(),
      priority: z.enum(PRIORITIES).optional(),
      type: z.enum(TASK_TYPES).optional(),
      agentId: z.string().optional(),
      modelId: z.string().optional(),
      repo: z.string().optional(),
      branch: z.string().optional(),
    },
    async ({ projectId, projectKey, ...rest }) => {
      try {
        const resolvedProjectId = resolveProjectId(kernel, { projectId, projectKey });
        return ok(await kernel.tasks.create({ projectId: resolvedProjectId, ...rest }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    'claim_next_task',
    'Claim the highest-priority claimable task (todo -> in_progress). Returns null message if queue is empty.',
    {
      projectId: z.string().optional(),
      comment: z.string().optional(),
    },
    async ({ projectId, comment }) => {
      try {
        const result = await kernel.tasks.claimNext({ projectId, comment });
        if (!result) return ok({ message: 'queue empty' });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    'transition_task',
    'Move a task to a new status. A non-empty comment is required.',
    {
      id: z.string().min(1),
      to: z.string().min(1),
      comment: z.string().min(1, 'a comment is required for every transition'),
      actor: z.enum(COMMENT_AUTHORS).optional(),
    },
    async ({ id, to, comment, actor }) => {
      try {
        return ok(await kernel.tasks.transition(id, { to, comment, actor }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    'update_task',
    'Update mutable fields on a task.',
    {
      id: z.string().min(1),
      title: z.string().optional(),
      details: z.string().optional(),
      priority: z.enum(PRIORITIES).optional(),
      type: z.enum(TASK_TYPES).optional(),
      agentId: z.string().nullable().optional(),
      modelId: z.string().nullable().optional(),
      repo: z.string().nullable().optional(),
      branch: z.string().nullable().optional(),
      assignee: z.enum(ASSIGNEE_KINDS).optional(),
    },
    async ({ id, ...patch }) => {
      try {
        return ok(await kernel.tasks.update(id, patch));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    'add_comment',
    'Add a comment to a task.',
    {
      id: z.string().min(1),
      body: z.string().min(1),
      author: z.enum(COMMENT_AUTHORS).optional(),
    },
    async ({ id, body, author }) => {
      try {
        return ok(await kernel.comments.add(id, { body, author }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.resource('queue', 'dume://queue', async (uri) => {
    const todo = kernel.tasks.list({ status: 'todo' });
    const inProgress = kernel.tasks.list({ status: 'in_progress' });
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({ todo, inProgress }, null, 2),
        },
      ],
    };
  });
}
