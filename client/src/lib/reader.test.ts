import { describe, expect, it } from 'vitest';
import { buildInterpretation, conversationOpening } from './reader';
import { suggestMemories } from './memory';
import { getSpread } from './knowledge';
import type { DrawnCard, Reading } from './types';

const spread = getSpread('Three-Card Spread')!;

const NOW = '2026-11-25T12:00:00.000Z';
const draw = (cardId: string): DrawnCard => ({
  cardId, position: 0, positionLabel: 'Past', positionMeaning: 'past', reversed: false,
});
const reading = (overrides: Partial<Reading> & { id: string }): Reading => ({
  spreadName: 'Three-Card Spread',
  question: '',
  cards: [],
  interpretation: '',
  createdAt: '2026-11-20T12:00:00.000Z',
  status: 'complete',
  reflections: [],
  physicalDeck: false,
  ...overrides,
});

describe('reflection echo', () => {
  it('opens with the latest reflection on shared cards', () => {
    const out = buildInterpretation({
      spread,
      question: 'Q?',
      memories: [],
      drawn: [draw('page-of-pentacles')],
      profile: null,
      lexicon: {},
      pastReadings: [
        reading({ id: 'old', createdAt: '2025-01-10T00:00:00.000Z', cards: [draw('page-of-pentacles')], reflections: [{ text: 'old news', at: NOW }] }),
        reading({ id: 'new', createdAt: '2026-11-24T00:00:00.000Z', cards: [draw('page-of-pentacles')], reflections: [{ text: 'first sprout', at: NOW }, { text: 'repotted it', at: NOW }] }),
      ],
      voice: 'familiar',
      readingIndex: 0,
      now: NOW,
    });
    expect(out.opening).toContain('repotted it');
    expect(out.opening).toContain('Last time');
    expect(out.opening).not.toContain('old news');
  });

  it('stays silent without shared reflected cards', () => {
    const out = buildInterpretation({
      spread,
      question: 'Q?',
      memories: [],
      drawn: [draw('the-tower')],
      profile: null,
      lexicon: {},
      pastReadings: [
        reading({ id: 'x', cards: [draw('page-of-pentacles')], reflections: [{ text: 'unrelated', at: NOW }] }),
      ],
      voice: 'familiar',
      readingIndex: 0,
      now: NOW,
    });
    expect(out.opening).not.toContain('Last time');
  });
});

describe('question bridging', () => {
  const build = (question: string, cardId = 'four-of-pentacles') => buildInterpretation({
    spread,
    question,
    memories: [],
    drawn: [draw(cardId)],
    profile: null,
    lexicon: {},
    pastReadings: [],
    voice: 'familiar',
    readingIndex: 0,
    now: NOW,
  });

  it('names the part of the card that speaks to the question', () => {
    const out = build('money worries and rent');
    expect(out.sections[0].body).toContain('spotlight on');
    expect(out.sections[0].body).toContain('“money”');
  });

  it('stays silent when nothing connects', () => {
    const out = build('should I text him back tonight');
    expect(out.sections[0].body).not.toContain('spotlight on');
  });

  it('meets a concrete question on its own words', () => {
    const out = build('will my garden grow');
    expect(out.sections[0].body).toContain('“grow”');
    expect(out.sections[0].body).not.toContain('“will”');
  });

  it('never synthesizes around empty filler words', () => {
    const out = buildInterpretation({
      spread,
      question: '',
      memories: [],
      drawn: [draw('nine-of-swords'), draw('seven-of-cups')],
      profile: null,
      lexicon: {},
      pastReadings: [],
      voice: 'familiar',
      readingIndex: 0,
      now: NOW,
    });
    const synthesis = out.sections.find((s) => s.heading === 'How they read together');
    expect(synthesis?.body).not.toContain('circle around');
    expect(synthesis?.body).not.toMatch(/"(each|self)"/);
  });

  it('picks a relevant closing question, never a confidently wrong one', () => {
    const out = build('What can I do to make this app be well received');
    expect(out.closingQuestion).not.toContain('new job');
  });
});

describe('conversationOpening', () => {
  it('asks an answerable question tied to the topic', () => {
    const out = conversationOpening('What can I do to make this app be well received', 'familiar');
    expect(out).toContain('What can I do to make this app be well received');
    expect(out.trimEnd().endsWith('?')).toBe(true);
  });

  it('asks for the situation itself when there is no question yet', () => {
    for (const voice of ['familiar', 'mystic', 'interpreter'] as const) {
      const out = conversationOpening('   ', voice);
      expect(out).not.toContain('“”');
      expect(out.trimEnd().endsWith('?')).toBe(true);
    }
  });
});

describe('suggestMemories', () => {
  it('never suggests the question itself as a memory', () => {
    const suggestions = suggestMemories(
      reading({ id: 'r1', question: 'will my garden grow', cards: [draw('page-of-pentacles')] }),
    );
    expect(suggestions.every((s) => !s.text.includes('will my garden grow'))).toBe(true);
  });
});
