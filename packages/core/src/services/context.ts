import { EventBus } from '../bus/index.js';
import { ConfigLoader, type DumeConfig } from '../config/index.js';
import { Store } from '../store/index.js';
import { ProjectService } from './project-service.js';
import { TaskService } from './task-service.js';
import { CommentService } from './comment-service.js';
import { AttachmentService } from './attachment-service.js';

/** Shared kernel wiring. One instance per process; every surface builds services off it. */
export class Kernel {
  readonly store: Store;
  readonly bus: EventBus;
  readonly config: ConfigLoader;
  readonly projects: ProjectService;
  readonly tasks: TaskService;
  readonly comments: CommentService;
  readonly attachments: AttachmentService;

  constructor(opts: { store?: Store; bus?: EventBus; config?: ConfigLoader } = {}) {
    this.store = opts.store ?? new Store();
    this.bus = opts.bus ?? new EventBus();
    this.config = opts.config ?? new ConfigLoader();
    this.projects = new ProjectService(this.store, this.bus);
    this.tasks = new TaskService(this.store, this.bus, this.config);
    this.comments = new CommentService(this.store, this.bus);
    this.attachments = new AttachmentService(this.store);
  }

  loadConfig(): DumeConfig {
    return this.config.load();
  }

  close(): void {
    this.store.close();
  }
}
