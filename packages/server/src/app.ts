import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, extname, join } from 'node:path';
import { ZodError } from 'zod';
import { DumeError, type Kernel, type TaskFilter } from '@dum-e/core';
import { eventsStream } from './sse.js';

const CODE_TO_STATUS: Record<string, number> = {
  not_found: 404,
  validation: 400,
  invalid_transition: 409,
};

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
};

function guessMime(path: string): string {
  return MIME_BY_EXT[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

/** A link that points at the local filesystem rather than the web. */
function isLocalPath(url: string): boolean {
  return url.startsWith('/') || url.startsWith('~') || url.startsWith('file://');
}

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
    const contentType = c.req.header('content-type') ?? '';
    // Link attachment: JSON body { url, filename? }.
    if (!contentType.includes('multipart/form-data')) {
      const body = (await c.req.json().catch(() => ({}))) as { url?: string; filename?: string };
      if (!body.url) {
        return c.json(
          { error: 'multipart field "file" or JSON { url } is required', code: 'validation' },
          400,
        );
      }
      const url = body.url.trim();
      const attachment = kernel.attachments.addLink(c.req.param('id'), {
        url,
        // Local-path links: default the label to the file's basename, not the whole path.
        filename: body.filename ?? (isLocalPath(url) ? basename(url) : undefined),
      });
      return c.json(attachment, 201);
    }
    // File attachment: multipart form, field "file".
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

  // Raw bytes for an attachment (for inline previews):
  //   - http(s) link  : redirect out to the URL
  //   - local path link: stream the file from disk (link whose url is a filesystem path)
  //   - uploaded file  : stream the stored blob
  api.get('/tasks/:id/attachments/:attId/raw', (c) => {
    const attachment = kernel.attachments.get(c.req.param('attId'));
    if (attachment.url && /^https?:\/\//i.test(attachment.url)) {
      return c.redirect(attachment.url);
    }
    // A local-path link stores the path in `url`; an uploaded file stores it in `path`.
    const localPath = attachment.path ?? attachment.url;
    if (!localPath || !existsSync(localPath)) {
      return c.json({ error: 'attachment file missing', code: 'not_found' }, 404);
    }
    const data = readFileSync(localPath);
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': attachment.mime ?? guessMime(localPath),
        'Content-Disposition': `inline; filename="${attachment.filename.replace(/"/g, '')}"`,
      },
    });
  });

  // --- config / reference data ---

  api.get('/agents', (c) => c.json(kernel.loadConfig().agents));
  api.get('/models', (c) => c.json(kernel.loadConfig().models));
  api.get('/config', (c) => c.json(kernel.loadConfig()));

  // --- metrics ---

  api.get('/metrics', (c) => {
    const TERMINAL = 'completed';
    const now = Date.now();
    const ms = (iso: string) => new Date(iso).getTime();

    const tasks = kernel.tasks.list();
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byType: Record<string, number> = {};

    // Per-state aggregate: total dwell time + number of visits sampled.
    const stateTotals: Record<string, { totalMs: number; visits: number }> = {};
    const bump = (status: string, delta: number) => {
      const row = (stateTotals[status] ??= { totalMs: 0, visits: 0 });
      row.totalMs += delta;
      row.visits += 1;
    };

    const cycleTimes: number[] = [];
    const openAges: number[] = [];
    const allTransitions: ReturnType<typeof kernel.tasks.history> = [];

    const taskStats = tasks.map((task) => {
      byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] ?? 0) + 1;
      byType[task.type] = (byType[task.type] ?? 0) + 1;

      const history = kernel.tasks.history(task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      allTransitions.push(...history);

      // Walk the timeline: task enters its first status at createdAt, then each
      // transition closes the current status segment and opens the next.
      const timeInStatus: Record<string, number> = {};
      let prevMs = ms(task.createdAt);
      let curStatus = history[0]?.fromStatus ?? task.status;
      for (const t of history) {
        const delta = ms(t.createdAt) - prevMs;
        if (delta >= 0) {
          timeInStatus[curStatus] = (timeInStatus[curStatus] ?? 0) + delta;
          bump(curStatus, delta);
        }
        prevMs = ms(t.createdAt);
        curStatus = t.toStatus;
      }
      const completed = task.status === TERMINAL;
      if (!completed) {
        // Open task: the current status is still accruing time up to now.
        const delta = now - prevMs;
        if (delta >= 0) {
          timeInStatus[curStatus] = (timeInStatus[curStatus] ?? 0) + delta;
          bump(curStatus, delta);
        }
      }

      const ageMs = (completed ? prevMs : now) - ms(task.createdAt);
      if (completed) cycleTimes.push(ageMs);
      else openAges.push(ageMs);

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        type: task.type,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        ageMs,
        transitions: history.length,
        timeInStatus,
        completed,
      };
    });

    const stateDurations = Object.entries(stateTotals)
      .map(([status, r]) => ({
        status,
        totalMs: r.totalMs,
        visits: r.visits,
        avgMs: r.visits ? Math.round(r.totalMs / r.visits) : 0,
      }))
      .sort((a, b) => b.avgMs - a.avgMs);

    const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
    const recentTransitions = allTransitions
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);

    return c.json({
      total: tasks.length,
      completed: cycleTimes.length,
      open: openAges.length,
      avgCycleMs: avg(cycleTimes),
      avgOpenAgeMs: avg(openAges),
      byStatus,
      byPriority,
      byType,
      stateDurations,
      taskStats,
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
