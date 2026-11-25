import DeckPicker from './DeckPicker';
import GeminiSettings from './GeminiSettings';
import SpreadCards from './SpreadCards';
import { preferredDeck } from '../lib/decks';
import {
  CARDS,
  catalogSpreads,
  getCard,
  getSpread,
  primarySpreads,
} from '../lib/knowledge';
import type { CardSelection, Db, DrawnCard, Reading, ReadingSetup } from '../lib/types';
import { newId, nowIso } from '../lib/types';

interface Props {
  db: Db;
  updateDb: (fn: (db: Db) => Db) => void;
  onStartChat: (reading: Reading) => void;
  onResumeChat: (reading: Reading) => void;
}

const EMPTY_SETUP: ReadingSetup = {
  question: '',
  spreadName: 'Three-Card Spread',
  mode: 'draw',
  drawn: [],
  physical: {},
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReadingTable({ db, updateDb, onStartChat, onResumeChat }: Props) {
  const { question, spreadName, mode, drawn, physical } = db.readingSetup ?? EMPTY_SETUP;
  const spread = getSpread(spreadName) ?? primarySpreads()[1];
  const deck = preferredDeck(db.preferredDeck);
  const allowReversals = db.allowReversals ?? true;
  const hasQuestion = Boolean(question.trim());
  const drafts = db.readings.filter((r) => r.status === 'draft');
  const hasCardSetup = drawn.length > 0 || Object.keys(physical).length > 0;
  const hasSetup = hasCardSetup || question.length > 0 || mode !== EMPTY_SETUP.mode || spread.name !== EMPTY_SETUP.spreadName;
  const previewCards = cardsFor(mode === 'draw' ? drawn : physical);
  const duplicateCards = new Set(previewCards.map((card) => card.cardId)).size < previewCards.length;
  const canBegin = previewCards.length === spread.cards && !duplicateCards;

  function changeSetup(changes: Partial<ReadingSetup>) {
    updateDb((d) => ({ ...d, readingSetup: { ...(d.readingSetup ?? EMPTY_SETUP), ...changes } }));
  }

  function cardsFor(selections: Readonly<Partial<Record<number, CardSelection>>>): DrawnCard[] {
    return spread.positions.flatMap((position, index) => {
      const card = selections[index];
      if (!card || !getCard(card.cardId)) return [];
      return [{
        cardId: card.cardId,
        reversed: card.reversed && (mode === 'physical' || allowReversals),
        position: position.position,
        positionLabel: position.label,
        positionMeaning: position.meaning,
      }];
    });
  }

  function drawCards(): CardSelection[] {
    return shuffle(CARDS).slice(0, spread.cards).map((card) => ({
      cardId: card.id,
      reversed: allowReversals && Math.random() < 0.2,
    }));
  }

  function changeSpread(next: string) {
    if (next === spread.name) return;
    if (hasCardSetup && !window.confirm('Change the spread and clear its cards? Your question will be kept.')) return;
    changeSetup({ spreadName: next, drawn: [], physical: {} });
  }

  function clearSetup() {
    if (!window.confirm('Clear this setup, including the question and any cards?')) return;
    updateDb((d) => ({ ...d, readingSetup: undefined }));
  }

  function beginReading(firstStep: NonNullable<Reading['firstStep']>) {
    const cards = mode === 'draw' && drawn.length === 0 ? cardsFor(drawCards()) : previewCards;
    if (cards.length !== spread.cards || duplicateCards) return;

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
      firstStep,
    };
    updateDb((d) => ({ ...d, readings: [reading, ...d.readings], readingSetup: undefined }));
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
              <span style={{ overflowWrap: 'anywhere' }}>
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
        <label htmlFor="reading-spread">Spread</label>
        <select id="reading-spread" value={spread.name} onChange={(e) => changeSpread(e.target.value)}>
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
        {spread.cards > 3 ? (
          <details className="reading-disclosure small">
            <summary>Spread positions</summary>
            <ol>{spread.positions.map((position) => <li key={position.position}>{position.label}</li>)}</ol>
          </details>
        ) : <p className="small">{spread.positions.map((p) => p.label).join(' · ')}</p>}

        <label htmlFor="reading-question">Question or topic (optional)</label>
        <input
          id="reading-question"
          value={question}
          onChange={(e) => changeSetup({ question: e.target.value })}
          placeholder="A question, a situation, or just a feeling…"
        />

        <label className="row reading-source">
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={mode === 'physical'}
            onChange={(e) => changeSetup({ mode: e.target.checked ? 'physical' : 'draw' })}
          />
          Use my physical deck
        </label>

        <details className="reading-disclosure reading-options">
          <summary>Reading options{db.useGeminiReader && <span className="small muted"> · Gemini on</span>}</summary>
          {mode === 'draw' && <>
            <DeckPicker
              id="reading-deck"
              value={deck}
              onChange={(preferredDeck) => updateDb((d) => ({ ...d, preferredDeck }))}
            />
            <label className="row" style={{ margin: '0 0 0.75rem' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={allowReversals}
                onChange={(e) => {
                  const allowReversals = e.target.checked;
                  updateDb((d) => ({ ...d, allowReversals }));
                }}
              />
              Allow reversals
            </label>
          </>}
          <GeminiSettings db={db} updateDb={updateDb} />
          {hasSetup && <button className="ghost reading-reset" onClick={clearSetup}>Clear setup</button>}
        </details>

        {mode === 'physical' && (
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
                    changeSetup({ physical: { ...physical, [i]: { cardId: e.target.value, reversed: physical[i]?.reversed ?? false } } });
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
                      changeSetup({ physical: { ...physical, [i]: { cardId: physical[i]?.cardId ?? '', reversed: e.target.checked } } });
                    }}
                  />
                  Reversed
                </label>
              </div>
            ))}
          </div>
        )}

        {duplicateCards && <p className="small" role="status">Choose a different card for each position.</p>}
        <div className="row reading-actions">
          <button className="primary" onClick={() => beginReading('read')} disabled={mode === 'physical' && !canBegin}>
            {mode === 'draw' && drawn.length === 0 ? 'Draw and read' : 'Read the cards'}
          </button>
          {mode === 'draw' && (
            <button className="ghost" onClick={() => changeSetup({ drawn: drawCards() })}>
              {drawn.length > 0 ? 'Draw again' : 'Preview the cards'}
            </button>
          )}
          {hasQuestion && (
            <button className="ghost" onClick={() => beginReading('talk')} disabled={mode === 'physical' && !canBegin}>
              Talk first
            </button>
          )}
        </div>
        {previewCards.length > 0 && (
          <SpreadCards cards={previewCards} deck={mode === 'draw' ? deck : 'midnight'} />
        )}
      </div>
    </div>
  );
}
