import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { STATUS_LABELS, TRANSITIONS, type Attachment, type Priority } from '../types';
import {
  useAddAttachment,
  useAddComment,
  useAgents,
  useModels,
  useTask,
  useTransition,
  useUpdateTask,
} from '../hooks/queries';
import { api } from '../api';
import { useSelection, statusColor } from '../ui';
import { TransitionModal } from './TransitionModal';

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];

/** A link is valid if it is a web URL or an absolute local filesystem path. */
function isValidLink(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('/') || url.startsWith('~') || url.startsWith('file://');
}

function isImage(att: Attachment): boolean {
  if (att.mime?.startsWith('image/')) return true;
  const target = att.url ?? att.filename;
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(target);
}

/** Attachments list + preview, with paste / upload / link controls. Agent- and
 *  human-added items render identically (images inline, files/links as chips). */
function Attachments({ taskId, items }: { taskId: string; items: Attachment[] }) {
  const add = useAddAttachment();
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState('');

  // Global paste: while a task is open, Cmd/Ctrl+V anywhere attaches a clipboard
  // image (screenshots, copied images). Text pastes fall through to inputs.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.items;
      if (!files) return;
      for (const it of Array.from(files)) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            add.mutate({ id: taskId, file });
            return;
          }
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [taskId, add]);

  const addLink = () => {
    const url = link.trim();
    if (!isValidLink(url)) return;
    add.mutate({ id: taskId, url });
    setLink('');
  };

  return (
    <div className="section">
      <h3>Attachments</h3>
      {items.length > 0 && (
        <div className="attachments">
          {items.map((att) => {
            const href = att.url ?? api.attachmentRawUrl(taskId, att.id);
            return isImage(att) ? (
              <a key={att.id} className="attach-thumb" href={href} target="_blank" rel="noreferrer">
                <img src={href} alt={att.filename} />
              </a>
            ) : (
              <a key={att.id} className="attach-chip" href={href} target="_blank" rel="noreferrer">
                {att.url ? '🔗' : '📎'} {att.filename}
              </a>
            );
          })}
        </div>
      )}
      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button onClick={() => fileRef.current?.click()}>Upload file</button>
        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) add.mutate({ id: taskId, file });
            e.target.value = '';
          }}
        />
        <input
          placeholder="Add a link (https://…) or a local file path (/Users/…)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addLink()}
          style={{ flex: 1, minWidth: 180 }}
        />
        <button disabled={!isValidLink(link.trim())} onClick={addLink}>
          Add link
        </button>
      </div>
      <span className="field-hint">
        With this task open, press ⌘V / Ctrl+V to attach an image from your clipboard. Or upload a
        file, or add a link (web URL or a local file path).
      </span>
    </div>
  );
}

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
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState('');

  useEffect(() => {
    if (selectedId && drawerRef.current) {
      gsap.fromTo(
        drawerRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.3, ease: 'power3.out' },
      );
    }
  }, [selectedId]);

  // Reset the details editor whenever a different task is opened.
  useEffect(() => {
    setEditingDetails(false);
  }, [selectedId]);

  if (!selectedId || !data) return null;
  const { task, comments, history, attachments } = data;
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

        <div className="section attr-grid">
          <div className="attr">
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
          <div className="attr">
            <span className="dim">Type</span>
            <span className="attr-val">{task.type}</span>
          </div>
          <div className="attr">
            <span className="dim">Agent</span>
            <select
              value={task.agentId ?? ''}
              onChange={(e) => update.mutate({ id: task.id, patch: { agentId: e.target.value || null } })}
            >
              <option value="">None</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="attr">
            <span className="dim">Model</span>
            <select
              value={task.modelId ?? ''}
              onChange={(e) => update.mutate({ id: task.id, patch: { modelId: e.target.value || null } })}
            >
              <option value="">None</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="attr">
            <span className="dim">Repo</span>
            <span className="attr-val">{task.repo ?? <span className="dim">none</span>}</span>
          </div>
          <div className="attr">
            <span className="dim">Branch</span>
            <span className="attr-val">{task.branch ?? <span className="dim">none</span>}</span>
          </div>
        </div>

        <div className="section">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Details</h3>
            {!editingDetails && (
              <button
                onClick={() => {
                  setDetailsDraft(task.details ?? '');
                  setEditingDetails(true);
                }}
              >
                Edit
              </button>
            )}
          </div>
          {editingDetails ? (
            <>
              <textarea
                rows={8}
                placeholder="Markdown supported."
                value={detailsDraft}
                onChange={(e) => setDetailsDraft(e.target.value)}
              />
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <button
                  className="primary"
                  disabled={update.isPending}
                  onClick={() => {
                    update.mutate({ id: task.id, patch: { details: detailsDraft } });
                    setEditingDetails(false);
                  }}
                >
                  Save
                </button>
                <button onClick={() => setEditingDetails(false)}>Cancel</button>
              </div>
            </>
          ) : task.details ? (
            <div className="md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.details}</ReactMarkdown>
            </div>
          ) : (
            <p className="dim">No details yet. Click Edit to add some.</p>
          )}
        </div>

        <Attachments taskId={task.id} items={attachments} />

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
              <span className="when">{new Date(h.createdAt).toLocaleString()}</span>
              {': '}
              {h.fromStatus ? STATUS_LABELS[h.fromStatus] ?? h.fromStatus : 'start'} →{' '}
              {STATUS_LABELS[h.toStatus] ?? h.toStatus} ({h.actor})
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
