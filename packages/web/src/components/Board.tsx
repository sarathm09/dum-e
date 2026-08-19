import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { STATUSES, TRANSITIONS, type Task } from '../types';
import { useTasks, useTransition } from '../hooks/queries';
import { Column } from './Column';
import { Card } from './Card';
import { TransitionModal } from './TransitionModal';

interface PendingMove {
  task: Task;
  to: string;
}

export function Board({ projectId }: { projectId?: string }) {
  const { data: tasks = [] } = useTasks(projectId ? { projectId } : {});
  const transition = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byStatus = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const s of STATUSES) map[s] = [];
    for (const t of tasks) (map[t.status] ??= []).push(t);
    return map;
  }, [tasks]);

  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🤖</div>
        <h2>No tasks yet</h2>
        <p className="dim">
          dum-e is ready. Create your first task, or let an agent claim work from the queue.
        </p>
        <button
          className="primary"
          onClick={() => window.dispatchEvent(new CustomEvent('dume:new-task'))}
        >
          New task
        </button>
        <p className="dim empty-hint">
          Or from the terminal: <code>dum-e task add "Fix login" --priority high</code>
        </p>
      </div>
    );
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const task = tasks.find((t) => t.id === String(active.id));
    if (!task) return;

    // The drop target is either a column (status id) or another card (carry its status).
    const overId = String(over.id);
    const targetStatus = STATUSES.includes(overId as (typeof STATUSES)[number])
      ? overId
      : (over.data.current?.status as string | undefined);
    if (!targetStatus || targetStatus === task.status) return;
    if (!(TRANSITIONS[task.status] ?? []).includes(targetStatus)) return; // illegal move, ignore

    setPending({ task, to: targetStatus });
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="board">
          {STATUSES.map((s) => (
            <Column key={s} status={s} tasks={byStatus[s] ?? []} />
          ))}
        </div>
        <DragOverlay>{activeTask ? <Card task={activeTask} /> : null}</DragOverlay>
      </DndContext>

      {pending && (
        <TransitionModal
          title={pending.task.title}
          from={pending.task.status}
          to={pending.to}
          onCancel={() => setPending(null)}
          onConfirm={(comment) => {
            transition.mutate({ id: pending.task.id, to: pending.to, comment, actor: 'human' });
            setPending(null);
          }}
        />
      )}
    </>
  );
}
