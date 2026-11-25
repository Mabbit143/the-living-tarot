import { describe, expect, it } from 'vitest';
import {
  appearanceHistory,
  lexiconCandidates,
  memoryCandidates,
  rankCandidates,
  readingCandidates,
} from './relevance';
import type { LexiconEntry, MemoryItem, Reading } from './types';

const NOW = '2026-11-25T12:00:00.000Z';

function memory(overrides: Partial<MemoryItem> & { id: string; text: string }): MemoryItem {
  return {
    kind: 'concern',
    timeframe: 'current',
    status: 'confirmed',
    source: 'you',
    confidence: 'medium',
    createdAt: '2026-11-20T12:00:00.000Z',
    ...overrides,
  };
}

describe('rankCandidates', () => {
  it('ranks topic overlap above unrelated candidates', () => {
    const ranked = rankCandidates(
      [
        { key: 'a', kind: 'memory', text: 'gardening schedule for spring', at: NOW },
        { key: 'b', kind: 'memory', text: 'my mother is recovering from surgery', at: NOW },
      ],
      { question: 'How can I support my mother while she recovers?', now: NOW },
    );
    expect(ranked[0].candidate.key).toBe('b');
    expect(ranked[0].topics).toContain('mother');
  });

  it('is deterministic for tied candidates', () => {
    const candidates = [
      { key: 'b', kind: 'memory' as const, text: 'same words here', at: NOW },
      { key: 'a', kind: 'memory' as const, text: 'same words here', at: NOW },
    ];
    const first = rankCandidates(candidates, { question: 'same words here', now: NOW });
    const second = rankCandidates([...candidates].reverse(), { question: 'same words here', now: NOW });
    expect(first.map((r) => r.candidate.key)).toEqual(second.map((r) => r.candidate.key));
  });

  it('prefers recent candidates when topics tie', () => {
    const ranked = rankCandidates(
      [
        { key: 'old', kind: 'memory', text: 'shared words about work', at: '2025-01-01T00:00:00.000Z' },
        { key: 'new', kind: 'memory', text: 'shared words about work', at: '2026-11-24T00:00:00.000Z' },
      ],
      { question: 'shared words about work', now: NOW },
    );
    expect(ranked[0].candidate.key).toBe('new');
  });
});

describe('memoryCandidates', () => {
  it('excludes hidden memories and boosts confirmed, high-confidence ones', () => {
    const ranked = rankCandidates(
      memoryCandidates([
        memory({ id: 'hidden', text: 'mother recovery', status: 'hidden', confidence: 'high' }),
        memory({ id: 'suggested', text: 'mother recovery', status: 'suggested', confidence: 'low' }),
        memory({ id: 'confirmed', text: 'mother recovery', status: 'confirmed', confidence: 'high' }),
      ]),
      { question: 'mother recovery', now: NOW },
    );
    expect(ranked.map((r) => r.candidate.key)).toEqual(['confirmed', 'suggested']);
  });
});

describe('lexiconCandidates', () => {
  it('only includes cards the reader made their own, signifiers first', () => {
    const empty: LexiconEntry = { cardId: 'the-fool', personalAssociations: [] };
    const plain: LexiconEntry = {
      cardId: 'the-tower',
      personalMeaning: 'mother surgery waiting room',
      personalAssociations: [],
    };
    const signifier: LexiconEntry = {
      cardId: 'the-star',
      personalMeaning: 'mother surgery waiting room',
      personalAssociations: [],
      signifier: { kind: 'self', label: 'me', temporary: false },
    };
    const ranked = rankCandidates(
      lexiconCandidates({ 'the-fool': empty, 'the-tower': plain, 'the-star': signifier }),
      { question: 'mother surgery waiting room', now: NOW },
    );
    expect(ranked.map((r) => r.candidate.key)).toEqual(['the-star', 'the-tower']);
  });
});

describe('readingCandidates', () => {
  const reading = (overrides: Partial<Reading> & { id: string }): Reading => ({
    spreadName: 'Three cards',
    question: '',
    cards: [],
    interpretation: '',
    createdAt: '2026-11-20T12:00:00.000Z',
    status: 'complete',
    reflections: [],
    physicalDeck: false,
    ...overrides,
  });

  it('counts honestly and names only in-window appearances as recent', () => {
    const at = (day: string) => `2026-11-${day}T00:00:00.000Z`;
    const draw = (cardId: string) => ({ cardId, position: 0, positionLabel: 'Past', positionMeaning: '', reversed: false });
    const reading = (id: string, createdAt: string): Reading => ({
      id, spreadName: 'S', question: '', cards: [draw('the-tower')], interpretation: '',
      createdAt, status: 'complete', reflections: [], physicalDeck: false,
    });
    expect(appearanceHistory('the-tower', [
      reading('old', '2025-01-10T00:00:00.000Z'),
      reading('recent-a', at('24')),
      reading('recent-b', at('20')),
    ], NOW)).toEqual({ total: 3, recent: 2 });
    expect(appearanceHistory('the-tower', [reading('old', '2025-01-10T00:00:00.000Z')], NOW))
      .toEqual({ total: 1, recent: 0 });
    expect(appearanceHistory('the-star', [reading('old', '2025-01-10T00:00:00.000Z')], NOW))
      .toEqual({ total: 0, recent: 0 });
  });

  it('skips drafts and boosts readings sharing cards with the current draw', () => {
    const ranked = rankCandidates(
      readingCandidates(
        [
          reading({ id: 'draft', status: 'draft', cards: [{ cardId: 'the-tower', position: 0, positionLabel: 'Past', positionMeaning: '', reversed: false }] }),
          reading({ id: 'unrelated', cards: [], question: 'unrelated gardening' }),
          reading({
            id: 'shared',
            question: 'unrelated gardening',
            cards: [{ cardId: 'the-tower', position: 0, positionLabel: 'Past', positionMeaning: '', reversed: false }],
          }),
        ],
        ['the-tower'],
      ),
      { question: 'unrelated gardening', now: NOW },
    );
    expect(ranked.map((r) => r.candidate.key)).toEqual(['shared', 'unrelated']);
  });
});
