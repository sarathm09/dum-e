import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useParams } from '@tanstack/react-router';
import { useHotkeys } from 'react-hotkeys-hook';
import { useClaimNext } from '../hooks/queries';
import { NewTaskModal } from './NewTaskModal';
import { TaskDetail } from './TaskDetail';

export function Layout() {
  const claimNext = useClaimNext();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId;
  const [showNew, setShowNew] = useState(false);

  useHotkeys(
    'n',
    (e) => {
      if (!projectId) return;
      e.preventDefault();
      setShowNew(true);
    },
    [projectId],
  );
  useHotkeys('c', () => claimNext.mutate({ projectId, comment: 'Claimed from web UI.' }), [projectId]);
  useHotkeys('g+p', () => void navigate({ to: '/' }));
  useHotkeys('g+m', () => void navigate({ to: '/metrics' }));
  useHotkeys('g+s', () => void navigate({ to: '/settings' }));
  useHotkeys('escape', () => setShowNew(false));

  // Empty-state CTA (board) can request the new-task modal.
  useEffect(() => {
    const open = () => projectId && setShowNew(true);
    window.addEventListener('dume:new-task', open);
    return () => window.removeEventListener('dume:new-task', open);
  }, [projectId]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          <Link to="/" className="brand-mark">
            <img src="/logo.svg" alt="" className="logo-img" />
            <span className="logo">dum-e</span>
          </Link>
          <nav className="nav">
            <Link to="/metrics" activeProps={{ className: 'active' }}>
              Metrics
            </Link>
          </nav>
        </div>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          {projectId && (
            <>
              <button
                title="Claim the highest-priority queued task (rejections first) and move it to in_progress"
                onClick={() => claimNext.mutate({ projectId, comment: 'Claimed from web UI.' })}
              >
                Claim next <kbd>c</kbd>
              </button>
              <button className="primary" onClick={() => setShowNew(true)}>
                New task <kbd>n</kbd>
              </button>
            </>
          )}
          <Link to="/settings" className="icon-btn" title="Settings" activeProps={{ className: 'icon-btn active' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      {showNew && projectId && (
        <NewTaskModal projectId={projectId} onClose={() => setShowNew(false)} />
      )}
      <TaskDetail />
    </div>
  );
}
