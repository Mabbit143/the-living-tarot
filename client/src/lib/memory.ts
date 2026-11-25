// memory.ts — memory extraction from readings.
// The reader suggests memories; every suggestion starts UNCONFIRMED. Nothing
// becomes a lasting fact about the user's life until they keep it. Sensitive
// inferences are never auto-confirmed.

import { getCard } from './knowledge';
import type { MemoryItem, Reading } from './types';

export function suggestMemories(reading: Reading): Omit<MemoryItem, 'id' | 'createdAt'>[] {
  const suggestions: Omit<MemoryItem, 'id' | 'createdAt'>[] = [];

  // Note: the question itself is deliberately NOT suggested as a memory.
  // Past readings already carry their questions into ranked retrieval, so a
  // separate "you asked about" entry only clutters review without adding
  // anything the reader can use.
  // Major Arcana cards carry the reading's themes; suggest the first as a
  // theme to watch, framed as a suggestion from the cards — never as
  // something that happened in the reader's life.
  const major = reading.cards.find((c) => getCard(c.cardId)?.arcana === 'major');
  if (major) {
    const card = getCard(major.cardId);
    if (card) {
      suggestions.push({
        text: `The cards suggest watching this theme from ${card.name} (${major.positionLabel}): ${card.upright.split('.')[0]}.`,
        kind: 'event',
        timeframe: 'current',
        status: 'suggested',
        source: `cards suggested in ${reading.spreadName}`,
        confidence: 'low',
      });
    }
  }

  return suggestions;
}
