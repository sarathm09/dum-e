import type { EventBus } from '../bus/index.js';
import { AddCommentSchema, type AddCommentInput } from '../domain/schemas.js';
import type { Comment } from '../domain/types.js';
import { NotFoundError } from '../errors.js';
import { newId, now } from '../id.js';
import type { Store } from '../store/index.js';

export class CommentService {
  constructor(
    private readonly store: Store,
    private readonly bus: EventBus,
  ) {}

  async add(taskId: string, input: AddCommentInput): Promise<Comment> {
    if (!this.store.getTask(taskId)) throw new NotFoundError('task', taskId);
    const parsed = AddCommentSchema.parse(input);
    const comment: Comment = {
      id: newId(),
      taskId,
      author: parsed.author,
      body: parsed.body,
      createdAt: now(),
    };
    this.store.insertComment(comment);
    await this.bus.emit('comment:added', { comment });
    return comment;
  }

  list(taskId: string): Comment[] {
    if (!this.store.getTask(taskId)) throw new NotFoundError('task', taskId);
    return this.store.listComments(taskId);
  }
}
