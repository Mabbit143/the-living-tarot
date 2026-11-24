import { useState } from 'react';
import { getCard } from '../lib/knowledge';
import type { Db } from '../lib/types';
import { nowIso } from '../lib/types';

interface Props {
  db: Db;
  updateDb: (fn: (db: Db) => Db) => void;
}

export default function Archive({ db, updateDb }: Props) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reflection, setReflection] = useState('');

  const filtered = db.readings.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.question.toLowerCase().includes(q) ||
      r.spreadName.toLowerCase().includes(q) ||
      r.cards.some((c) => (getCard(c.cardId)?.name ?? '').toLowerCase().includes(q))
    );
  });

  function addReflection() {
    const text = reflection.trim();
    if (!text || !selectedId) return;
    setReflection('');
    updateDb((d) => ({
      ...d,
      readings: d.readings.map((r) =>
        r.id === selectedId
          ? { ...r, reflections: [...r.reflections, { text, at: nowIso() }] }
          : r,
      ),
    }));
  }

  return (
    <div>
      <div className="card">
        <h2>Reading Archive</h2>
        <p className="muted">
          Every reading, searchable. Reflections are added alongside the original
          interpretation — the original is never rewritten.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by question, spread, or card…"
        />
      </div>

      {filtered.length === 0 && <p className="muted">No readings yet. The table is waiting.</p>}

      {filtered.map((r) => (
        <div key={r.id} className="card">
          <div className="row space-between">
            <h3 style={{ margin: 0 }}>
              {r.spreadName}{' '}
              <span className="muted small">
                {new Date(r.createdAt).toLocaleString()}
                {r.status === 'draft' ? ' · unfinished' : ''}
              </span>
            </h3>
            <div className="row">
              <button onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}>
                {selectedId === r.id ? 'Close' : 'Open'}
              </button>
              <button
                className="ghost"
                onClick={() =>
                  updateDb((d) => ({ ...d, readings: d.readings.filter((x) => x.id !== r.id) }))
                }
              >
                Delete
              </button>
            </div>
          </div>
          {r.question && (
            <p>
              <em>“{r.question}”</em>
            </p>
          )}
          <p className="small">
            {r.cards.map((c) => getCard(c.cardId)?.name).join(' · ')}
          </p>

          {selectedId === r.id && (
            <>
              {r.interpretation && (
                <div style={{ whiteSpace: 'pre-wrap' }}>{r.interpretation}</div>
              )}
              <hr />
              <h4 className="serif">Reading Revisited — reflections</h4>
              {r.reflections.length === 0 && (
                <p className="muted small">
                  Nothing recorded yet. Come back after some time has passed and note what
                  actually happened.
                </p>
              )}
              <ul>
                {r.reflections.map((ref, i) => (
                  <li key={i}>
                    {ref.text}{' '}
                    <span className="muted small">{new Date(ref.at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
              <div className="chat-input-row">
                <input
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addReflection();
                  }}
                  placeholder="What actually happened since this reading?"
                />
                <button onClick={addReflection}>Add reflection</button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
