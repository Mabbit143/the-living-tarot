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

  it('leads with the question so the card reads as the answer', () => {
    const out = build('money worries and rent');
    expect(out.sections[0].body.startsWith('With “money worries and rent” in view')).toBe(true);
  });

  it('stays silent when nothing connects', () => {
    const out = build('should I text him back tonight');
    expect(out.sections[0].body).not.toContain('in view, here’s this card’s answer');
    expect(out.sections[0].body).not.toContain('Reading “should I text him back tonight”');
  });

  it('meets a concrete question on its own words', () => {
    const out = build('will my garden grow');
    expect(out.sections[0].body).toContain('will my garden grow');
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

describe('talk-first context', () => {
  const build = (question: string, context: string | undefined, profile: null) => buildInterpretation({
    spread,
    question,
    context,
    memories: [],
    drawn: [draw('knight-of-swords')],
    profile,
    lexicon: {},
    pastReadings: [],
    voice: 'familiar',
    readingIndex: 0,
    now: NOW,
  });

  it('quotes the reader back and admits when no card names it', () => {
    const out = build('', 'How do i trust casein with parts of my life', null);
    const section = out.sections.find((s) => s.heading === 'A question for your situation');
    expect(section?.body).toContain('You told me:');
    expect(section?.body).toContain('isn’t the answer here');
    expect(section?.body).toContain('is the backdrop');
  });

  it('leads with the reader’s own words when there is no question', () => {
    const out = build('', 'How do i trust Kasson with parts of my life', null);
    expect(out.opening).toContain('You told me:');
    expect(out.opening).toContain('How do i trust Kasson with parts of my life');
  });

  it('renders the section with no profile at all when context exists', () => {
    const out = build('', 'How do i trust casein with parts of my life', null);
    expect(out.sections.some((s) => s.heading === 'A question for your situation')).toBe(true);
  });

  it('keeps profile framing when the note comes from the profile', () => {
    const out = buildInterpretation({
      spread,
      question: '',
      context: undefined,
      memories: [],
      drawn: [draw('knight-of-swords')],
      profile: { name: '', lifeContext: 'new job nerves', people: '', goals: '', concerns: '', themes: [], preferredVoice: 'familiar', createdAt: NOW },
      lexicon: {},
      pastReadings: [],
      voice: 'familiar',
      readingIndex: 0,
      now: NOW,
    });
    const section = out.sections.find((s) => s.heading === 'A question for your situation');
    expect(section?.body).toContain('Consider what you shared in your profile');
  });
});

describe('a real reading holds together', () => {
  const herReading = () => buildInterpretation({
    spread,
    question: '',
    context: 'Learning how to trust Kasson with our lives',
    memories: [],
    drawn: [
      draw('five-of-cups'),
      { ...draw('queen-of-wands'), positionLabel: 'Present' },
      { ...draw('two-of-wands'), positionLabel: 'Future' },
    ],
    profile: { name: 'Mabbit', lifeContext: 'new relationship, developer career', people: '', goals: '', concerns: '', themes: [], preferredVoice: 'familiar', createdAt: NOW },
    lexicon: {},
    pastReadings: [],
    voice: 'familiar',
    readingIndex: 0,
    now: NOW,
  });

  it('names where the topic lives instead of circling filler', () => {
    const out = herReading();
    const synthesis = out.sections.find((s) => s.heading === 'How they read together');
    expect(synthesis?.body).toContain('holds it clearest');
    expect(synthesis?.body).not.toContain('circle around');
    expect(synthesis?.body).toContain('stop carrying');
  });

  it('ties the present card to the question and the outcome to both people', () => {
    const out = herReading();
    const queen = out.sections.find((s) => s.heading === 'Present — Queen of Wands');
    expect(queen?.body).toContain('Learning how to trust Kasson');
    const future = out.sections.find((s) => s.heading === 'Future — Two of Wands');
    expect(future?.body).toContain('build together');
  });

  it('voices the new-relationship past-hurt link out loud', () => {
    const out = herReading();
    const personal = out.sections.find((s) => s.heading === 'A question for your situation');
    expect(personal?.body).toContain('hurt you’re afraid of repeating');
  });
});

describe('the annotated reading', () => {
  const herReading = () => buildInterpretation({
    spread,
    question: '',
    context: 'Learning how to trust Kasson with our lives',
    memories: [],
    drawn: [
      { cardId: 'knight-of-swords', position: 0, positionLabel: 'Past', positionMeaning: 'past', reversed: false },
      { cardId: 'eight-of-wands', position: 1, positionLabel: 'Present', positionMeaning: 'present', reversed: true },
      { cardId: 'two-of-wands', position: 2, positionLabel: 'Future', positionMeaning: 'future', reversed: false },
    ],
    profile: { name: 'Mabbit', lifeContext: 'new relationship, developer career', people: '', goals: '', concerns: '', themes: [], preferredVoice: 'familiar', createdAt: NOW },
    lexicon: {},
    pastReadings: [],
    voice: 'familiar',
    readingIndex: 0,
    now: NOW,
  });

  it('states the link instead of asking the client to do the synthesis', () => {
    const out = herReading();
    const synthesis = out.sections.find((s) => s.heading === 'How they read together');
    expect(synthesis?.body).toContain('where it started');
    expect(synthesis?.body).toContain('not to confuse the two');
    expect(synthesis?.body).not.toContain('reconsider the other');
  });

  it('asks what the past taught about the live topic', () => {
    const out = herReading();
    const past = out.sections.find((s) => s.heading === 'Past — Knight of Swords');
    expect(past?.body).toContain('what did that time teach you about trust');
  });

  it('names the actual choice in the outcome', () => {
    const out = herReading();
    const future = out.sections.find((s) => s.heading === 'Future — Two of Wands');
    expect(future?.body).toContain('more of Knight of Swords');
    expect(future?.body).toContain('turn toward Two of Wands');
  });

  it('releases the past explicitly', () => {
    const out = herReading();
    const synthesis = out.sections.find((s) => s.heading === 'How they read together');
    expect(synthesis?.body).toContain('stop carrying');
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
