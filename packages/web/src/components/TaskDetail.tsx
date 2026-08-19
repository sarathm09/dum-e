import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { STATUS_LABELS, TRANSITIONS, type Priority } from '../types';
import {
  useAddComment,
  useAgents,
  useModels,
  useTask,
  useTransition,
  useUpdateTask,
} from '../hooks/queries';
import { useSelection, statusColor } from '../ui';
import { TransitionModal } from './TransitionModal';

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];

export function TaskDetail() {
  const { selectedId, select } = useSelection();
  const { data } = useTask(selectedId);
  const { data: agents = [] } = useAgents();
  const { data: models = [] } = useModels();
  const update = useUpdateTask();
  const addComment = useAddComment();
  const transition = useTransition();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [comment, setComment] = useState('');
  const [pendingTo, setPendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && drawerRef.current) {
      gsap.fromTo(
        drawerRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.3, ease: 'power3.out' },
      );
    }
  }, [selectedId]);

  if (!selectedId || !data) return null;
  const { task, comments, history } = data;
  const allowed = TRANSITIONS[task.status] ?? [];

  return (
    <>
      <div className="drawer-backdrop" onClick={() => select(null)} />
      <div className="drawer" ref={drawerRef}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="badge" style={{ color: statusColor(task.status) }}>
            {STATUS_LABELS[task.status] ?? task.status}
          </span>
          <button onClick={() => select(null)}>✕</button>
        </div>
        <h2>{task.title}</h2>

        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {allowed.map((to) => (
            <button key={to} onClick={() => setPendingTo(to)}>
              → {STATUS_LABELS[to] ?? to}
            </button>
          ))}
        </div>

        <div className="section">
          <div className="field-row">
            <span className="dim">Priority</span>
            <select
              value={task.priority}
              onChange={(e) => update.mutate({ id: task.id, patch: { priority: e.target.value as Priority } })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <span className="dim">Agent</span>
            <select
              value={task.agentId ?? ''}
              onChange={(e) => update.mutate({ id: task.id, patch: { agentId: e.target.value || null } })}
            >
              <option value="">—</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <span className="dim">Model</span>
            <select
              value={task.modelId ?? ''}
              onChange={(e) => update.mutate({ id: task.id, patch: { modelId: e.target.value || null } })}
            >
              <option value="">—</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <span className="dim">Repo / Branch</span>
            <span>
              {task.repo ?? '—'} {task.branch ? `@ ${task.branch}` : ''}
            </span>
          </div>
        </div>

        {task.details && (
          <div className="section">
            <h3>Details</h3>
            <div className="md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.details}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="section">
          <h3>Comments</h3>
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="who">{c.author}</span>
                <span className="when">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div className="md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.body}</ReactMarkdown>
              </div>
            </div>
          ))}
          <textarea
            rows={3}
            placeholder="Add a comment (markdown supported)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ marginTop: 10 }}
          />
          <button
            className="primary"
            style={{ marginTop: 8 }}
            disabled={!comment.trim()}
            onClick={() => {
              addComment.mutate({ id: task.id, body: comment.trim(), author: 'human' });
              setComment('');
            }}
          >
            Comment
          </button>
        </div>

        <div className="section">
          <h3>History</h3>
          {history.map((h) => (
            <div key={h.id} className="comment">
              <span className="when">{new Date(h.createdAt).toLocaleString()}</span> —{' '}
              {h.fromStatus ?? '∅'} → {STATUS_LABELS[h.toStatus] ?? h.toStatus} ({h.actor})
            </div>
          ))}
        </div>
      </div>

      {pendingTo && (
        <TransitionModal
          title={task.title}
          from={task.status}
          to={pendingTo}
          onCancel={() => setPendingTo(null)}
          onConfirm={(c) => {
            transition.mutate({ id: task.id, to: pendingTo, comment: c, actor: 'human' });
            setPendingTo(null);
          }}
        />
      )}
    </>
  );
}
