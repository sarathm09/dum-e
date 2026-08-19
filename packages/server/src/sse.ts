import { streamSSE } from 'hono/streaming';
import type { Context } from 'hono';
import type { Kernel } from '@dum-e/core';

/** Streams every kernel event to the client as SSE, unsubscribing on disconnect. */
export function eventsStream(c: Context, kernel: Kernel) {
  return streamSSE(c, async (stream) => {
    let resolveClosed: () => void;
    const closed = new Promise<void>((resolve) => {
      resolveClosed = resolve;
    });
    const unsubscribe = kernel.bus.onAny((event, payload) => {
      // Fire-and-forget: streamSSE serializes internally, no need to await here.
      void stream.writeSSE({ event, data: JSON.stringify(payload) });
    });
    stream.onAbort(() => {
      unsubscribe();
      resolveClosed();
    });
    // Keep the handler alive until the client disconnects.
    await closed;
  });
}
