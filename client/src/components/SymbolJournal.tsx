import { useState } from 'react';
import { CARDS, getCard } from '../lib/knowledge';
import type { Db } from '../lib/types';
import { newId, nowIso } from '../lib/types';

interface Props {
  db: Db;
  updateDb: (fn: (db: Db) => Db) => void;
}

export default function SymbolJournal({ db, updateDb }: Props) {
  const [text, setText] = useState('');
  const [cardId, setCardId] = useState('');

  function add() {
    const t = text.trim();
    if (!t) return;
    const entry = {
      id: newId(),
      text: t,
      cardIds: cardId ? [cardId] : [],
      at: nowIso(),
    };
    updateDb((d) => ({ ...d, journal: [entry, ...d.journal] }));
    setText('');
    setCardId('');
  }

  return (
    <div>
      <div className="card">
        <h2>Symbol Journal</h2>
        <p className="muted">
          A running notebook for symbols, images, and associations — yours, not the book's.
          What keeps catching your eye?
        </p>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="A symbol, an image, a line that stayed with you…"
        />
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <select value={cardId} onChange={(e) => setCardId(e.target.value)} style={{ flex: 1 }}>
            <option value="">No card attached</option>
            {CARDS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="primary" onClick={add}>
            Add entry
          </button>
        </div>
      </div>

      {db.journal.length === 0 && <p className="muted">No entries yet.</p>}
      {db.journal.map((j) => (
        <div key={j.id} className="card">
          <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 0.4rem' }}>{j.text}</p>
          <p className="small muted" style={{ margin: 0 }}>
            {new Date(j.at).toLocaleString()}
            {j.cardIds.map((id) => ` · ${getCard(id)?.name ?? id}`).join('')}
          </p>
          <button
            className="ghost small"
            onClick={() =>
              updateDb((d) => ({ ...d, journal: d.journal.filter((x) => x.id !== j.id) }))
            }
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
