// relevance.ts — ranked retrieval over the reader's personal knowledge.
// Decides *what the reader remembers right now*: given the current question,
// context, and drawn cards, rank memories, lexicon entries, and past readings
// so composition stages share one ordering. Deterministic by design — the same
// inputs always produce the same order. No network, no model calls.

import { sharedTopics } from './readingContext';
import { nowIso } from './types';
import type { LexiconEntry, MemoryItem, Reading } from './types';

export type CandidateKind = 'memory' | 'lexicon' | 'reading';

export interface Candidate {
  /** Stable identifier (memory id, card id, reading id). */
  key: string;
  kind: CandidateKind;
  /** Text matched against the query (never shown verbatim without context). */
  text: string;
  /** ISO timestamp used for recency weighting. */
  at: string;
  /** Extra texts that also count for topic overlap (e.g. card names). */
  alsoMatch?: string[];
  /** Hand-set significance: confirmed memories, signifier cards, and so on. */
  significance?: number;
}

export interface RankQuery {
  question: string;
  context?: string;
  /** Meanings + position meanings of the currently drawn cards. */
  cardTexts?: string[];
  /** ISO "now" for recency weighting. Defaults to the current time. */
  now?: string;
}

export interface RankedCandidate {
  candidate: Candidate;
  score: number;
  /** Query words that matched, for transparency in composed text. */
  topics: string[];
}

const MS_PER_DAY = 86_400_000;

function daysAgo(fromIso: string, nowIsoValue: string): number | null {
  const from = Date.parse(fromIso);
  const now = Date.parse(nowIsoValue);
  if (Number.isNaN(from) || Number.isNaN(now)) return null;
  return Math.max(0, (now - from) / MS_PER_DAY);
}

function recencyBonus(at: string, nowIsoValue: string): number {
  const age = daysAgo(at, nowIsoValue);
  if (age === null) return 0;
  if (age <= 30) return 2;
  if (age <= 90) return 1;
  return 0;
}

export function rankCandidates(candidates: Candidate[], query: RankQuery): RankedCandidate[] {
  const now = query.now ?? nowIso();
  const queryText = [query.question, query.context ?? ''].filter(Boolean).join(' ');
  const matchSources = [queryText, ...(query.cardTexts ?? [])];

  return candidates
    .map((candidate) => {
      const sources = [candidate.text, ...(candidate.alsoMatch ?? [])];
      const topics = [...new Set(matchSources.flatMap((source) => sharedTopics(source, ...sources)))];
      // sharedTopics is directional (words of first arg found in the rest),
      // so also check the reverse direction for recall.
      const reverse = [...new Set(sources.flatMap((source) => sharedTopics(source, queryText)))];
      const allTopics = [...new Set([...topics, ...reverse])];
      const score = allTopics.length * 3
        + recencyBonus(candidate.at, now)
        + (candidate.significance ?? 0);
      return { candidate, score, topics: allTopics };
    })
    .sort((a, b) =>
      b.score - a.score
      || b.topics.length - a.topics.length
      || (a.candidate.at < b.candidate.at ? 1 : a.candidate.at > b.candidate.at ? -1 : 0)
      || (a.candidate.key < b.candidate.key ? -1 : 1),
    );
}

const CONFIDENCE_BONUS = { high: 2, medium: 1, low: 0 } as const;

/** Confirmed memories rank; suggested ones stay eligible; hidden ones never surface. */
export function memoryCandidates(memories: MemoryItem[]): Candidate[] {
  return memories
    .filter((m) => m.status !== 'hidden')
    .map((m) => ({
      key: m.id,
      kind: 'memory' as const,
      text: m.text,
      at: m.createdAt,
      significance: (m.status === 'confirmed' ? 2 : 0) + CONFIDENCE_BONUS[m.confidence],
    }));
}

function lexiconText(entry: LexiconEntry): string {
  return [
    entry.personalMeaning ?? '',
    ...entry.personalAssociations.map((a) => a.text),
  ].filter(Boolean).join('\n');
}

/** Only cards the reader has made their own compete for attention. */
export function lexiconCandidates(lexicon: Record<string, LexiconEntry>): Candidate[] {
  return Object.values(lexicon)
    .filter((entry) => lexiconText(entry).length > 0)
    .map((entry) => ({
      key: entry.cardId,
      kind: 'lexicon' as const,
      text: lexiconText(entry),
      // Latest association date when there is one; otherwise no recency claim.
      at: entry.personalAssociations[entry.personalAssociations.length - 1]?.at ?? '',
      significance: entry.signifier ? 1 : 0,
    }));
}

export interface AppearanceHistory {
  total: number;
  recent: number;
}

/** Honest counting with a stated recency window. The total never changes;
 *  `recent` names how many appearances fell inside the window so any extra
 *  emphasis stays truthful. */
export function appearanceHistory(
  cardId: string,
  readings: Reading[],
  now?: string,
  windowDays = 30,
): AppearanceHistory {
  const nowMs = Date.parse(now ?? nowIso());
  let total = 0;
  let recent = 0;
  for (const reading of readings) {
    if (!reading.cards.some((card) => card.cardId === cardId)) continue;
    total += 1;
    const at = Date.parse(reading.createdAt);
    if (!Number.isNaN(nowMs) && !Number.isNaN(at) && nowMs - at >= 0 && nowMs - at <= windowDays * MS_PER_DAY) {
      recent += 1;
    }
  }
  return { total, recent };
}

export function readingCandidates(readings: Reading[], currentCardIds: string[]): Candidate[] {
  const current = new Set(currentCardIds);
  return readings
    .filter((r) => r.status === 'complete')
    .map((r) => {
      const sharedCards = r.cards.filter((c) => current.has(c.cardId)).length;
      return {
        key: r.id,
        kind: 'reading' as const,
        text: [r.question, ...r.reflections.map((ref) => ref.text)].filter(Boolean).join('\n'),
        at: r.createdAt,
        alsoMatch: r.cards.map((c) => c.cardId),
        significance: sharedCards * 2,
      };
    });
}
