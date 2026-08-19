import { useState } from 'react';
import { STATUS_LABELS } from '../types';

export function TransitionModal({
  title,
  from,
  to,
  onConfirm,
  onCancel,
}: {
  title: string;
  from: string;
  to: string;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}) {
  const [comment, setComment] = useState('');
  const isReject = to === 'in_progress' && (from === 'manual_testing' || from === 'deployment');

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          {STATUS_LABELS[from] ?? from} → {STATUS_LABELS[to] ?? to}
        </h3>
        <p className="dim">{title}</p>
        {isReject && (
          <p style={{ color: 'var(--pr-urgent)' }}>
            Rejecting bumps priority and flags this task for the agent to fix first.
          </p>
        )}
        <textarea
          autoFocus
          rows={4}
          placeholder="Comment (required) — why this transition?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primary"
            disabled={!comment.trim()}
            onClick={() => onConfirm(comment.trim())}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
