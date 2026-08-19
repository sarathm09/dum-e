import { useState } from 'react';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useHotkeys } from 'react-hotkeys-hook';
import { useClaimNext, useProjects } from '../hooks/queries';
import { NewTaskModal } from './NewTaskModal';
import { TaskDetail } from './TaskDetail';

export function Layout() {
  const { data: projects = [] } = useProjects();
  const claimNext = useClaimNext();
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);

  useHotkeys('n', (e) => {
    e.preventDefault();
    setShowNew(true);
  });
  useHotkeys('c', () => claimNext.mutate({ comment: 'Claimed from web UI.' }));
  useHotkeys('g+b', () => void navigate({ to: '/' }));
  useHotkeys('g+t', () => void navigate({ to: '/table' }));
  useHotkeys('g+m', () => void navigate({ to: '/metrics' }));
  useHotkeys('g+s', () => void navigate({ to: '/settings' }));
  useHotkeys('escape', () => setShowNew(false));

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          <span className="logo">dum-e</span>
          <nav className="nav">
            <Link to="/" activeProps={{ className: 'active' }} activeOptions={{ exact: true }}>
              Board
            </Link>
            <Link to="/table" activeProps={{ className: 'active' }}>
              Table
            </Link>
            <Link to="/metrics" activeProps={{ className: 'active' }}>
              Metrics
            </Link>
            <Link to="/settings" activeProps={{ className: 'active' }}>
              Settings
            </Link>
          </nav>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className="dim" style={{ fontSize: 12 }}>
            {projects.length} project{projects.length === 1 ? '' : 's'}
          </span>
          <button onClick={() => claimNext.mutate({ comment: 'Claimed from web UI.' })}>
            Claim next <kbd>c</kbd>
          </button>
          <button className="primary" onClick={() => setShowNew(true)}>
            New task <kbd>n</kbd>
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      {showNew && <NewTaskModal onClose={() => setShowNew(false)} />}
      <TaskDetail />
    </div>
  );
}
