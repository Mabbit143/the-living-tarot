/// <reference types="vite/client" />

import { useState } from 'react';
import { getCard } from '../lib/knowledge';
import type { DeckId } from '../lib/types';

interface Props {
  cardId: string;
  deck: DeckId;
  reversed?: boolean;
}

export default function CardFace({ cardId, deck, reversed }: Props) {
  const [failedSource, setFailedSource] = useState<string>();
  const card = getCard(cardId);
  const source =
    card && deck !== 'midnight'
      ? `${import.meta.env.BASE_URL}decks/${deck}/${card.id}.webp`
      : undefined;

  return (
    <>
      {source && source !== failedSource ? (
        <img
          key={source}
          className={`tarot-art${reversed ? ' is-reversed' : ''}`}
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(source)}
        />
      ) : (
        <span className="numeral" aria-hidden="true">{card?.arcana === 'major' ? '✦' : '✧'}</span>
      )}
      <span className="name">{card?.name ?? cardId}</span>
      {reversed && <span className="card-orientation">Reversed</span>}
    </>
  );
}
