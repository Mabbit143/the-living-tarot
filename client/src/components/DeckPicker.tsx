import { DECKS, preferredDeck } from '../lib/decks';
import type { DeckId } from '../lib/types';

interface Props {
  id: string;
  value: DeckId;
  onChange: (deck: DeckId) => void;
}

export default function DeckPicker({ id, value, onChange }: Props) {
  return (
    <div className="deck-picker">
      <label htmlFor={id}>Deck</label>
      <select id={id} value={value} onChange={(e) => onChange(preferredDeck(e.target.value))}>
        {Object.entries(DECKS).map(([deck, label]) => (
          <option key={deck} value={deck}>{label}</option>
        ))}
      </select>
    </div>
  );
}
