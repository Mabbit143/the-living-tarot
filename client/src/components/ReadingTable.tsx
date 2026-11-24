import { useState } from 'react';
import {
  CARDS,
  catalogSpreads,
  getCard,
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
  const drafts = db.readings.filter((r) => r.status === 'draft');

  function drawCards() {
    const picked = shuffle(CARDS).slice(0, spread.cards);
    setDrawn(
      picked.map((c, i) => ({
        cardId: c.id,
        position: spread.positions[i].position,
        positionLabel: spread.positions[i].label,
        positionMeaning: spread.positions[i].meaning,
        reversed: Math.random() < 0.2,
      })),
    );
  }

  function resetPhysical() {
    setPhysical(
      spread.positions.map(() => ({ cardId: '', reversed: false })),
    );
  }

  function beginReading() {
    let cards: DrawnCard[];
    if (mode === 'draw') {
      if (drawn.length !== spread.cards) return;
      cards = drawn;
    } else {
      if (physical.length !== spread.cards || physical.some((p) => !p.cardId)) return;
      const used = new Set<string>();
      for (const p of physical) {
        if (used.has(p.cardId)) return; // no duplicate cards from one physical deck
        used.add(p.cardId);
      }
      cards = physical.map((p, i) => ({
        cardId: p.cardId,
        position: spread.positions[i].position,
        positionLabel: spread.positions[i].label,
        positionMeaning: spread.positions[i].meaning,
        reversed: p.reversed,
      }));
    }
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
    };
    updateDb((d) => ({ ...d, readings: [reading, ...d.readings] }));
    onStartChat(reading);
  }

  const canBegin =
    mode === 'draw'
      ? drawn.length === spread.cards
      : physical.length === spread.cards && physical.every((p) => p.cardId);

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
        <label>What is on your mind?</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="A question, a situation, or just a feeling…"
        />

        <label>Spread</label>
        <select value={spreadName} onChange={(e) => { setSpreadName(e.target.value); setDrawn([]); resetPhysical(); }}>
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
          <div style={{ marginTop: '1rem' }}>
            <button className="primary" onClick={drawCards}>
              {drawn.length > 0 ? 'Draw again' : 'Draw the cards'}
            </button>
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
                  value={physical[i]?.cardId ?? ''}
                  onChange={(e) => {
                    const next = [...physical];
                    next[i] = { ...next[i], cardId: e.target.value };
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
                      next[i] = { ...next[i], reversed: e.target.checked };
                      setPhysical(next);
                    }}
                  />
                  Reversed
                </label>
              </div>
            ))}
          </div>
        )}

        {(drawn.length > 0 || (mode === 'physical' && physical.some((p) => p.cardId))) && (
          <div style={{ marginTop: '1rem' }}>
            <div className="card-grid">
              {(mode === 'draw' ? drawn : physical.map((p, i) => ({
                cardId: p.cardId,
                position: spread.positions[i].position,
                positionLabel: spread.positions[i].label,
                positionMeaning: spread.positions[i].meaning,
                reversed: p.reversed,
              })) as DrawnCard[])
                .filter((d) => d.cardId)
                .map((d) => {
                  const card = getCard(d.cardId);
                  return (
                    <div key={d.position} className={`tarot-card${d.reversed ? ' reversed' : ''}`}>
                      <span className="position">{d.positionLabel}</span>
                      <span className="numeral">{card?.arcana === 'major' ? '✦' : '✧'}</span>
                      <span className="name">{card?.name ?? d.cardId}</span>
                    </div>
                  );
                })}
            </div>
            <div className="row" style={{ marginTop: '1rem' }}>
              <button className="primary" onClick={beginReading} disabled={!canBegin}>
                Begin the reading
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
