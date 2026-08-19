import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ZodError } from 'zod';
import { DumeError, type Kernel, type TaskFilter } from '@dum-e/core';
import { eventsStream } from './sse.js';

const CODE_TO_STATUS: Record<string, number> = {
  not_found: 404,
  validation: 400,
  invalid_transition: 409,
};

/** Builds the Hono app wiring every REST route on top of a shared Kernel. */
export function createApp(kernel: Kernel): Hono {
  const app = new Hono();

  app.use('/api/*', cors());

  const api = new Hono();

  api.get('/health', (c) => c.json({ ok: true }));

  // --- projects ---

  api.get('/projects', (c) => c.json(kernel.projects.list()));

  api.post('/projects', async (c) => {
    const body = await c.req.json();
    const project = await kernel.projects.create(body);
    return c.json(project, 201);
  });

  api.get('/projects/:id', (c) => c.json(kernel.projects.resolve(c.req.param('id'))));

  // --- tasks ---

  api.get('/tasks', (c) => {
    const q = c.req.query();
    const filter: TaskFilter = {};
    if (q.projectId) filter.projectId = q.projectId;
    if (q.status) filter.status = q.status;
    if (q.priority) filter.priority = q.priority as TaskFilter['priority'];
    if (q.type) filter.type = q.type as TaskFilter['type'];
    if (q.agentId) filter.agentId = q.agentId;
    if (q.search) filter.search = q.search;
    return c.json(kernel.tasks.list(filter));
  });

  api.post('/tasks', async (c) => {
    const body = await c.req.json();
    const task = await kernel.tasks.create(body);
    return c.json(task, 201);
  });

  api.get('/tasks/:id', (c) => {
    const id = c.req.param('id');
    const task = kernel.tasks.get(id);
    return c.json({
      task,
      comments: kernel.comments.list(id),
      history: kernel.tasks.history(id),
      attachments: kernel.attachments.list(id),
    });
  });

  api.patch('/tasks/:id', async (c) => {
    const body = await c.req.json();
    const task = await kernel.tasks.update(c.req.param('id'), body);
    return c.json(task);
  });

  api.post('/tasks/:id/transition', async (c) => {
    const body = await c.req.json();
    const result = await kernel.tasks.transition(c.req.param('id'), body);
    return c.json(result);
  });

  api.post('/tasks/next', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const result = await kernel.tasks.claimNext(body);
    return c.json(result);
  });

  // --- comments ---

  api.get('/tasks/:id/comments', (c) => c.json(kernel.comments.list(c.req.param('id'))));

  api.post('/tasks/:id/comments', async (c) => {
    const body = await c.req.json();
    const comment = await kernel.comments.add(c.req.param('id'), body);
    return c.json(comment, 201);
  });

  // --- attachments ---

  api.get('/tasks/:id/attachments', (c) => c.json(kernel.attachments.list(c.req.param('id'))));

  api.post('/tasks/:id/attachments', async (c) => {
    const form = await c.req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return c.json({ error: 'multipart field "file" is required', code: 'validation' }, 400);
    }
    const data = Buffer.from(await file.arrayBuffer());
    const attachment = kernel.attachments.add(c.req.param('id'), {
      filename: file.name,
      mime: file.type || null,
      data,
    });
    return c.json(attachment, 201);
  });

  // --- config / reference data ---

  api.get('/agents', (c) => c.json(kernel.loadConfig().agents));
  api.get('/models', (c) => c.json(kernel.loadConfig().models));
  api.get('/config', (c) => c.json(kernel.loadConfig()));

  // --- metrics ---

  api.get('/metrics', (c) => {
    const tasks = kernel.tasks.list();
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] ?? 0) + 1;
      byType[task.type] = (byType[task.type] ?? 0) + 1;
    }
    // No store-level "all transitions" query exists; fan out per task and merge.
    const recentTransitions = tasks
      .flatMap((task) => kernel.tasks.history(task.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
    return c.json({
      total: tasks.length,
      byStatus,
      byPriority,
      byType,
      recentTransitions,
    });
  });

  // --- events (SSE) ---

  api.get('/events', (c) => eventsStream(c, kernel));

  app.route('/api', api);

  // Serve the built web app, if present, as a fallback for non-API routes.
  const here = dirname(fileURLToPath(import.meta.url));
  const webDist = join(here, '../../web/dist');
  if (existsSync(webDist)) {
    app.use('*', serveStatic({ root: webDist }));
    app.get('*', serveStatic({ path: join(webDist, 'index.html') }));
  }

  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json({ error: err.issues.map((i) => i.message).join('; '), code: 'validation' }, 400);
    }
    if (err instanceof DumeError) {
      return c.json({ error: err.message, code: err.code }, (CODE_TO_STATUS[err.code] ?? 500) as 404 | 400 | 409 | 500);
    }
    console.error('[dum-e/server] unhandled error:', err);
    return c.json({ error: 'internal server error', code: 'internal' }, 500);
  });

  return app;
}
