// Shared data model for The Living Tarot.
// Persistence lives behind the StoreAdapter interface (see store.ts); the
// React code only ever talks to the Db shape below.

export type VoiceId = 'familiar' | 'mystic' | 'interpreter';
export type DeckId = 'rws' | 'marseille' | 'midnight';

export interface Profile {
  name: string;
  lifeContext: string;
  people: string;
  goals: string;
  concerns: string;
  themes: string[];
  preferredVoice: VoiceId;
  createdAt: string;
}

export interface DrawnCard {
  cardId: string;
  position: number;
  positionLabel: string;
  positionMeaning: string;
  reversed: boolean;
}

export interface Reflection {
  text: string;
  at: string;
}

export interface Reading {
  id: string;
  spreadName: string;
  question: string;
  cards: DrawnCard[];
  interpretation: string;
  createdAt: string;
  status: 'draft' | 'complete';
  reflections: Reflection[];
  physicalDeck: boolean;
  deckId?: DeckId;
  nextPromptIndex?: number;
}

export interface PersonalAssociation {
  text: string;
  at: string;
}

export interface Signifier {
  kind: 'self' | 'other' | 'relationship' | 'period' | 'situation';
  label: string;
  temporary: boolean;
}

export interface LexiconEntry {
  cardId: string;
  /** The user's own working meaning for this card, set when they ask the
   * reader to remember one. It sits on top of the synthesized meaning. */
  personalMeaning?: string;
  personalAssociations: PersonalAssociation[];
  signifier?: Signifier;
}

export type MemoryKind = 'person' | 'relationship' | 'goal' | 'concern' | 'event';
export type MemoryStatus = 'confirmed' | 'suggested' | 'hidden';

export interface MemoryItem {
  id: string;
  text: string;
  kind: MemoryKind;
  timeframe: 'current' | 'past';
  status: MemoryStatus;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  readingId: string;
  role: 'reader' | 'user';
  text: string;
  at: string;
}

export interface JournalEntry {
  id: string;
  text: string;
  cardIds: string[];
  at: string;
}

export interface Db {
  profile: Profile | null;
  preferredDeck?: DeckId;
  readings: Reading[];
  lexicon: Record<string, LexiconEntry>;
  memories: MemoryItem[];
  chat: ChatMessage[];
  journal: JournalEntry[];
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
