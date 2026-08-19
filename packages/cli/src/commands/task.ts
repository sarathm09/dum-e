import chalk from 'chalk';
import type { Priority, TaskType, AssigneeKind } from '@dum-e/core';
import { getKernel } from '../kernel.js';
import { colorPriority, colorStatus, emit, fail, isJson, ok, table, taskLine } from '../format.js';

interface AddOpts {
  project?: string;
  details?: string;
  priority?: Priority;
  type?: TaskType;
  agent?: string;
  model?: string;
  repo?: string;
  branch?: string;
  assignee?: AssigneeKind;
}

/** Resolve the target project: explicit flag, else the sole/first project, else auto-create Inbox. */
async function resolveProjectId(explicit?: string): Promise<string> {
  const kernel = getKernel();
  if (explicit) return kernel.projects.resolve(explicit).id;
  const existing = kernel.projects.list();
  if (existing.length > 0) return existing[0]!.id;
  const inbox = await kernel.projects.create({ name: 'Inbox', key: 'INBOX' });
  return inbox.id;
}

export async function taskAdd(title: string, opts: AddOpts): Promise<void> {
  const kernel = getKernel();
  const projectId = await resolveProjectId(opts.project);
  const task = await kernel.tasks.create({
    projectId,
    title,
    details: opts.details ?? '',
    priority: opts.priority ?? 'medium',
    type: opts.type ?? 'feature',
    agentId: opts.agent ?? null,
    modelId: opts.model ?? null,
    repo: opts.repo ?? null,
    branch: opts.branch ?? null,
    assignee: opts.assignee ?? 'agent',
  });
  emit(task, () => ok(`created task ${chalk.dim(task.id)}: ${task.title}`));
}

interface ListOpts {
  project?: string;
  status?: string;
  priority?: Priority;
  type?: TaskType;
  agent?: string;
  search?: string;
}

export function taskList(opts: ListOpts): void {
  const kernel = getKernel();
  const projectId = opts.project ? kernel.projects.resolve(opts.project).id : undefined;
  const tasks = kernel.tasks.list({
    ...(projectId ? { projectId } : {}),
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.priority ? { priority: opts.priority } : {}),
    ...(opts.type ? { type: opts.type } : {}),
    ...(opts.agent ? { agentId: opts.agent } : {}),
    ...(opts.search ? { search: opts.search } : {}),
  });
  emit(tasks, () => {
    if (tasks.length === 0) {
      console.log('no matching tasks');
      return;
    }
    console.log(tasks.map(taskLine).join('\n'));
    console.log(chalk.dim(`\n${tasks.length} task(s)`));
  });
}

export function taskShow(id: string): void {
  const kernel = getKernel();
  const task = kernel.tasks.get(id);
  const comments = kernel.comments.list(id);
  const history = kernel.tasks.history(id);
  const attachments = kernel.attachments.list(id);

  if (isJson()) {
    console.log(JSON.stringify({ task, comments, history, attachments }, null, 2));
    return;
  }
  console.log(chalk.bold(task.title), chalk.dim(`(${task.id})`));
  console.log(
    table(
      ['field', 'value'],
      [
        ['status', colorStatus(task.status)],
        ['priority', colorPriority(task.priority)],
        ['type', task.type],
        ['project', task.projectId],
        ['agent', task.agentId ?? 'none'],
        ['model', task.modelId ?? 'none'],
        ['assignee', task.assignee],
        ['repo', task.repo ?? 'none'],
        ['branch', task.branch ?? 'none'],
        ['rejected', task.rejectionFlag ? chalk.red('yes') : 'no'],
        ['created', task.createdAt],
        ['updated', task.updatedAt],
      ],
    ),
  );
  if (task.details) console.log('\n' + chalk.bold('Details:') + '\n' + task.details);
  if (attachments.length) {
    console.log('\n' + chalk.bold('Attachments:'));
    for (const a of attachments) console.log(`  • ${a.filename} (${a.size} bytes)`);
  }
  if (comments.length) {
    console.log('\n' + chalk.bold('Comments:'));
    for (const c of comments) {
      console.log(`  ${chalk.dim(c.createdAt)} ${chalk.cyan(c.author)}: ${c.body}`);
    }
  }
  if (history.length) {
    console.log('\n' + chalk.bold('History:'));
    for (const h of history) {
      console.log(`  ${chalk.dim(h.createdAt)} ${h.fromStatus ?? '∅'} → ${colorStatus(h.toStatus)} (${h.actor})`);
    }
  }
}

interface UpdateOpts {
  title?: string;
  details?: string;
  priority?: Priority;
  type?: TaskType;
  agent?: string;
  model?: string;
  repo?: string;
  branch?: string;
  assignee?: AssigneeKind;
}

export async function taskUpdate(id: string, opts: UpdateOpts): Promise<void> {
  const kernel = getKernel();
  const patch = {
    ...(opts.title !== undefined ? { title: opts.title } : {}),
    ...(opts.details !== undefined ? { details: opts.details } : {}),
    ...(opts.priority ? { priority: opts.priority } : {}),
    ...(opts.type ? { type: opts.type } : {}),
    ...(opts.agent !== undefined ? { agentId: opts.agent } : {}),
    ...(opts.model !== undefined ? { modelId: opts.model } : {}),
    ...(opts.repo !== undefined ? { repo: opts.repo } : {}),
    ...(opts.branch !== undefined ? { branch: opts.branch } : {}),
    ...(opts.assignee ? { assignee: opts.assignee } : {}),
  };
  const task = await kernel.tasks.update(id, patch);
  emit(task, () => ok(`updated task ${chalk.dim(task.id)}`));
}

export async function taskNext(opts: { project?: string; message?: string }): Promise<void> {
  const kernel = getKernel();
  const projectId = opts.project ? kernel.projects.resolve(opts.project).id : undefined;
  const result = await kernel.tasks.claimNext({
    ...(projectId ? { projectId } : {}),
    ...(opts.message ? { comment: opts.message } : {}),
  });
  emit(result, () => {
    if (!result) {
      console.log('queue empty, nothing to claim');
      return;
    }
    ok(`claimed ${chalk.dim(result.task.id)} → ${colorStatus(result.task.status)}`);
    console.log(chalk.bold(result.task.title));
    if (result.task.details) console.log('\n' + result.task.details);
  });
}

export async function taskMove(id: string, status: string, opts: { message?: string; actor?: string }): Promise<void> {
  if (!opts.message) {
    fail('a comment is required: dum-e task move <id> <status> -m "why"');
    process.exitCode = 1;
    return;
  }
  const kernel = getKernel();
  const result = await kernel.tasks.transition(id, {
    to: status,
    comment: opts.message,
    actor: (opts.actor as 'human' | 'agent' | 'system') ?? 'human',
  });
  emit(result, () => ok(`${chalk.dim(id)} → ${colorStatus(result.task.status)}`));
}

export async function taskComment(id: string, opts: { message?: string; author?: string }): Promise<void> {
  if (!opts.message) {
    fail('a comment body is required: dum-e task comment <id> -m "text"');
    process.exitCode = 1;
    return;
  }
  const kernel = getKernel();
  const comment = await kernel.comments.add(id, {
    body: opts.message,
    author: (opts.author as 'human' | 'agent' | 'system') ?? 'human',
  });
  emit(comment, () => ok(`comment added to ${chalk.dim(id)}`));
}
