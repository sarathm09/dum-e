import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import type { Priority, TaskType } from '../types';
import { useCreateTask } from '../hooks/queries';
import { api } from '../api';

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const TYPES: TaskType[] = ['bug', 'feature', 'documentation', 'chore'];

/** A link is valid if it is a web URL or an absolute local filesystem path. */
function isValidLink(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('/') || url.startsWith('~') || url.startsWith('file://');
}

type Pending =
  | { kind: 'file'; file: File; label: string }
  | { kind: 'link'; url: string; label: string };

export function NewTaskModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const create = useCreateTask();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [link, setLink] = useState('');

  // Buffer attachments locally; they are uploaded once the task is created and
  // has an id. Paste attaches clipboard images while the modal is open.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      for (const it of Array.from(e.clipboardData?.items ?? [])) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            setPending((p) => [...p, { kind: 'file', file, label: file.name || 'pasted image' }]);
            return;
          }
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  const addLink = () => {
    const url = link.trim();
    if (!isValidLink(url)) return;
    setPending((p) => [...p, { kind: 'link', url, label: url }]);
    setLink('');
  };

  const form = useForm({
    defaultValues: {
      title: '',
      details: '',
      priority: 'medium' as Priority,
      type: 'feature' as TaskType,
    },
    onSubmit: async ({ value }) => {
      if (!value.title.trim()) return;
      const task = await create.mutateAsync({
        projectId,
        title: value.title.trim(),
        details: value.details,
        priority: value.priority,
        type: value.type,
      });
      // Upload buffered attachments now that the task has an id.
      for (const item of pending) {
        if (item.kind === 'file') await api.addAttachmentFile(task.id, item.file);
        else await api.addAttachmentLink(task.id, { url: item.url });
      }
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
                  placeholder="Markdown supported. You can edit this later too."
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

          <div className="field">
            <span className="field-label">Attachments</span>
            {pending.length > 0 && (
              <div className="attachments" style={{ marginBottom: 8 }}>
                {pending.map((item, i) => (
                  <span key={i} className="attach-chip">
                    {item.kind === 'link' ? '🔗' : '📎'} {item.label}
                    <button
                      type="button"
                      className="chip-x"
                      title="Remove"
                      onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => fileRef.current?.click()}>
                Upload file
              </button>
              <input
                ref={fileRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPending((p) => [...p, { kind: 'file', file, label: file.name }]);
                  e.target.value = '';
                }}
              />
              <input
                placeholder="Add a link (https://…) or a local file path (/Users/…)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLink();
                  }
                }}
                style={{ flex: 1, minWidth: 180 }}
              />
              <button type="button" disabled={!isValidLink(link.trim())} onClick={addLink}>
                Add link
              </button>
            </div>
            <span className="field-hint">Paste an image (⌘V / Ctrl+V), upload a file, or add a link.</span>
          </div>

          <form.Subscribe selector={(s) => s.values.title}>
            {(title) => (
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button type="button" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={create.isPending || !title.trim()}>
                  {create.isPending ? 'Creating…' : 'Create task'}
                </button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}
