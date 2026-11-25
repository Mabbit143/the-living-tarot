// reader.ts — interpretation assembly.
// Readings are assembled from the embedded knowledge base plus the user's
// stored context, in the reader's voice. No live model call. No predictions:
// the reader asks questions and frames the future as tendency, never fate.

import {
  QUESTION_TYPES,
  getCard,
  voiceProfile,
} from './knowledge';
import type {
  ChatMessage,
  DrawnCard,
  LexiconEntry,
  MemoryItem,
  Profile,
  Reading,
  VoiceId,
} from './types';
import type { CardMeaning, Spread } from './knowledge';
import { bridgeTopics, cardInCompany, cardInPosition, joinNames, joinQuoted, personalAssociation, positionRole, readTogether, sharedTopics } from './readingContext';
import { appearanceHistory, memoryCandidates, rankCandidates, readingCandidates } from './relevance';

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
  context?: string;
  memories?: MemoryItem[];
  profile: Profile | null;
  lexicon: Record<string, LexiconEntry>;
  pastReadings: Reading[];
  voice: VoiceId;
  readingIndex: number;
  /** ISO "now" for recency weighting. Defaults to the current time. */
  now?: string;
}

/**
 * Meet the reader's question where it lands: name the part of this card's
 * meaning that speaks to it, reaching via life-domain bridges when the
 * question never uses the card's own words. Silent when nothing connects.
 */
function linkQuestionToCard(question: string, draw: DrawnCard, card: CardMeaning, index: number): string {
  const q = question.trim();
  if (!q) return '';
  const meaning = draw.reversed ? card.reversed : card.upright;
  const direct = sharedTopics(q, meaning, draw.positionMeaning);
  const via = sharedTopics(bridgeTopics(q).join(' '), meaning)
    .filter((topic) => !direct.includes(topic));
  const topics = [...direct, ...via].slice(0, 3);
  if (topics.length === 0) return '';
  return BRIDGE_TEMPLATES[index % BRIDGE_TEMPLATES.length](joinQuoted(topics));
}

const BRIDGE_TEMPLATES = [
  (topics: string) => `With your question in view, this card puts the spotlight on ${topics}.`,
  (topics: string) => `Against your question, the live part of this card is ${topics}.`,
  (topics: string) => `Held up to your question, this card comes down to ${topics}.`,
];

/** Closing question by relevance: the example question sharing the most
 *  ground with this reading wins — but a single shared word is usually
 *  coincidence ("job" matching "a job"), so anything below two shared topics
 *  falls back to rotation rather than a confidently wrong question. */
function pickClosingQuestion(questions: string[], query: string, seed: number): string {
  const scored = questions.map((text) => ({ text, topics: sharedTopics(query, text).length }));
  const best = scored.reduce((max, s) => Math.max(max, s.topics), 0);
  const pool = best >= 2 ? scored.filter((s) => s.topics === best) : scored;
  return pool[seed % pool.length].text;
}

