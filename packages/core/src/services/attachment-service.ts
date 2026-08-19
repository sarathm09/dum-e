import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { attachmentsDir } from '../config/paths.js';
import type { Attachment } from '../domain/types.js';
import { NotFoundError } from '../errors.js';
import { newId, now } from '../id.js';
import type { Store } from '../store/index.js';

export interface AttachmentInput {
  filename: string;
  mime?: string | null;
  data: Buffer;
}

export class AttachmentService {
  constructor(private readonly store: Store) {}

  /** Persist the blob under ~/.config/dum-e/attachments/<taskId>/ and record metadata. */
  add(taskId: string, input: AttachmentInput): Attachment {
    if (!this.store.getTask(taskId)) throw new NotFoundError('task', taskId);
    const id = newId();
    const dir = join(attachmentsDir(), taskId);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${id}-${input.filename}`);
    writeFileSync(path, input.data);
    const attachment: Attachment = {
      id,
      taskId,
      filename: input.filename,
      path,
      mime: input.mime ?? null,
      size: input.data.byteLength,
      createdAt: now(),
    };
    return this.store.insertAttachment(attachment);
  }

  list(taskId: string): Attachment[] {
    if (!this.store.getTask(taskId)) throw new NotFoundError('task', taskId);
    return this.store.listAttachments(taskId);
  }
}
