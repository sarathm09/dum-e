import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import { priorityStyle } from '../ui';
import { useSelection } from '../ui';

export function Card({ task }: { task: Task }) {
  const { select } = useSelection();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...listeners}
      onClick={() => select(task.id)}
    >
      <div className="card-title">{task.title}</div>
      <div className="card-meta">
        <span className="pill-priority" style={priorityStyle(task.priority)}>
          {task.priority}
        </span>
        <span className="badge">{task.type}</span>
        {task.agentId && <span className="badge">{task.agentId}</span>}
        {task.rejectionFlag && <span className="badge reject">⟲ rejected</span>}
      </div>
    </div>
  );
}