export function buildInterpretation(input: ReadingInput): Interpretation {
  const { drawn, question, context, memories = [], profile, lexicon, pastReadings, voice, readingIndex, now } = input;
  const vp = voiceProfile(voice);
  const name = profile?.name ? `, ${profile.name}` : '';

  const topic = question.trim();
  const openings: Record<VoiceId, string> = {
    familiar: `Let's sit with this one${name}. ${topic
      ? `Let’s keep your question in view: “${topic}”`
      : 'Here’s what each card brings to the spread.'}`,
    mystic: `The table is set${name}. ${topic
      ? `Let’s hold “${topic}” in mind and see what the images bring up.`
      : 'Let the images speak first.'}`,
    interpreter: `${topic ? `Your question was “${topic}”\n\n` : ''}I’ll start with where each card lands, then look at how they fit together.`,
  };

  const sections: InterpretationSection[] = drawn.map((d, index) => {
    const card = getCard(d.cardId);
    if (!card) return { heading: d.positionLabel, body: 'Card not found in the deck.' };
    const seen = appearanceHistory(d.cardId, pastReadings, now);
    let body = cardInPosition(d, card, personalAssociation(lexicon[d.cardId]));
    const nextDraw = drawn[index + 1];
    const nextCard = nextDraw && getCard(nextDraw.cardId);
    const connection = nextCard && cardInCompany(d, nextDraw, nextCard, personalAssociation(lexicon[nextCard.id]));
    if (connection) body += ` ${connection}`;
    const bridge = linkQuestionToCard(topic, d, card, index);
    if (bridge) body += ` ${bridge}`;
    if (seen.total > 0) {
      body += ` This card came up in ${seen.total} past reading${seen.total === 1 ? '' : 's'}`;
      body += seen.recent > 0
        ? `, ${seen.recent} of them in the last month — it’s active for you right now.`
        : '.';
    }
    const heading = `${d.positionLabel} — ${card.name}${d.reversed ? ' (reversed)' : ''}`;
    return { heading, body };
  });

  // A person remembers what happened last time. When these cards came up
  // before and the reader recorded what actually happened, say so up front.
  const echoedReflection = latestSharedReflection(drawn, pastReadings);
  const currentContext = [context, topic].filter(Boolean).join(' ');
  // Ranked retrieval: confirmed memories sharing at least two topics, ordered
  // by topic overlap, card relevance, recency, and confidence — not by array
  // order. Falling back to array order would let a stale memory outshout a
  // current one.
  const cardTexts = drawn.flatMap((d) => {
    const card = getCard(d.cardId);
    if (!card) return [d.positionMeaning];
    return [d.positionMeaning, d.reversed ? card.reversed : card.upright];
  });
  const relatedMemory = rankCandidates(memoryCandidates(memories), {
    question: topic,
    context,
    cardTexts,
  })
    .map(({ candidate, topics }) => ({
      memory: memories.find((m) => m.id === candidate.key),
      topics,
    }))
    .find(({ memory, topics }) => memory?.status === 'confirmed' && topics.length >= 2)?.memory;
  const together = readTogether(drawn, lexicon, getCard, currentContext);
  if (together) sections.push({ heading: 'How they read together', body: together });
  if (profile && profileContext(profile).length > 0) {
    const reflection = personalizedReflection(question, drawn, { ...profile, preferredVoice: voice }, lexicon);
    if (reflection) sections.push({ heading: 'A question for your situation', body: reflection });
  }

  const questions = QUESTION_TYPES.flatMap((q) => q.example_questions);
  // Score against the reader's own words only: card vocabulary would match
  // almost any example question by coincidence.
  const closingQuery = [topic, context ?? ''].filter(Boolean).join(' ');
  const closingQuestion = pickClosingQuestion(questions, closingQuery, readingIndex + drawn.length);

  return {
    opening: [
      openings[voice],
      context && `You added: “${excerpt(context)}”`,
      echoedReflection && `Last time ${echoedReflection.cardNames} came up, you noted: “${excerpt(echoedReflection.text)}” How does that sit beside this reading?`,
      relatedMemory && `You saved this in Life Memory: “${excerpt(relatedMemory.text)}” Is it still part of what you’re weighing?`,
    ].filter(Boolean).join('\n\n'),
    sections,
    closingQuestion,
    voiceLine: vp.example_line,
  };
}

/** The most recent reflection on a past reading that shares cards with the
 *  current draw. Lets a new reading acknowledge what actually happened last
 *  time instead of starting from zero. */
function latestSharedReflection(
  drawn: DrawnCard[],
  pastReadings: Reading[],
): { cardNames: string; text: string } | undefined {
  const current = new Set(drawn.map((d) => d.cardId));
  const candidates = pastReadings.filter((r) =>
    r.status === 'complete'
    && r.reflections.length > 0
    && r.cards.some((c) => current.has(c.cardId)));
  if (candidates.length === 0) return undefined;
  const latest = [...candidates].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const names = [...new Set(
    latest.cards.filter((c) => current.has(c.cardId)).map((c) => getCard(c.cardId)?.name ?? 'a card'),
  )];
  return { cardNames: joinNames(names), text: latest.reflections[latest.reflections.length - 1].text };
}

function excerpt(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  return cleaned.length > 180 ? `${cleaned.slice(0, 177).trimEnd()}…` : cleaned;
}

function profileContext(profile: Profile): string[] {
  return [profile.lifeContext, profile.goals, profile.concerns, profile.people, ...profile.themes]
    .map((entry) => entry.trim()).filter(Boolean);
}

