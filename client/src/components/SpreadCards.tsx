import type { DeckId, DrawnCard } from '../lib/types';
import CardFace from './CardFace';

export default function SpreadCards({ cards, deck }: { cards: DrawnCard[]; deck: DeckId }) {
  return (
    <div className="card-grid">
      {cards.map((card) => (
        <div key={card.position} className={`tarot-card${card.reversed ? ' reversed' : ''}`}>
          <span className="position">{card.positionLabel}</span>
          <CardFace cardId={card.cardId} deck={deck} reversed={card.reversed} />
        </div>
      ))}
    </div>
  );
}
