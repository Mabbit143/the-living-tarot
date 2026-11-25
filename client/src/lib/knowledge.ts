// knowledge.ts — typed access to the knowledge base.
// The JSON files in server/src/knowledge/ are the source of truth and are
// never edited by the app. This module only reads them.
// NOTE (round 1 data): the JSON carries synthesized upright/reversed
// meanings, sources, and disagreement notes per card, but no separate
// traditional-meaning field and no per-card thin-reversal flag. Those two
// display elements are therefore not wired; they need round-2 data that
// carries them explicitly.

import meaningsJson from '../../../server/src/knowledge/synthesized-meanings.json';
import combosJson from '../../../server/src/knowledge/combinations-and-spreads.json';
import guidanceJson from '../../../server/src/knowledge/reader-chat-guidance.json';
import type { DeckId, Profile, VoiceId } from './types';

export interface CardMeaning {
  id: string;
  name: string;
  arcana: 'major' | 'minor';
  suit: string | null;
  number: number | null;
  upright: string;
  reversed: string;
  sources: string[];
  notes: string;
}

export interface SpreadPosition {
  position: number;
  label: string;
  meaning: string;
}

export interface Spread {
  name: string;
  cards: number;
  purpose: string;
  positions: SpreadPosition[];
}

export interface Principle {
  applies_to: string;
  rule: string;
  sources: string[];
}

export interface VoiceProfile {
  voice: string;
  tone: string;
  question_style: string;
  direct_vs_symbolic: string;
  example_line: string;
}

export interface FlowStep {
  step: number;
  reader_says: string;
  purpose: string;
}

export interface Flow {
  spread: string;
  steps: FlowStep[];
}

export interface WeavingTechnique {
  technique?: string;
  name?: string;
  description?: string;
  examples: string[];
}

export interface RespondSituation {
  situation: string;
  reader_does: string;
  example: string;
}

export interface QuestionType {
  question_type: string;
  source: string;
  example_questions: string[];
}

function asJson<T>(v: unknown): T {
  return v as T;
}

export const CARDS: CardMeaning[] = asJson<CardMeaning[]>(meaningsJson);

const combos = asJson<{
  combination_principles: Principle[];
  positional_rules: Principle[];
  spreads: Spread[];
  notes: string;
}>(combosJson);

export const SPREADS: Spread[] = combos.spreads;
export const COMBINATION_PRINCIPLES: Principle[] = combos.combination_principles;
export const POSITIONAL_RULES: Principle[] = combos.positional_rules;
export const COMBINATION_NOTES: string = combos.notes;

const guidance = asJson<{
  conversational_flow: Flow[];
  weaving: WeavingTechnique[];
  responding_to_user_interpretation: RespondSituation[];
  questions_not_predictions: QuestionType[];
  voices: VoiceProfile[];
  notes: string;
}>(guidanceJson);

export const VOICES: VoiceProfile[] = guidance.voices;
export const FLOWS: Flow[] = guidance.conversational_flow;
export const WEAVING: WeavingTechnique[] = guidance.weaving;
export const RESPOND_SITUATIONS: RespondSituation[] = guidance.responding_to_user_interpretation;
export const QUESTION_TYPES: QuestionType[] = guidance.questions_not_predictions;
export const GUIDANCE_NOTES: string = guidance.notes;

const CARD_MAP = new Map(CARDS.map((c) => [c.id, c]));

export function getCard(id: string): CardMeaning | undefined {
  return CARD_MAP.get(id);
}

export function getSpread(name: string): Spread | undefined {
  return SPREADS.find((s) => s.name === name);
}

export function primarySpreads(): Spread[] {
  return SPREADS.filter((s) =>
    ['Single-Card Draw', 'Three-Card Spread', 'Five-Card Spread'].includes(s.name),
  );
}

export function catalogSpreads(): Spread[] {
  return SPREADS.filter(
    (s) => !['Single-Card Draw', 'Three-Card Spread', 'Five-Card Spread'].includes(s.name),
  );
}

const STANDARD_SPREAD_FLOWS: Readonly<Record<string, string | undefined>> = {
  'Single-Card Draw': '1-card',
  'Three-Card Spread': '3-card',
  'Five-Card Spread': '5-card',
};

const CATALOG_FLOW: Flow = {
  spread: 'catalog spreads',
  steps: [{
    step: 1,
    purpose: 'Offer an optional chance to share context before interpreting the spread.',
    reader_says: 'Is there anything you’d like to share before I read the cards?',
  }],
};

/** Position-specific scripts only apply to the layouts they were written for. */
export function flowForSpread(spread: Spread): Flow {
  const key = STANDARD_SPREAD_FLOWS[spread.name];
  return FLOWS.find((f) => f.spread === key) ?? CATALOG_FLOW;
}

export function voiceProfile(id: VoiceId): VoiceProfile {
  const name =
    id === 'familiar' ? 'The Familiar' : id === 'mystic' ? 'The Mystic' : 'The Interpreter';
  return VOICES.find((v) => v.voice === name) ?? VOICES[0];
}

/** The medium's chosen name, falling back to the voice's title. */
export function readerDisplayName(profile: Profile | null | undefined, voice: VoiceId): string {
  const chosen = profile?.readerName?.trim();
  if (chosen) return chosen;
  return voice === 'familiar' ? 'The Familiar' : voice === 'mystic' ? 'The Mystic' : 'The Interpreter';
}

const MARSEILLE_TRUMP_NUMBERS: Partial<Record<string, number>> = {
  justice: 8,
  strength: 11,
};

export function arcanaLabel(card: CardMeaning, deck: DeckId = 'rws'): string {
  if (card.arcana === 'major') {
    const number = deck === 'marseille'
      ? MARSEILLE_TRUMP_NUMBERS[card.id] ?? card.number
      : card.number;
    return number === null ? 'Major Arcana' : `Major Arcana · ${roman(number)}`;
  }
  const suit = card.suit ? card.suit[0].toUpperCase() + card.suit.slice(1) : '';
  const courtRanks = ['Page', 'Knight', 'Queen', 'King'];
  const rank = card.number === null
    ? card.name.split(' of ')[0]
    : courtRanks[card.number - 11] ?? card.number;
  return `${suit} · ${rank}`;
}

function roman(n: number): string {
  const table: [number, string][] = [
    [21, 'XXI'], [20, 'XX'], [19, 'XIX'], [18, 'XVIII'], [17, 'XVII'],
    [16, 'XVI'], [15, 'XV'], [14, 'XIV'], [13, 'XIII'], [12, 'XII'],
    [11, 'XI'], [10, 'X'], [9, 'IX'], [8, 'VIII'], [7, 'VII'],
    [6, 'VI'], [5, 'V'], [4, 'IV'], [3, 'III'], [2, 'II'], [1, 'I'],
  ];
  if (n === 0) return '0';
  let out = '';
  let rest = n;
  for (const [value, glyph] of table) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}
