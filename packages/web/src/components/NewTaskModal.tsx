import { useForm } from '@tanstack/react-form';
import type { Priority, TaskType } from '../types';
import { useCreateTask, useProjects } from '../hooks/queries';

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const TYPES: TaskType[] = ['bug', 'feature', 'documentation', 'chore'];

export function NewTaskModal({ onClose }: { onClose: () => void }) {
  const { data: projects = [] } = useProjects();
  const create = useCreateTask();

  const form = useForm({
    defaultValues: {
      projectId: projects[0]?.id ?? '',
      title: '',
      details: '',
      priority: 'medium' as Priority,
      type: 'feature' as TaskType,
    },
    onSubmit: async ({ value }) => {
      if (!value.title.trim() || !value.projectId) return;
      await create.mutateAsync({
        projectId: value.projectId,
        title: value.title.trim(),
        details: value.details,
        priority: value.priority,
        type: value.type,
      });
      onClose();
    },
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New task</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="projectId">
            {(field) => (
              <select
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                style={{ marginBottom: 10 }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.key} — {p.name}
                  </option>
                ))}
              </select>
            )}
          </form.Field>

          <form.Field name="title">
            {(field) => (
              <input
                autoFocus
                placeholder="Title"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                style={{ marginBottom: 10 }}
              />
            )}
          </form.Field>

          <form.Field name="details">
            {(field) => (
              <textarea
                rows={4}
                placeholder="Details (markdown)"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                style={{ marginBottom: 10 }}
              />
            )}
          </form.Field>

          <div className="row" style={{ gap: 10 }}>
            <form.Field name="priority">
              {(field) => (
                <select
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value as Priority)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
            </form.Field>
            <form.Field name="type">
              {(field) => (
                <select
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value as TaskType)}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </form.Field>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
