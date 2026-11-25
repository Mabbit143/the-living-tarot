import { useState } from 'react';
import type { Db, MemoryItem, MemoryKind } from '../lib/types';
import { newId, nowIso } from '../lib/types';

interface Props {
  db: Db;
  updateDb: (fn: (db: Db) => Db) => void;
}

const KINDS: MemoryKind[] = ['person', 'relationship', 'goal', 'concern', 'event'];

export default function LifeMemory({ db, updateDb }: Props) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<MemoryKind>('concern');
  const [timeframe, setTimeframe] = useState<'current' | 'past'>('current');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const suggested = db.memories.filter((m) => m.status === 'suggested');
  const confirmed = db.memories.filter((m) => m.status === 'confirmed');
  const hidden = db.memories.filter((m) => m.status === 'hidden');

  function setStatus(id: string, status: MemoryItem['status']) {
    updateDb((d) => ({
      ...d,
      memories: d.memories.map((m) => (m.id === id ? { ...m, status } : m)),
    }));
  }

  function remove(id: string) {
    if (!window.confirm('Remove this memory? This cannot be undone.')) return;
    updateDb((d) => ({ ...d, memories: d.memories.filter((m) => m.id !== id) }));
  }

  function add() {
    const t = text.trim();
    if (!t) return;
    const item: MemoryItem = {
      id: newId(),
      text: t,
      kind,
      timeframe,
      status: 'confirmed',
      source: 'you',
      confidence: 'high',
      createdAt: nowIso(),
    };
    updateDb((d) => ({ ...d, memories: [item, ...d.memories] }));
    setText('');
  }

  function saveEdit(id: string) {
    const t = editText.trim();
    if (!t) return;
    updateDb((d) => ({
      ...d,
      memories: d.memories.map((m) => (m.id === id ? { ...m, text: t } : m)),
    }));
    setEditingId(null);
  }

  function renderList(list: MemoryItem[], actions: (m: MemoryItem) => React.ReactNode) {
    if (list.length === 0) return <p className="muted small">None.</p>;
    return (
      <ul>
        {list.map((m) => (
          <li key={m.id} style={{ marginBottom: '0.7rem' }}>
            {editingId === m.id ? (
              <span className="chat-input-row">
                <input value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Edit memory" />
                <button onClick={() => saveEdit(m.id)}>Save</button>
                <button className="ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </span>
            ) : (
              <>
                {m.text}{' '}
                <span className="muted small">
                  ({m.kind} · {m.timeframe} · {m.source} · {m.confidence} confidence)
                </span>
                <span className="row" style={{ marginTop: '0.2rem' }}>
                  {actions(m)}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="memory-layout">
      <div className="card memory-compose">
        <h2>Life Memory</h2>
        <p className="muted">
          The people, relationships, goals, concerns, and events the reader knows about.
          Anything the reader suggests stays <strong>unconfirmed</strong> until you say
          otherwise — nothing becomes a lasting fact without your say-so.
        </p>

        {suggested.length > 0 && (
          <section aria-labelledby="memory-review-heading">
            <h3 id="memory-review-heading">Memory suggestions to review</h3>
            <p className="muted small">
              Lines marked <em>cards suggested</em> came from the cards, not
              from anything you reported — everything else here is in your own
              words. Hide tucks a suggestion away (find it under Hidden);
              Dismiss removes it for good.
            </p>
            {renderList(suggested, (m) => (
              <>
                <button className="primary" onClick={() => setStatus(m.id, 'confirmed')}>Save memory</button>
                <button
                  onClick={() => {
                    setEditingId(m.id);
                    setEditText(m.text);
                  }}
                >
                  Edit
                </button>
                <button onClick={() => setStatus(m.id, 'hidden')}>Hide</button>
                <button className="ghost" onClick={() => remove(m.id)}>
                  Dismiss
                </button>
              </>
            ))}
          </section>
        )}

        <label htmlFor="life-memory-text">Add a memory</label>
        <div className="chat-input-row">
          <input
            id="life-memory-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
            placeholder="Something the reader should remember…"
          />
          <button className="primary" onClick={add}>
            Add
          </button>
        </div>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <select value={kind} onChange={(e) => setKind(e.target.value as MemoryKind)} style={{ width: 'auto' }} aria-label="Memory kind">
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as typeof timeframe)} style={{ width: 'auto' }} aria-label="Memory timeframe">
            <option value="current">Happening now</option>
            <option value="past">In the past</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h3>Confirmed</h3>
        {renderList(confirmed, (m) => (
          <>
            <button
              onClick={() => {
                setEditingId(m.id);
                setEditText(m.text);
              }}
            >
              Edit
            </button>
            <button onClick={() => setStatus(m.id, 'hidden')}>Hide</button>
            <button className="ghost" onClick={() => remove(m.id)}>
              Delete
            </button>
          </>
        ))}
      </div>

      {hidden.length > 0 && (
        <div className="card">
          <h3>Hidden</h3>
          {renderList(hidden, (m) => (
            <>
              <button onClick={() => setStatus(m.id, 'confirmed')}>Restore</button>
              <button className="ghost" onClick={() => remove(m.id)}>
                Delete
              </button>
            </>
          ))}
        </div>
      )}
    </div>
  );
}