function personalizedReflection(
  question: string, drawn: DrawnCard[], profile: Profile, lexicon: Record<string, LexiconEntry>,
): string {
  const entries = profileContext(profile);
  const pairs = drawn.flatMap((draw) => {
    const card = getCard(draw.cardId);
    if (!card) return [];
    const theme = personalAssociation(lexicon[card.id]) ?? (draw.reversed ? card.reversed : card.upright);
    return (entries.length ? entries : ['']).map((entry) => ({
      draw, card, entry,
      score: sharedTopics(entry, theme, draw.positionMeaning).length * 3
        + sharedTopics(entry, question).length * 2 + sharedTopics(question, theme, draw.positionMeaning).length,
      actionable: ['task', 'support'].includes(positionRole(draw.positionLabel) ?? ''),
    }));
  });
  pairs.sort((a, b) => b.score - a.score || Number(b.actionable) - Number(a.actionable));
  const focus = pairs[0];
  if (!focus) return '';

  const cardName = `${focus.card.name}${focus.draw.reversed ? ' reversed' : ''}`;
  const position = `“${focus.draw.positionLabel}”`;
  const questionLine = question.trim() ? ` As you revisit “${excerpt(question)},”` : '';
  const context = focus.entry ? ` Consider what you shared in your profile: “${excerpt(focus.entry)}”.` : '';
  const followUp = {
    familiar: 'what’s one small thing this card helps you notice or try?',
    mystic: 'what detail in the card’s image draws your attention, and what does it bring to mind?',
    interpreter: 'which part of the card’s meaning addresses this position, and what would you check before acting on it?',
  }[profile.preferredVoice];

  return [
    `${cardName} appeared in ${position}.${context}`,
    cardInPosition(focus.draw, focus.card, personalAssociation(lexicon[focus.card.id])),
    questionLine ? `${questionLine.trimStart()} ${followUp}` : followUp[0].toUpperCase() + followUp.slice(1),
  ].join('\n\n');
}

export function buildPersonalizedGuidance(reading: Reading, profile: Profile, lexicon: Record<string, LexiconEntry>): string {
  return personalizedReflection(reading.question, reading.cards, profile, lexicon);
}

