import { DEFAULT_STATES, type StateMachineDef } from '../domain/types.js';
import { TransitionError } from '../errors.js';

/**
 * Default lifecycle. Agents auto-advance up to `manual_testing`; the human approves
 * (→ deployment) or rejects (→ in_progress). Reject is modeled as a normal transition
 * back to in_progress; the service layer sets the rejection flag + bumps priority.
 */
export const DEFAULT_STATE_MACHINE: StateMachineDef = {
  states: [...DEFAULT_STATES],
  initial: 'todo',
  terminal: ['completed'],
  humanGates: ['manual_testing'],
  transitions: {
    todo: ['in_progress'],
    in_progress: ['ai_testing', 'todo'],
    ai_testing: ['manual_testing', 'in_progress'],
    manual_testing: ['deployment', 'in_progress'],
    deployment: ['completed', 'in_progress'],
    completed: [],
  },
};

/** A transition is a "rejection" when it lands back on in_progress from a later stage. */
export function isRejection(from: string, to: string): boolean {
  return to === 'in_progress' && (from === 'manual_testing' || from === 'deployment');
}

export class StateMachine {
  readonly def: StateMachineDef;

  constructor(def: StateMachineDef = DEFAULT_STATE_MACHINE) {
    this.def = def;
  }

  has(status: string): boolean {
    return this.def.states.includes(status);
  }

  isTerminal(status: string): boolean {
    return this.def.terminal.includes(status);
  }

  requiresHumanGate(status: string): boolean {
    return this.def.humanGates.includes(status);
  }

  allowedFrom(status: string): string[] {
    return this.def.transitions[status] ?? [];
  }

  canTransition(from: string, to: string): boolean {
    return this.allowedFrom(from).includes(to);
  }

  /** Throws TransitionError if the move is not permitted. */
  assertTransition(from: string, to: string): void {
    if (!this.has(to)) {
      throw new TransitionError(`unknown target status: ${to}`);
    }
    if (from === to) {
      throw new TransitionError(`task is already in status: ${to}`);
    }
    if (!this.canTransition(from, to)) {
      const allowed = this.allowedFrom(from);
      throw new TransitionError(
        allowed.length
          ? `cannot move from ${from} to ${to}; allowed: ${allowed.join(', ')}`
          : `no transitions allowed from terminal status ${from}`,
      );
    }
  }
}
