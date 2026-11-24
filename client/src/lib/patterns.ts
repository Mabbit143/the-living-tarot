// patterns.ts — recurrence counting, honestly.
// Frequency depends on the number of readings, the deck, and the draw
// method. Counts are reported with their sample size attached, and never
// presented as fate.

import { getCard } from './knowledge';
import type { Reading } from './types';

export interface CardCount {
  cardId: string;
  name: string;
  count: number;
}

export interface PairCount {
  a: string;
  b: string;
  nameA: string;
  nameB: string;
  count: number;
}

export interface PatternReport {
  readingCount: number;
  topCards: CardCount[];
  topPairs: PairCount[];
  caveat: string;
}

export function computePatterns(readings: Reading[]): PatternReport {
  const completed = readings.filter((r) => r.status === 'complete');
  const cardCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();

  for (const r of completed) {
    const ids = r.cards.map((c) => c.cardId);
    for (const id of ids) cardCounts.set(id, (cardCounts.get(id) ?? 0) + 1);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join('|');
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const topCards: CardCount[] = [...cardCounts.entries()]
    .map(([cardId, count]) => ({
      cardId,
      name: getCard(cardId)?.name ?? cardId,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topPairs: PairCount[] = [...pairCounts.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split('|');
      return {
        a,
        b,
        nameA: getCard(a)?.name ?? a,
        nameB: getCard(b)?.name ?? b,
        count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const n = completed.length;
  const caveat =
    n === 0
      ? 'No completed readings yet — patterns need readings to exist.'
      : `Based on ${n} completed reading${n === 1 ? '' : 's'}. Frequency depends on how many readings you have done, the deck, and the draw method — a card that shows up often is a thread to notice, not a fate being announced.`;

  return { readingCount: n, topCards, topPairs, caveat };
}
