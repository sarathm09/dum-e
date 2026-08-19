import { useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import gsap from 'gsap';
import type { Task } from '../types';
import { STATUS_LABELS } from '../types';
import { statusColor } from '../ui';
import { Card } from './Card';

export function Column({ status, tasks }: { status: string; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Stagger cards in whenever the set for this column changes.
  useEffect(() => {
    if (!bodyRef.current) return;
    const cards = bodyRef.current.querySelectorAll('.card');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power2.out', overwrite: true },
    );
  }, [tasks.map((t) => t.id).join(',')]);

  return (
    <div className="column">
      <div className="column-head">
        <span className="column-dot" style={{ background: statusColor(status) }} />
        {STATUS_LABELS[status] ?? status}
        <span className="column-count">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={(el) => { setNodeRef(el); bodyRef.current = el; }} className={`column-body${isOver ? ' drop-active' : ''}`}>
          {tasks.map((t) => (
            <Card key={t.id} task={t} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
