import { useState } from 'react';
import DeckPicker from './DeckPicker';
import SpreadCards from './SpreadCards';
import { preferredDeck } from '../lib/decks';
import {
  CARDS,
  catalogSpreads,
  getSpread,
  primarySpreads,
} from '../lib/knowledge';
import type { Db, DrawnCard, Reading } from '../lib/types';
import { newId, nowIso } from '../lib/types';

interface Props {
  db: Db;
  updateDb: (fn: (db: Db) => Db) => void;
  onStartChat: (reading: Reading) => void;
  onResumeChat: (reading: Reading) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReadingTable({ db, updateDb, onStartChat, onResumeChat }: Props) {
  const [question, setQuestion] = useState('');
  const [spreadName, setSpreadName] = useState('Three-Card Spread');
  const [mode, setMode] = useState<'draw' | 'physical'>('draw');
  const [drawn, setDrawn] = useState<DrawnCard[]>([]);
  // physical mode: one card choice + reversed flag per position
  const [physical, setPhysical] = useState<{ cardId: string; reversed: boolean }[]>([]);

  const spread = getSpread(spreadName) ?? primarySpreads()[1];
  const deck = preferredDeck(db.preferredDeck);
  const hasQuestion = Boolean(question.trim());
  const drafts = db.readings.filter((r) => r.status === 'draft');
  const physicalCards = spread.positions.flatMap((position, index) => {
    const entry = physical[index];
    if (!entry?.cardId) return [];
    return [{
      ...entry,
      position: position.position,
      positionLabel: position.label,
      positionMeaning: position.meaning,
    }];
  });
  const previewCards = mode === 'draw' ? drawn : physicalCards;
  const duplicateCards = new Set(previewCards.map((card) => card.cardId)).size < previewCards.length;
  const canBegin = previewCards.length === spread.cards && !duplicateCards;

  function drawCards(): DrawnCard[] {
    const picked = shuffle(CARDS).slice(0, spread.cards);
    return picked.map((card, index) => ({
      cardId: card.id,
      position: spread.positions[index].position,
      positionLabel: spread.positions[index].label,
      positionMeaning: spread.positions[index].meaning,
      reversed: Math.random() < 0.2,
    }));
  }

  function resetPhysical() {
    setPhysical(
      spread.positions.map(() => ({ cardId: '', reversed: false })),
    );
  }

  function beginReading(cards: DrawnCard[]) {
    const reading: Reading = {
      id: newId(),
      spreadName: spread.name,
      question: question.trim(),
      cards,
      interpretation: '',
      createdAt: nowIso(),
      status: 'draft',
      reflections: [],
      physicalDeck: mode === 'physical',
      deckId: mode === 'draw' ? deck : undefined,
    };
    updateDb((d) => ({ ...d, readings: [reading, ...d.readings] }));
    onStartChat(reading);
  }

  return (
    <div>
      {drafts.length > 0 && (
        <div className="banner">
          <strong className="gold">Unfinished reading{drafts.length > 1 ? 's' : ''}</strong>
          <p className="small muted" style={{ margin: '0.3rem 0 0.6rem' }}>
            {drafts.length} reading{drafts.length > 1 ? 's were' : ' was'} started but not
            completed. Pick one up where you left it.
          </p>
          {drafts.map((d) => (
            <div key={d.id} className="row" style={{ marginBottom: '0.4rem' }}>
              <span>
                {d.spreadName}
                {d.question ? ` — “${d.question}”` : ''}
              </span>
              <button onClick={() => onResumeChat(d)}>Resume</button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>The reading table</h2>
        <label htmlFor="reading-question">Question or topic (optional)</label>
        <input
          id="reading-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="A question, a situation, or just a feeling…"
        />

        <label htmlFor="reading-spread">Spread</label>
        <select id="reading-spread" value={spreadName} onChange={(e) => {
          setSpreadName(e.target.value);
          setDrawn([]);
          setPhysical([]);
        }}>
          <optgroup label="Everyday spreads">
            {primarySpreads().map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} — {s.cards} card{s.cards > 1 ? 's' : ''}
              </option>
            ))}
          </optgroup>
          <optgroup label="From the books">
            {catalogSpreads().map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} — {s.cards} cards
              </option>
            ))}
          </optgroup>
        </select>
        <p className="small muted">{spread.purpose}</p>
        <p className="small">
          {spread.positions.map((p) => p.label).join(' · ')}
        </p>

        <div className="row" style={{ marginTop: '0.8rem' }}>
          <button
            className={mode === 'draw' ? 'primary' : ''}
            onClick={() => { setMode('draw'); setDrawn([]); }}
          >
            Draw in the app
          </button>
          <button
            className={mode === 'physical' ? 'primary' : ''}
            onClick={() => { setMode('physical'); resetPhysical(); }}
          >
            Use my physical deck
          </button>
        </div>

        {mode === 'draw' ? (
          <div>
            <DeckPicker
              id="reading-deck"
              value={deck}
              onChange={(preferredDeck) => updateDb((d) => ({ ...d, preferredDeck }))}
            />
            <div className="row">
              {!hasQuestion && drawn.length === 0 && (
                <button className="primary" onClick={() => beginReading(drawCards())}>
                  Draw and read
                </button>
              )}
              <button className={hasQuestion ? 'primary' : ''} onClick={() => setDrawn(drawCards())}>
                {drawn.length > 0 ? 'Draw again' : hasQuestion ? 'Draw the cards' : 'Preview the cards'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <p className="small muted">
              Lay out your own deck, then tell the reader which card landed in each position.
            </p>
            {spread.positions.map((pos, i) => (
              <div key={pos.position} className="row" style={{ marginBottom: '0.5rem' }}>
                <span style={{ minWidth: '140px' }}>{pos.label}</span>
                  <select
                  aria-label={`${pos.label} card`}
                  value={physical[i]?.cardId ?? ''}
                  onChange={(e) => {
                    const next = [...physical];
                    next[i] = { cardId: e.target.value, reversed: next[i]?.reversed ?? false };
                    setPhysical(next);
                  }}
                >
                  <option value="">Choose a card…</option>
                  {CARDS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <label style={{ display: 'inline-flex', gap: '0.3rem', margin: 0 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={physical[i]?.reversed ?? false}
                    onChange={(e) => {
                      const next = [...physical];
                      next[i] = { cardId: next[i]?.cardId ?? '', reversed: e.target.checked };
                      setPhysical(next);
                    }}
                  />
                  Reversed
                </label>
              </div>
            ))}
          </div>
        )}

        {previewCards.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <SpreadCards cards={previewCards} deck={mode === 'draw' ? deck : 'midnight'} />
            {duplicateCards && <p className="small" role="status">Choose a different card for each position.</p>}
            <div className="row" style={{ marginTop: '1rem' }}>
              <button className="primary" onClick={() => beginReading(previewCards)} disabled={!canBegin}>
                {hasQuestion ? 'Begin the reading' : 'Read the cards'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
