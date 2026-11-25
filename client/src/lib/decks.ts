import type { DeckId, Reading } from './types';

export const DECKS: Record<DeckId, string> = {
  rws: 'Rider–Waite–Smith',
  marseille: 'Tarot de Marseille',
  midnight: 'Midnight (text only)',
};

export function preferredDeck(id?: string): DeckId {
  if (id === 'marseille' || id === 'midnight') return id;
  return 'rws';
}

export function readingDeck(reading: Reading): DeckId {
  if (reading.physicalDeck || !reading.deckId) return 'midnight';
  return preferredDeck(reading.deckId);
}
