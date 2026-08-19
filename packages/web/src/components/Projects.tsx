import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateProject, useProjects, useTasks } from '../hooks/queries';

export function Projects() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks({});
  const [showNew, setShowNew] = useState(false);

  const counts = useMemo(() => {
    const map: Record<string, { total: number; open: number }> = {};
    for (const t of tasks) {
      const c = (map[t.projectId] ??= { total: 0, open: 0 });
      c.total += 1;
      if (t.status !== 'completed') c.open += 1;
    }
    return map;
  }, [tasks]);

  const open = (id: string) => void navigate({ to: '/projects/$projectId', params: { projectId: id } });

  return (
    <div className="projects">
      <div className="projects-head">
        <h1>Projects</h1>
        <button className="primary" onClick={() => setShowNew(true)}>
          New project
        </button>
      </div>

      {isLoading ? (
        <p className="dim">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <h2>No projects yet</h2>
          <p className="dim">Create a project to start tracking tasks.</p>
          <button className="primary" onClick={() => setShowNew(true)}>
            New project
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => {
            const c = counts[p.id] ?? { total: 0, open: 0 };
            return (
              <button key={p.id} className="project-card" onClick={() => open(p.id)}>
                <div className="project-card-head">
                  {p.key && <span className="badge">{p.key}</span>}
                  <span className="project-name">{p.name}</span>
                </div>
                <div className="project-card-meta dim">
                  {c.open} open · {c.total} total
                  {p.repo ? ` · ${p.repo}` : ''}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={open} />}
    </div>
  );
}

function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const createProject = useCreateProject();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    const project = await createProject.mutateAsync({
      name: name.trim(),
      key: key.trim() || undefined,
    });
    onClose();
    onCreated(project.id);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New project</h3>
        <label className="field">
          <span className="field-label">Name</span>
          <input
            autoFocus
            placeholder="Web App"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
          />
        </label>
        <label className="field">
          <span className="field-label">Key (optional)</span>
          <input
            placeholder="WEB"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
          />
          <span className="field-hint">Short prefix. Auto-generated if left blank.</span>
        </label>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={createProject.isPending || !name.trim()}
            onClick={() => void submit()}
          >
            {createProject.isPending ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  );
}
