import type { Comment, Task, Transition } from '../domain/types.js';

export interface DumeEventMap {
  'task:created': { task: Task };
  'task:updated': { task: Task };
  'task:transitioned': { task: Task; transition: Transition };
  'comment:added': { comment: Comment };
  'project:created': { projectId: string };
}

export type DumeEventName = keyof DumeEventMap;
export type EventHandler<K extends DumeEventName> = (payload: DumeEventMap[K]) => void | Promise<void>;

interface Subscription {
  event: string;
  handler: (payload: unknown) => void | Promise<void>;
}

/** Typed async pub/sub. Handlers are awaited on emit; a throwing handler is isolated. */
export class EventBus {
  private subs = new Set<Subscription>();

  on<K extends DumeEventName>(event: K, handler: EventHandler<K>): () => void {
    const sub: Subscription = { event, handler: handler as Subscription['handler'] };
    this.subs.add(sub);
    return () => this.subs.delete(sub);
  }

  /** Subscribe to every event. Useful for SSE fan-out. */
  onAny(handler: (event: DumeEventName, payload: unknown) => void | Promise<void>): () => void {
    const sub: Subscription = {
      event: '*',
      handler: (payload) => handler((payload as { __event: DumeEventName }).__event, payload),
    };
    this.subs.add(sub);
    return () => this.subs.delete(sub);
  }

  async emit<K extends DumeEventName>(event: K, payload: DumeEventMap[K]): Promise<void> {
    const tagged = { ...payload, __event: event };
    const pending: Array<void | Promise<void>> = [];
    for (const sub of this.subs) {
      if (sub.event === event || sub.event === '*') {
        try {
          pending.push(sub.handler(tagged));
        } catch (err) {
          // Isolate synchronous throws; do not let one handler break emit.
          console.error(`[dum-e] event handler for ${event} threw:`, err);
        }
      }
    }
    await Promise.all(
      pending.map((p) =>
        Promise.resolve(p).catch((err) =>
          console.error(`[dum-e] async event handler for ${event} rejected:`, err),
        ),
      ),
    );
  }

  clear(): void {
    this.subs.clear();
  }

  get size(): number {
    return this.subs.size;
  }
}
