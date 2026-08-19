import { useForm } from '@tanstack/react-form';
import type { Priority, Project, TaskType } from '../types';
import { useCreateProject, useCreateTask, useProjects } from '../hooks/queries';

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const TYPES: TaskType[] = ['bug', 'feature', 'documentation', 'chore'];

export function NewTaskModal({ onClose }: { onClose: () => void }) {
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New task</h3>
        {isLoading ? (
          <p className="dim">Loading…</p>
        ) : (
          // Key on the resolved project so the form re-seeds its default
          // projectId once projects have loaded (TanStack Form reads
          // defaultValues only at mount).
          <NewTaskForm
            key={projects?.[0]?.id ?? 'no-project'}
            projects={projects ?? []}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function NewTaskForm({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const create = useCreateTask();
  const createProject = useCreateProject();
  const needsProject = projects.length === 0;

  const form = useForm({
    defaultValues: {
      projectName: '',
      projectId: projects[0]?.id ?? '',
      title: '',
      details: '',
      priority: 'medium' as Priority,
      type: 'feature' as TaskType,
    },
    onSubmit: async ({ value }) => {
      if (!value.title.trim()) return;

      let projectId = value.projectId;
      if (needsProject) {
        const name = value.projectName.trim() || 'Inbox';
        const project = await createProject.mutateAsync({ name });
        projectId = project.id;
      }
      if (!projectId) return;

      await create.mutateAsync({
        projectId,
        title: value.title.trim(),
        details: value.details,
        priority: value.priority,
        type: value.type,
      });
      onClose();
    },
  });

  const busy = create.isPending || createProject.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      {needsProject ? (
        <label className="field">
          <span className="field-label">Project</span>
          <form.Field name="projectName">
            {(field) => (
              <input
                placeholder="Project name (e.g. Web App)"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>
          <span className="field-hint">No projects yet — this creates your first one.</span>
        </label>
      ) : (
        <label className="field">
          <span className="field-label">Project</span>
          <form.Field name="projectId">
            {(field) => (
              <select
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.key ? `${p.key} — ${p.name}` : p.name}
                  </option>
                ))}
              </select>
            )}
          </form.Field>
        </label>
      )}

      <label className="field">
        <span className="field-label">Title</span>
        <form.Field name="title">
          {(field) => (
            <input
              autoFocus
              placeholder="What needs doing?"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>
      </label>

      <label className="field">
        <span className="field-label">Details</span>
        <form.Field name="details">
          {(field) => (
            <textarea
              rows={4}
              placeholder="Markdown supported (optional)"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>
      </label>

      <div className="field-grid">
        <label className="field">
          <span className="field-label">Priority</span>
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
        </label>
        <label className="field">
          <span className="field-label">Type</span>
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
        </label>
      </div>

      <form.Subscribe selector={(s) => s.values.title}>
        {(title) => (
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={busy || !title.trim()}>
              {busy ? 'Creating…' : 'Create task'}
            </button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
