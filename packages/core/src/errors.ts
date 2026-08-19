/** Base error carrying a machine-readable code so surfaces can map to HTTP/MCP errors. */
export class DumeError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DumeError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'not_found');
  }
}

export class ValidationError extends DumeError {
  constructor(message: string) {
    super(message, 'validation');
  }
}

/** Thrown when a status transition is not permitted by the active state machine. */
export class TransitionError extends DumeError {
  constructor(message: string) {
    super(message, 'invalid_transition');
  }
}
