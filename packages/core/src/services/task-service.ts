import type { EventBus } from '../bus/index.js';
import type { ConfigLoader } from '../config/index.js';
import {
  CreateTaskSchema,
  TransitionSchema,
  UpdateTaskSchema,
  type CreateTaskInput,
  type TaskFilter,
  type TransitionInput,
  type UpdateTaskInput,
} from '../domain/schemas.js';
import {
  PRIORITIES,
  type Comment,
  type Priority,
  type Task,
  type Transition,
} from '../domain/types.js';
import { NotFoundError } from '../errors.js';
import { newId, now } from '../id.js';
import { DEFAULT_STATE_MACHINE, StateMachine, isRejection } from '../statemachine/index.js';
import type { Store } from '../store/index.js';

export interface TransitionResult {
  task: Task;
  transition: Transition;
  comment: Comment;
}

function bumpPriority(p: Priority): Priority {
  const idx = PRIORITIES.indexOf(p);
  // PRIORITIES is ordered low→urgent; move one toward urgent, capped.
  return PRIORITIES[Math.min(idx + 1, PRIORITIES.length - 1)]!;
}

export class TaskService {
  constructor(
    private readonly store: Store,
    private readonly bus: EventBus,
    private readonly config: ConfigLoader,
  ) {}

  private machineFor(task: Task): StateMachine {
    const project = this.store.getProject(task.projectId);
    return new StateMachine(project?.stateMachine ?? DEFAULT_STATE_MACHINE);
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const parsed = CreateTaskSchema.parse(input);
    // Ensure project exists (throws if not).
    if (!this.store.getProject(parsed.projectId)) {
      throw new NotFoundError('project', parsed.projectId);
    }
    const cfg = this.config.load();
    const task: Task = {
      id: newId(),
      projectId: parsed.projectId,
      title: parsed.title,
      details: parsed.details,
      status: DEFAULT_STATE_MACHINE.initial,
      repo: parsed.repo ?? null,
      branch: parsed.branch ?? null,
      priority: parsed.priority,
      type: parsed.type,
      agentId: parsed.agentId ?? cfg.defaultAgent ?? null,
      modelId: parsed.modelId ?? cfg.defaultModel ?? null,
      assignee: parsed.assignee,
      rejectionFlag: false,
      createdAt: now(),
      updatedAt: now(),
    };
    this.store.insertTask(task);
    await this.bus.emit('task:created', { task });
    return task;
  }

  get(id: string): Task {
    const t = this.store.getTask(id);
    if (!t) throw new NotFoundError('task', id);
    return t;
  }

  list(filter: TaskFilter = {}): Task[] {
    return this.store.listTasks(filter);
  }

  async update(id: string, patch: UpdateTaskInput): Promise<Task> {
    const existing = this.get(id);
    const parsed = UpdateTaskSchema.parse(patch);
    const updated: Task = {
      ...existing,
      ...parsed,
      // Preserve non-nullable defaults when patch omits a key.
      repo: parsed.repo ?? existing.repo,
      branch: parsed.branch ?? existing.branch,
      agentId: parsed.agentId ?? existing.agentId,
      modelId: parsed.modelId ?? existing.modelId,
      updatedAt: now(),
    };
    this.store.updateTask(updated);
    await this.bus.emit('task:updated', { task: updated });
    return updated;
  }

  /**
   * Move a task to a new status. A comment is mandatory (schema-enforced) and is
   * written atomically with the transition record and status change.
   */
  async transition(id: string, input: TransitionInput): Promise<TransitionResult> {
    const parsed = TransitionSchema.parse(input);
    const task = this.get(id);
    const machine = this.machineFor(task);
    machine.assertTransition(task.status, parsed.to);

    const rejected = isRejection(task.status, parsed.to);
    const ts = now();

    const result = this.store.transaction<TransitionResult>(() => {
      const comment: Comment = {
        id: newId(),
        taskId: task.id,
        author: parsed.actor,
        body: parsed.comment,
        createdAt: ts,
      };
      this.store.insertComment(comment);

      const transition: Transition = {
        id: newId(),
        taskId: task.id,
        fromStatus: task.status,
        toStatus: parsed.to,
        actor: parsed.actor,
        commentId: comment.id,
        createdAt: ts,
      };
      this.store.insertTransition(transition);

      const nextTask: Task = {
        ...task,
        status: parsed.to,
        priority: rejected ? bumpPriority(task.priority) : task.priority,
        // Flag on rejection; clear once the rework is approved into deployment.
        rejectionFlag: rejected ? true : parsed.to === 'deployment' ? false : task.rejectionFlag,
        updatedAt: ts,
      };
      this.store.updateTask(nextTask);
      return { task: nextTask, transition, comment };
    });

    await this.bus.emit('task:transitioned', {
      task: result.task,
      transition: result.transition,
    });
    await this.bus.emit('comment:added', { comment: result.comment });
    return result;
  }

  /**
   * Claim the highest-priority task in a status (default `todo`) and move it to
   * `in_progress`. Rejection-flagged tasks are claimed first. Returns null if empty.
   */
  async claimNext(opts: {
    from?: string;
    projectId?: string;
    comment?: string;
    actor?: TransitionInput['actor'];
  } = {}): Promise<TransitionResult | null> {
    const from = opts.from ?? 'todo';
    const candidate = this.store.nextClaimable(from, opts.projectId);
    if (!candidate) return null;
    return this.transition(candidate.id, {
      to: 'in_progress',
      comment: opts.comment ?? 'Claimed by agent',
      actor: opts.actor ?? 'agent',
    });
  }

  history(id: string): Transition[] {
    this.get(id);
    return this.store.listTransitions(id);
  }
}
