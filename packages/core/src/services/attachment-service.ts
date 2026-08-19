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

export interface AttachmentLinkInput {
  url: string;
  filename?: string;
  mime?: string | null;
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
      url: null,
      mime: input.mime ?? null,
      size: input.data.byteLength,
      createdAt: now(),
    };
    return this.store.insertAttachment(attachment);
  }

  /** Record a link attachment; no bytes are stored. */
  addLink(taskId: string, input: AttachmentLinkInput): Attachment {
    if (!this.store.getTask(taskId)) throw new NotFoundError('task', taskId);
    const attachment: Attachment = {
      id: newId(),
      taskId,
      filename: input.filename ?? input.url,
      path: null,
      url: input.url,
      mime: input.mime ?? null,
      size: 0,
      createdAt: now(),
    };
    return this.store.insertAttachment(attachment);
  }

  list(taskId: string): Attachment[] {
    if (!this.store.getTask(taskId)) throw new NotFoundError('task', taskId);
    return this.store.listAttachments(taskId);
  }

  get(attachmentId: string): Attachment {
    const attachment = this.store.getAttachment(attachmentId);
    if (!attachment) throw new NotFoundError('attachment', attachmentId);
    return attachment;
  }
}