function mentions(text: string, label: string): boolean {
  const normalized = (value: string) => ` ${value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
  return normalized(text).includes(normalized(label.replace(/^the /i, '')));
}

export function conversationOpening(question: string, voice: VoiceId): string {
  const topic = excerpt(question);
  // Talk-first has to earn its tap: ask something specific enough to answer
  // in a sentence or two, and useful enough that the answer visibly shapes
  // the reading. No question yet means asking for the situation itself.
  if (!topic) {
    const cold: Record<VoiceId, string> = {
      familiar: 'Before we lay out the cards, tell me in your own words — what’s weighing on you most right now?',
      mystic: 'Before the cards speak, tell me — what image or feeling brings you to the table today?',
      interpreter: 'Before we begin, what’s the one detail that matters most about your situation?',
    };
    return cold[voice];
  }
  const openings: Record<VoiceId, string> = {
    familiar: `Let’s look at “${topic}” together. In your own words, what’s the hardest part of it right now?`,
    mystic: `Let’s hold “${topic}” in mind. What feeling or image comes up when you sit with it?`,
    interpreter: `You brought “${topic}” to this spread. What’s the one detail I most need to put the cards in context?`,
  };
  return openings[voice];
}

export interface FollowUpRecall {
  memories?: MemoryItem[];
  pastReadings?: Reading[];
  currentReadingId?: string;
  /** ISO "now" for recency weighting. Defaults to the current time. */
  now?: string;
}

export function followUpReply(
  text: string,
  drawn: DrawnCard[],
  messages: ChatMessage[],
  interpretation: string,
  lexicon: Record<string, LexiconEntry>,
  voice: VoiceId,
  recall: FollowUpRecall = {},
): string {
  const cards = drawn.flatMap((draw) => {
    const card = getCard(draw.cardId);
    return card ? [{ draw, card }] : [];
  });
  if (/^(?:thank(?:s| you)(?: so much)?|that helps)[.! ]*$/i.test(text)) {
    return 'You’re welcome. We can leave it there, or come back to any card you want to sit with a little longer.';
  }
  if (/\b(?:read together|fit together|overall message|whole spread)\b/i.test(text)) {
    const together = readTogether(drawn, lexicon, getCard, text);
    if (together) return together;
  }

  const named = cards.filter(({ card }) => mentions(text, card.name));
  const positions = cards.filter(({ draw }) => mentions(text, draw.positionLabel));
  const reference = messages[messages.length - 1];
  const previous = reference && reference.text !== interpretation && /\b(?:it|that|this card)\b/i.test(text)
    ? cards.filter(({ card }) => mentions(reference.text, card.name))
    : [];
  const byTopic = cards.filter(({ card, draw }) => sharedTopics(text, draw.positionMeaning,
    personalAssociation(lexicon[card.id]) ?? (draw.reversed ? card.reversed : card.upright)).length > 0);
  const focus = named.length ? named : positions.length ? positions
    : previous.length === 1 ? previous : byTopic.length === 1 ? byTopic : [];

  if (focus.length > 1) {
    const [first, second] = focus;
    return `Let’s look at ${first.card.name} beside ${second.card.name}.\n\n`
      + `${first.draw.positionLabel}\n${cardInPosition(first.draw, first.card, personalAssociation(lexicon[first.card.id]))}\n\n`
      + `${second.draw.positionLabel}\n${cardInPosition(second.draw, second.card, personalAssociation(lexicon[second.card.id]))}\n\n`
      + 'What changes for you when you read those two positions together?';
  }

  const selected = focus[0] ?? (cards.length === 1 ? cards[0] : undefined);
  if (selected) {
    const { card, draw } = selected;
    const meaning = cardInPosition(draw, card, personalAssociation(lexicon[card.id]));
    const orientation = draw.reversed ? ' (reversed)' : '';
    const openings: Record<VoiceId, string> = {
      familiar: `Let’s slow down with ${card.name}${orientation}. In this spread, it landed in “${draw.positionLabel}.”`,
      mystic: `Let’s stay with the image of ${card.name}${orientation} in “${draw.positionLabel}.”`,
      interpreter: `${card.name}${orientation} landed in “${draw.positionLabel}.” That position asks us to look at this: ${draw.positionMeaning}`,
    };
    return `${openings[voice]}\n\n${meaning}`;
  }

  // No card took the focus, so the reader reaches for what it remembers:
  // confirmed memories first, then past readings — the same ranked retrieval
  // the interpretation itself uses.
  const recalledMemory = topRecalledMemory(text, recall);
  if (recalledMemory) {
    return `That brings to mind something you saved in Life Memory: “${excerpt(recalledMemory.text)}” Is it part of what you’re weighing right now?`;
  }
  const recalledReading = topRecalledReading(text, drawn, recall);
  if (recalledReading) {
    const question = recalledReading.question.trim()
      ? ` — “${excerpt(recalledReading.question)}”`
      : '';
    const latest = recalledReading.reflections[recalledReading.reflections.length - 1];
    const reflection = latest ? ` You later noted: “${excerpt(latest.text)}”` : '';
    return `This came up before, in your ${recalledReading.spreadName} reading${question}.${reflection} What feels different about it this time?`;
  }

  if (cards.length === 0) return 'Which part of the reading would you like to look at more closely?';
  return `Let’s take “${excerpt(text)}” back to the spread. Which card feels most connected to that for you? You can name the card or its position.`;
}

function topRecalledMemory(text: string, recall: FollowUpRecall): MemoryItem | undefined {
  const memories = recall.memories ?? [];
  if (memories.length === 0) return undefined;
  const ranked = rankCandidates(memoryCandidates(memories), { question: text, now: recall.now });
  const found = ranked.find(({ candidate, topics }) =>
    candidate.kind === 'memory' && topics.length >= 2);
  return found && memories.find((m) => m.id === found.candidate.key && m.status === 'confirmed');
}

function topRecalledReading(
  text: string,
  drawn: DrawnCard[],
  recall: FollowUpRecall,
): Reading | undefined {
  const past = (recall.pastReadings ?? []).filter((r) => r.id !== recall.currentReadingId);
  if (past.length === 0) return undefined;
  const ranked = rankCandidates(
    readingCandidates(past, drawn.map((d) => d.cardId)),
    { question: text, now: recall.now },
  );
  const found = ranked.find(({ topics }) => topics.length >= 2);
  return found && past.find((r) => r.id === found.candidate.key);
}

/** Detect whether a chat message asks the reader to remember a meaning for a
 * card. Rule-based and explicit: the user has to name the card and say
 * remember / my meaning / call it / for me. Returns the card id, or null. */
export function detectRememberRequest(
  text: string,
  drawn: DrawnCard[],
): { cardId: string; meaning: string } | null {
  const lower = text.toLowerCase();
  const wantsRemember = /\b(?:remember|my meaning|call (?:it|this|that))\b/.test(lower)
    || /^(?!.*\?).+\bmeans?\b.+\bfor me[.!]?$/i.test(text);
  if (!wantsRemember) return null;
  for (const d of drawn) {
    const card = getCard(d.cardId);
    if (!card) continue;
    if (mentions(lower, card.name)) {
      // Take the part after "is" / "means" / ":" as the meaning, if present.
      const m = text.match(/(?:\bis\b|\bmeans?\b|:)\s+(.+)$/i);
      if (m) return { cardId: d.cardId, meaning: m[1].trim() };
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
