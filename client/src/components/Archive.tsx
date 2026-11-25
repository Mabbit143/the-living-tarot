import { useState } from 'react';
import ReadingInterpretation from './ReadingInterpretation';
import SpreadCards from './SpreadCards';
import { DECKS, readingDeck } from '../lib/decks';
import { getCard } from '../lib/knowledge';
import {
  downloadJsonBackup,
  downloadTextHistory,
  hasLexiconContent,
} from '../lib/export';
import type { Db } from '../lib/types';
import { nowIso } from '../lib/types';

interface Props {
  db: Db;
  updateDb: (fn: (db: Db) => Db) => void;
}

export default function Archive({ db, updateDb }: Props) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Unsaved reflection text, keyed by reading id so a draft started in one
  // entry can never leak into — or save under — another entry.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = selectedId ? (drafts[selectedId] ?? '') : '';

  function setDraft(id: string, text: string) {
    setDrafts((d) => ({ ...d, [id]: text }));
  }
  const search = query.trim().toLowerCase();

  const filtered = db.readings.filter((r) => {
    if (!search) return true;
    return (
      r.question.toLowerCase().includes(search) ||
      r.spreadName.toLowerCase().includes(search) ||
      r.cards.some((c) => (getCard(c.cardId)?.name ?? '').toLowerCase().includes(search))
    );
  });

  function addReflection() {
    if (!selectedId) return;
    const text = (drafts[selectedId] ?? '').trim();
    if (!text) return;
    const targetId = selectedId;
    setDrafts((d) => {
      const next = { ...d };
      delete next[targetId];
      return next;
    });
    updateDb((d) => ({
      ...d,
      readings: d.readings.map((r) =>
        r.id === targetId
          ? { ...r, reflections: [...r.reflections, { text, at: nowIso() }] }
          : r,
      ),
    }));
  }

  const lexiconCount = Object.values(db.lexicon).filter(hasLexiconContent).length;
  const pendingMemories = db.memories.filter((memory) => memory.status === 'suggested').length;
  const savedMemories = db.memories.length - pendingMemories;

  function deleteReading(id: string) {
    if (!window.confirm('Delete this reading, its conversation, and its reflections? This cannot be undone.')) return;
    if (selectedId === id) {
      setSelectedId(null);
    }
    setDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
    updateDb((d) => ({
      ...d,
      readings: d.readings.filter((reading) => reading.id !== id),
      chat: d.chat.filter((message) => message.readingId !== id),
    }));
  }

  return (
    <div className="archive-layout">
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
          aria-label="Search by question, spread, or card"
        />
      </div>

      {filtered.length === 0 && (db.readings.length ? (
        <div className="row">
          <p className="muted" role="status">No readings match your search.</p>
          <button className="ghost" onClick={() => setQuery('')}>Clear search</button>
        </div>
      ) : <p className="muted">No readings yet. The table is waiting.</p>)}

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
              <button
                onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                aria-label={selectedId === r.id
                  ? `Close ${r.spreadName} reading`
                  : `Open ${r.spreadName} reading from ${new Date(r.createdAt).toLocaleString()}`}
              >
                {selectedId === r.id ? 'Close' : 'Open'}
              </button>
              <button
                className="ghost"
                onClick={() => deleteReading(r.id)}
              >
                Delete
              </button>
            </div>
          </div>
          {r.question && (
            <p style={{ overflowWrap: 'anywhere' }}>
              <em>“{r.question}”</em>
            </p>
          )}
          {selectedId !== r.id && (
            <p className="small">
              {r.cards.map((c) => getCard(c.cardId)?.name).join(' · ')}
            </p>
          )}

          {selectedId === r.id && (
            <>
              {r.deckId && <p className="small muted">{DECKS[readingDeck(r)]}</p>}
              <SpreadCards cards={r.cards} deck={readingDeck(r)} />
              {r.interpretation && <ReadingInterpretation reading={r} />}
              {r.personalizedGuidance && (
                <section className="personalized-guidance">
                  <h4 className="serif">Personalized guidance</h4>
                  <p className="reading-copy">{r.personalizedGuidance}</p>
                </section>
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
              <p className="small muted">
                Saving to this {r.spreadName} reading — drafts stay with the reading
                they were typed in.
              </p>
              <div className="chat-input-row">
                <input
                  aria-label={`What actually happened since this ${r.spreadName} reading?`}
                  value={draft}
                  onChange={(e) => setDraft(r.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addReflection();
                  }}
                  placeholder="What actually happened since this reading?"
                />
                <button
                  onClick={addReflection}
                  aria-label={`Add reflection to this ${r.spreadName} reading`}
                >
                  Add reflection
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="card">
        <h2>Take your history with you</h2>
        <p className="muted">
          Your whole history — every reading with its cards, interpretation,
          conversation, and reflections, your personal Lexicon meanings and
          signifiers, your Life Memories, and your Symbol Journal. Both files
          are made on this device from what is saved here; nothing is sent
          anywhere.
        </p>
        <p className="small">
          {db.readings.length} {db.readings.length === 1 ? 'reading' : 'readings'} ·{' '}
          {lexiconCount} {lexiconCount === 1 ? 'Lexicon entry' : 'Lexicon entries'} ·{' '}
          {savedMemories} {savedMemories === 1 ? 'saved memory' : 'saved memories'} ·{' '}
          {pendingMemories > 0 && <>{pendingMemories} to review · </>}
          {db.journal.length} {db.journal.length === 1 ? 'journal entry' : 'journal entries'}
        </p>
        <div className="row">
          <button className="primary" onClick={() => downloadJsonBackup(db)}>
            Download JSON backup
          </button>
          <button onClick={() => downloadTextHistory(db)}>
            Download plain-text copy
          </button>
        </div>
      </div>
    </div>
  );
}
