import { useLayoutEffect, useRef, useState } from 'react';
import { CARDS, getCard } from '../lib/knowledge';
import type { SpreadPosition } from '../lib/knowledge';
import type { CardSelection, ReadingSetup } from '../lib/types';

interface Props {
  positions: SpreadPosition[];
  selections: ReadingSetup['physical'];
  onChange: (index: number, selection: CardSelection) => void;
}

function searchable(text: string): string {
  return text.normalize('NFKD').replace(/\p{Mark}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const catalog = CARDS.map(({ id, name }) => ({ id, name, searchName: searchable(name) }));

export default function PhysicalDeckEntry({ positions, selections, onChange }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLUListElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  const entries = positions.map((position, index) => ({ position, card: getCard(selections[index]?.cardId ?? '') }));
  const filled = entries.filter(({ card }) => card).length;
  const active = activeIndex === null ? undefined : entries[activeIndex];
  const words = searchable(query).split(/\s+/).filter(Boolean);
  const matches = catalog.filter(({ searchName }) => words.every((word) => searchName.includes(word)));

  function otherPositions(cardId: string, index: number): string[] {
    return entries.flatMap(({ position, card }, otherIndex) => (
      otherIndex !== index && card?.id === cardId ? [position.label] : []
    ));
  }

  useLayoutEffect(() => {
    if (activeIndex === null || !dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    searchBox.current?.focus();
  }, [activeIndex]);

  useLayoutEffect(() => {
    results.current?.scrollTo(0, 0);
  }, [query]);

  function choose(cardId: string) {
    if (activeIndex === null) return;
    onChange(activeIndex, { cardId, reversed: Boolean(cardId && selections[activeIndex]?.reversed) });
    dialog.current?.close();
  }

  return (
    <section className="physical-entry" aria-labelledby="physical-entry-heading">
      <div className="row space-between">
        <h3 id="physical-entry-heading">Enter your cards</h3>
        <p className="small muted" role="status">{filled} of {positions.length} positions filled</p>
      </div>
      <ol className="physical-positions">
        {entries.map(({ position, card }, index) => {
          const id = `physical-${position.position}`;
          const duplicates = card ? otherPositions(card.id, index) : [];
          return (
            <li key={position.position} className="physical-position">
              <span id={`${id}-position`} className="physical-position-name">{position.label}</span>
              <div className="physical-position-controls">
                <button className="physical-card-choice" type="button" aria-haspopup="dialog"
                  aria-labelledby={`${id}-card ${id}-position`}
                  aria-describedby={duplicates.length ? `${id}-duplicate` : undefined}
                  onClick={(event) => {
                    opener.current = event.currentTarget;
                    setQuery('');
                    setActiveIndex(index);
                  }}>
                  <span id={`${id}-card`}>{card?.name ?? 'Choose a card'}</span>
                </button>
                {card && (
                  <label className="physical-orientation">
                    <input type="checkbox" aria-label={`Reversed in ${position.label}`}
                      checked={selections[index]?.reversed ?? false}
                      onChange={(event) => onChange(index, { cardId: card.id, reversed: event.target.checked })} />
                    Reversed
                  </label>
                )}
                {duplicates.length > 0 && (
                  <p className="small physical-duplicate" id={`${id}-duplicate`}>
                    {card?.name} is also in {duplicates.join(', ')}.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <dialog className="card-picker" ref={dialog} aria-labelledby="card-picker-heading" onClose={() => {
        setActiveIndex(null);
        opener.current?.focus();
      }}>
        {active && activeIndex !== null && (
          <>
            <div className="row space-between card-picker-header">
              <h3 id="card-picker-heading">Choose a card for {active.position.label}</h3>
              <button className="ghost" type="button" onClick={() => dialog.current?.close()}>Close</button>
            </div>
            <label htmlFor="card-picker-search">Search cards</label>
            <input ref={searchBox} id="card-picker-search" type="search" autoComplete="off" spellCheck={false}
              value={query} placeholder="Try Ace of Cups"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  results.current?.querySelector('button')?.focus();
                } else if (event.key === 'Enter' && matches.length === 1) {
                  event.preventDefault();
                  choose(matches[0].id);
                }
              }} />
            {query.trim() && <p className="small muted card-picker-count" role="status">
              {matches.length ? `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}` : 'No cards match. Try a different name.'}
            </p>}
            <ul className="card-picker-results" ref={results} aria-label="Matching cards">
              {matches.map((card) => {
                const elsewhere = otherPositions(card.id, activeIndex);
                return (
                  <li key={card.id}>
                    <button type="button" onClick={() => choose(card.id)}>
                      <span>{card.name}</span>
                      {card.id === active.card?.id && <span className="small muted">Selected</span>}
                      {elsewhere.length > 0 && <span className="small muted">In {elsewhere.join(', ')}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {active.card && <button className="ghost card-picker-clear" type="button" onClick={() => choose('')}>Clear card</button>}
          </>
        )}
      </dialog>
    </section>
  );
}
