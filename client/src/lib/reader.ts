// reader.ts — interpretation assembly.
// Readings are assembled from the embedded knowledge base plus the user's
// stored context, in the reader's voice. No live model call. No predictions:
// the reader asks questions and frames the future as tendency, never fate.

import {
  COMBINATION_PRINCIPLES,
  POSITIONAL_RULES,
  QUESTION_TYPES,
  getCard,
  voiceProfile,
} from './knowledge';
import type {
  DrawnCard,
  LexiconEntry,
  Profile,
  Reading,
  VoiceId,
} from './types';
import type { Spread } from './knowledge';

export interface InterpretationSection {
  heading: string;
  body: string;
}

export interface Interpretation {
  opening: string;
  sections: InterpretationSection[];
  closingQuestion: string;
  voiceLine: string;
}

export interface ReadingInput {
  spread: Spread;
  drawn: DrawnCard[];
  question: string;
  profile: Profile | null;
  lexicon: Record<string, LexiconEntry>;
  pastReadings: Reading[];
  voice: VoiceId;
  readingIndex: number;
}

function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return m ? m[0].trim() : text;
}

function countAppearances(cardId: string, past: Reading[]): number {
  return past.reduce(
    (n, r) => n + r.cards.filter((c) => c.cardId === cardId).length,
    0,
  );
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function principlesFor(drawn: DrawnCard[], spread: Spread): string[] {
  const out: string[] = [];
  const majors = drawn.filter((d) => getCard(d.cardId)?.arcana === 'major');
  const courts = drawn.filter((d) => {
    const c = getCard(d.cardId);
    return c?.arcana === 'minor' && c.number !== null && c.number >= 11;
  });
  const general = COMBINATION_PRINCIPLES.filter((p) => p.applies_to === 'general');
  // A couple of general principles, rotated so readings don't all quote the same one.
  if (general.length > 0) out.push(general[drawn.length % general.length].rule);
  if (majors.length > 0 && drawn.length > majors.length) {
    const p = COMBINATION_PRINCIPLES.find((x) => x.applies_to === 'majors-and-minors');
    if (p) out.push(p.rule);
  }
  if (courts.length > 0) {
    const p = COMBINATION_PRINCIPLES.find((x) => x.applies_to === 'court-cards');
    if (p) out.push(p.rule);
  }
  if (drawn.length >= 3) {
    const p = COMBINATION_PRINCIPLES.find((x) => x.applies_to === 'elemental');
    if (p) out.push(p.rule);
  }
  const spreadRule = COMBINATION_PRINCIPLES.find((x) => x.applies_to === spread.name);
  if (spreadRule) out.push(spreadRule.rule);
  return out;
}

function positionalNote(drawn: DrawnCard[]): string | null {
  const reversed = drawn.filter((d) => d.reversed);
  if (reversed.length > 0) {
    const p = POSITIONAL_RULES.find((x) => x.applies_to === 'reversed-in-position');
    if (p) return p.rule;
  }
  const general = POSITIONAL_RULES.filter((x) => x.applies_to === 'general');
  if (general.length > 0) return general[drawn.length % general.length].rule;
  return null;
}

export function buildInterpretation(input: ReadingInput): Interpretation {
  const { spread, drawn, question, profile, lexicon, pastReadings, voice, readingIndex } = input;
  const vp = voiceProfile(voice);
  const name = profile?.name ? `, ${profile.name}` : '';

  const topic = question.trim();
  const openings: Record<VoiceId, string> = {
    familiar: `Let's sit with this one${name}. ${topic
      ? `You asked about ${topic} — here's what the cards are saying, in your own context.`
      : 'Here’s what each card brings to the spread.'}`,
    mystic: `The table is set${name}. ${topic
      ? `You asked about ${topic} — let the images speak first.`
      : 'Let the images speak first.'}`,
    interpreter: `Reading: ${spread.name}${name}.${topic ? ` Question: ${topic}.` : ''} What follows is the mechanism: card, position, and what recurs.`,
  };

  const sections: InterpretationSection[] = drawn.map((d) => {
    const card = getCard(d.cardId);
    if (!card) return { heading: d.positionLabel, body: 'Card not found in the deck.' };
    const meaning = d.reversed ? card.reversed : card.upright;
    const entry = lexicon[d.cardId];
    const seen = countAppearances(d.cardId, pastReadings);
    let body = `${d.positionMeaning} ${meaning}`;
    if (entry?.personalMeaning) {
      body += ` Your own meaning for this card sits on top of that: "${entry.personalMeaning}"`;
    }
    if (seen > 0) {
      body += ` This card has appeared in ${seen} of your past reading${seen === 1 ? '' : 's'} — keep an eye on what keeps returning.`;
    }
    const heading = `${d.positionLabel} — ${card.name}${d.reversed ? ' (reversed)' : ''}`;
    return { heading, body };
  });

  if (drawn.length > 1) {
    const principles = principlesFor(drawn, spread);
    const posNote = positionalNote(drawn);
    let body =
      'Read together, these cards tell one story rather than several. ';
    const names = drawn
      .map((d) => getCard(d.cardId)?.name ?? d.cardId)
      .join(', ');
    body += `With ${names} on the table, the thread runs through all of them: `;
    body += drawn
      .map((d) => {
        const card = getCard(d.cardId);
        return card ? firstSentence(d.reversed ? card.reversed : card.upright) : '';
      })
      .filter(Boolean)
      .join(' Then ');
    if (principles.length > 0) body += ` ${principles[0]}`;
    if (posNote) body += ` ${posNote}`;
    const majors = drawn.filter((d) => getCard(d.cardId)?.arcana === 'major');
    if (majors.length > 0 && majors.length < drawn.length) {
      body += ` The Major Arcana card${majors.length > 1 ? 's' : ''} here — ${majors.map((d) => getCard(d.cardId)?.name).join(', ')} — frame the smaller cards: they set the theme, the minors fill in how it plays out.`;
    }
    sections.push({ heading: 'How they read together', body });
  }

  const questions = QUESTION_TYPES.flatMap((q) => q.example_questions);
  const closingQuestion = pick(questions, readingIndex + drawn.length);

  return {
    opening: openings[voice],
    sections,
    closingQuestion,
    voiceLine: vp.example_line,
  };
}

/** Detect whether a chat message asks the reader to remember a meaning for a
 * card. Rule-based and explicit: the user has to name the card and say
 * remember / my meaning / call it / for me. Returns the card id, or null. */
export function detectRememberRequest(
  text: string,
  drawn: DrawnCard[],
): { cardId: string; meaning: string } | null {
  const lower = text.toLowerCase();
  const wantsRemember =
    /remember|my meaning|call (it|this|that)|for me/.test(lower);
  if (!wantsRemember) return null;
  for (const d of drawn) {
    const card = getCard(d.cardId);
    if (!card) continue;
    if (lower.includes(card.name.toLowerCase())) {
      // Take the part after "is" / "means" / ":" as the meaning, if present.
      const m = text.match(/(?:is|means?|:)\s+(.+)$/i);
      return { cardId: d.cardId, meaning: (m?.[1] ?? text).trim() };
    }
  }
  return null;
}

export function formatInterpretationText(it: Interpretation): string {
  const parts = [it.opening, ''];
  for (const s of it.sections) parts.push(`${s.heading}\n${s.body}`, '');
  parts.push(`One question to carry with you: ${it.closingQuestion}`);
  return parts.join('\n');
}

/** Recognise direct requests to skip the guided prompts. */
export function requestsInterpretation(text: string): boolean {
  const request = text.toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[.!?,]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(?:(?:why dont you|can you|could you|would you|will you|please|just) )+/, '')
    .replace(/(?: (?:for me|now|please))+$/, '');
  return /^(?:do|give me|start|show me) (?:(?:the|a|my|this) )?(?:reading|interpretation)$/.test(request)
    || /^(?:read|interpret) (?:the|my|these) cards$/.test(request)
    || /^(?:skip (?:the )?(?:questions|prompts)|go ahead)$/.test(request);
}
