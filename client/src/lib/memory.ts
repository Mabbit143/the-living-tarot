// memory.ts — memory extraction from readings.
// The reader suggests memories; every suggestion starts UNCONFIRMED. Nothing
// becomes a lasting fact about the user's life until they keep it. Sensitive
// inferences are never auto-confirmed.

import { getCard } from './knowledge';
import type { MemoryItem, Reading } from './types';
import { newId, nowIso } from './types';

export function suggestMemories(reading: Reading): MemoryItem[] {
  const suggestions: MemoryItem[] = [];
  const at = nowIso();

  if (reading.question.trim()) {
    suggestions.push({
      id: newId(),
      text: `Asked about: ${reading.question.trim()}`,
      kind: 'concern',
      timeframe: 'current',
      status: 'suggested',
      source: `reading (${reading.spreadName})`,
      confidence: 'low',
      createdAt: at,
    });
  }

  // Major Arcana cards carry the reading's themes; suggest the first as a
  // theme to watch, framed as a suggestion, not a fact.
  const major = reading.cards.find((c) => getCard(c.cardId)?.arcana === 'major');
  if (major) {
    const card = getCard(major.cardId);
    if (card) {
      suggestions.push({
        id: newId(),
        text: `Theme from ${card.name} (${major.positionLabel}): ${card.upright.split('.')[0]}.`,
        kind: 'event',
        timeframe: 'current',
        status: 'suggested',
        source: `reading (${reading.spreadName})`,
        confidence: 'low',
        createdAt: at,
      });
    }
  }

  return suggestions;
}
