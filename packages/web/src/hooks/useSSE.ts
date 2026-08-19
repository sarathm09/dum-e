import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Subscribes to the server's SSE stream and invalidates the relevant queries when
 * tasks change elsewhere (e.g. an agent working the queue), so every view stays live.
 */
export function useSSE(): void {
  const qc = useQueryClient();
  useEffect(() => {
    const source = new EventSource('/api/events');
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      void qc.invalidateQueries({ queryKey: ['metrics'] });
    };
    const onTask = (e: MessageEvent) => {
      refresh();
      try {
        const payload = JSON.parse(e.data) as { task?: { id: string } };
        if (payload.task?.id) {
          void qc.invalidateQueries({ queryKey: ['task', payload.task.id] });
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    for (const name of ['task:created', 'task:updated', 'task:transitioned', 'comment:added']) {
      source.addEventListener(name, onTask as EventListener);
    }
    source.addEventListener('error', () => {
      /* EventSource auto-reconnects; nothing to do */
    });
    return () => source.close();
  }, [qc]);
}
