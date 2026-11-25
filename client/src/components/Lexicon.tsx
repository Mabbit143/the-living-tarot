import { useEffect, useRef, useState } from 'react';
import CardFace from './CardFace';
import { preferredDeck } from '../lib/decks';
import { CARDS, arcanaLabel, getCard } from '../lib/knowledge';
import type { Db, Signifier } from '../lib/types';
import { nowIso } from '../lib/types';

interface Props {
  db: Db;
  updateDb: (fn: (db: Db) => Db) => void;
}

const SIGNIFIER_KINDS: { value: Signifier['kind']; label: string }[] = [
  { value: 'self', label: 'Me' },
  { value: 'other', label: 'Someone else' },
  { value: 'relationship', label: 'A relationship' },
  { value: 'period', label: 'A life period' },
  { value: 'situation', label: 'A situation' },
];

export default function Lexicon({ db, updateDb }: Props) {
  const [query, setQuery] = useState('');
  const [arcana, setArcana] = useState<'all' | 'major' | 'minor'>('all');
  const [suit, setSuit] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assocText, setAssocText] = useState('');
  const [sigKind, setSigKind] = useState<Signifier['kind']>('self');
  const [sigLabel, setSigLabel] = useState('');
  const [sigTemp, setSigTemp] = useState(false);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const activeTile = useRef<HTMLButtonElement | null>(null);

  const deck = preferredDeck(db.preferredDeck);
  const filtered = CARDS.filter((c) => {
    if (arcana !== 'all' && c.arcana !== arcana) return false;
    if (suit !== 'all' && c.suit !== suit) return false;
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const selected = selectedId ? getCard(selectedId) : undefined;
  const entry = selectedId ? db.lexicon[selectedId] : undefined;
  const appearances = selectedId
    ? db.readings.reduce((n, r) => n + r.cards.filter((c) => c.cardId === selectedId).length, 0)
    : 0;

  useEffect(() => {
    const dialog = detailDialog.current;
    if (!selectedId || !dialog || dialog.open) return;
    dialog.showModal();
    detailHeading.current?.focus();
  }, [selectedId]);

  function upsert(cardId: string, patch: Partial<NonNullable<typeof entry>>) {
    updateDb((d) => {
      const prev = d.lexicon[cardId] ?? { cardId, personalAssociations: [] };
      return { ...d, lexicon: { ...d.lexicon, [cardId]: { ...prev, ...patch } } };
    });
  }

  function addAssociation() {
    const text = assocText.trim();
    if (!text || !selectedId) return;
    setAssocText('');
    updateDb((d) => {
      const prev = d.lexicon[selectedId] ?? { cardId: selectedId, personalAssociations: [] };
      return {
        ...d,
        lexicon: {
          ...d.lexicon,
          [selectedId]: {
            ...prev,
            personalAssociations: [...prev.personalAssociations, { text, at: nowIso() }],
          },
        },
      };
    });
  }

  return (
    <div>
      <div className="card">
        <h2>Your Personal Tarot Lexicon</h2>
        <p className="muted">
          Every card carries its synthesized meaning from your books, plus your own history
          with it. Your associations sit on top of the synthesis — they are never overwritten
          by it.
        </p>
        <div className="row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards…"
            aria-label="Search cards"
            style={{ flex: 1 }}
          />
          <select value={arcana} onChange={(e) => setArcana(e.target.value as typeof arcana)} style={{ width: 'auto' }} aria-label="Filter by arcana">
            <option value="all">All arcana</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
          <select value={suit} onChange={(e) => setSuit(e.target.value)} style={{ width: 'auto' }} aria-label="Filter by suit">
            <option value="all">All suits</option>
            <option value="wands">Wands</option>
            <option value="cups">Cups</option>
            <option value="swords">Swords</option>
            <option value="pentacles">Pentacles</option>
          </select>
        </div>
      </div>

      <div className="card-grid">
        {filtered.map((c) => (
          <button
            key={c.id}
            className="tarot-card"
            aria-haspopup="dialog"
            onClick={(e) => {
              activeTile.current = e.currentTarget;
              setSelectedId(c.id);
            }}
          >
            <CardFace cardId={c.id} deck={deck} />
            <span className="position">
              {db.lexicon[c.id]?.personalMeaning ? '✎ yours' : ''}{' '}
              {db.lexicon[c.id]?.signifier ? `◆ ${db.lexicon[c.id]?.signifier?.label}` : ''}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <dialog
          className="card lexicon-dialog"
          ref={detailDialog}
          aria-labelledby="lexicon-detail-title"
          onClose={() => {
            setSelectedId(null);
            setAssocText('');
            setSigLabel('');
            setSigKind('self');
            setSigTemp(false);
            activeTile.current?.focus({ preventScroll: true });
          }}
        >
          <div className="row space-between">
            <h3 id="lexicon-detail-title" ref={detailHeading} tabIndex={-1}>
              {selected.name} <span className="muted small">— {arcanaLabel(selected, deck)}</span>
            </h3>
            <button type="button" onClick={() => detailDialog.current?.close()}>Close</button>
          </div>
          <p className="small muted">
            Appeared in {appearances} of your reading{appearances === 1 ? '' : 's'}.
          </p>

          <h4 className="serif">Synthesized meaning — upright</h4>
          <p>{selected.upright}</p>
          <h4 className="serif">Synthesized meaning — reversed</h4>
          <p>{selected.reversed}</p>
          <p className="small muted">
            Reversal synthesis rests on fewer sources than the upright layer (see the
            synthesis notes) — read reversed meanings as the thinner layer they are.
          </p>

          <p>
            {selected.sources.map((s) => (
              <span key={s} className="chip gold">
                {s}
              </span>
            ))}
          </p>
          {selected.notes && (
            <p className="small">
              <strong className="gold">Where the books disagree: </strong>
              {selected.notes}
            </p>
          )}

          <hr />
          <h4 className="serif">Your meaning</h4>
          {entry?.personalMeaning ? (
            <p>
              “{entry.personalMeaning}”{' '}
              <button
                className="ghost small"
                onClick={() => selectedId && upsert(selectedId, { personalMeaning: undefined })}
              >
                Clear
              </button>
            </p>
          ) : (
            <p className="muted small">No personal meaning yet — give one in a reading, or add an association below.</p>
          )}

          <label htmlFor="lexicon-association">Your associations (earlier → recent)</label>
          {entry?.personalAssociations.length ? (
            <ul>
              {entry.personalAssociations.map((a, i) => (
                <li key={i}>
                  “{a.text}”{' '}
                  <span className="muted small">{new Date(a.at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">None yet.</p>
          )}
          <div className="chat-input-row">
            <input
              id="lexicon-association"
              value={assocText}
              onChange={(e) => setAssocText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addAssociation();
              }}
              placeholder="Add an association…"
            />
            <button onClick={addAssociation}>Add</button>
          </div>

          <hr />
          <h4 className="serif">Signifier</h4>
          {entry?.signifier ? (
            <p>
              This card stands for <strong>{entry.signifier.label}</strong> (
              {SIGNIFIER_KINDS.find((k) => k.value === entry.signifier?.kind)?.label},{' '}
              {entry.signifier.temporary ? 'temporary' : 'permanent'}){' '}
              <button
                className="ghost small"
                onClick={() => selectedId && upsert(selectedId, { signifier: undefined })}
              >
                Remove
              </button>
            </p>
          ) : (
            <p className="muted small">Not a signifier yet.</p>
          )}
          <div className="row">
            <select value={sigKind} onChange={(e) => setSigKind(e.target.value as Signifier['kind'])} style={{ width: 'auto' }} aria-label="Signifier kind">
              {SIGNIFIER_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <input
              value={sigLabel}
              onChange={(e) => setSigLabel(e.target.value)}
              placeholder="Who or what does this card stand for?"
              aria-label="Who or what does this card stand for?"
              style={{ flex: 1 }}
            />
            <label style={{ display: 'inline-flex', gap: '0.3rem', margin: 0 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={sigTemp}
                onChange={(e) => setSigTemp(e.target.checked)}
              />
              Temporary
            </label>
            <button
              onClick={() => {
                if (!sigLabel.trim() || !selectedId) return;
                upsert(selectedId, {
                  signifier: { kind: sigKind, label: sigLabel.trim(), temporary: sigTemp },
                });
                setSigLabel('');
              }}
            >
              Set signifier
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
