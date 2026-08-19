// Domain
export * from './domain/types.js';
export * from './domain/schemas.js';

// Kernel
export { EventBus } from './bus/index.js';
export type { DumeEventMap, DumeEventName, EventHandler } from './bus/index.js';
export { Store } from './store/index.js';
export {
  ConfigLoader,
  ConfigSchema,
  DEFAULT_CONFIG,
  configDir,
  configPath,
  dbPath,
  attachmentsDir,
} from './config/index.js';
export type { DumeConfig } from './config/index.js';

// State machine
export { StateMachine, DEFAULT_STATE_MACHINE, isRejection } from './statemachine/index.js';

// Services
export { Kernel } from './services/context.js';
export { ProjectService } from './services/project-service.js';
export { TaskService } from './services/task-service.js';
export type { TransitionResult } from './services/task-service.js';
export { CommentService } from './services/comment-service.js';
export { AttachmentService } from './services/attachment-service.js';
export type { AttachmentInput } from './services/attachment-service.js';

// Utilities
export { newId, now } from './id.js';
export { DumeError, NotFoundError, ValidationError, TransitionError } from './errors.js';
