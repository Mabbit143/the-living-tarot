import type { CardMeaning } from './knowledge';
import type { DrawnCard, LexiconEntry } from './types';

type Role = 'starting point' | 'task' | 'fear' | 'support' | 'obstacle' | 'outcome';

export function positionRole(label: string): Role | undefined {
  if (/\bfears?\b/i.test(label)) return 'fear';
  if (/\b(?:challenge|obstacle|block)\b/i.test(label)) return 'obstacle';
  if (/\b(?:outcome|future|result)\b/i.test(label)) return 'outcome';
  if (/\b(?:attitude|helps?|strengths?|support)\b/i.test(label)) return 'support';
  if (/\b(?:task|advice|guidance|next step|habit|action)\b/i.test(label)) return 'task';
  if (/where you stand|\b(?:present|situation|current)\b/i.test(label)) return 'starting point';
}

const prompts: Record<Role, string> = {
  'starting point': 'Where is this theme already showing up in your situation?',
  task: 'What would it look like to act on this theme in one small way?',
  fear: 'Where might the worry about this theme be shaping your choices?',
  support: 'What could help you bring more of this quality to your next step?',
  obstacle: 'Where might this theme be making it harder to move forward?',
  outcome: 'What choices would make this possibility more likely?',
};

const positionReadings: Partial<Record<string, Partial<Record<Role, string>>>> = {
  'the-world': {
    'starting point': 'You may be standing at the end of a chapter. Before choosing what to start, ask what you’ve already finished and what you want to take forward.',
  },
  'the-high-priestess': {
    task: 'Give yourself some quiet before you decide. Write down what you already suspect and what you still need to find out. Those are two different kinds of information.',
  },
  'queen-of-swords': {
    fear: 'You might be worried that saying what you see or setting a clear boundary will come across as cold. What would it sound like to be honest and kind at the same time?',
  },
  'page-of-pentacles': {
    'starting point': 'You may be at the beginning of something you can learn through practice. What do you know from trying it, and what are you still guessing about?',
    task: 'Take one idea out of your head and try it in a way you can observe. A short practice session, a prototype, or one conversation could tell you what to do next.',
    fear: 'You might be afraid of being a beginner again or of putting time into something that goes nowhere. What would make a small trial feel worth the effort?',
    support: 'Approach the next move as a learner. Pick a small, practical experiment and give yourself permission to learn from it before you commit to more.',
    obstacle: 'You may be waiting until you know enough to start. Ask which part you could learn faster by trying it on a small scale.',
    outcome: 'The outcome may be a foothold you can build on, such as a skill, an early result, or a first opportunity. What would tell you it is worth developing further?',
  },
  'king-of-wands': {
    outcome: 'A possible direction is taking ownership of a bigger idea and inviting others into it. You can work toward that without taking on every part of the work yourself.',
  },
};

export function firstSentence(text: string): string {
  return (text.match(/^.*?[.!?](\s|$)/)?.[0] ?? text).trim();
}

export function personalAssociation(entry?: LexiconEntry): string | undefined {
  return entry?.personalMeaning?.trim()
    || entry?.personalAssociations[entry.personalAssociations.length - 1]?.text.trim()
    || undefined;
}

const commonWords = new Set([
  'about', 'after', 'also', 'before', 'could', 'does', 'from', 'have', 'into', 'make', 'might',
  'more', 'need', 'only', 'should', 'some', 'than', 'that', 'them', 'then', 'there', 'these',
  'they', 'this', 'want', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your',
  'card', 'cards', 'position', 'reading', 'right', 'thing', 'things', 'situation',
  // Words that technically overlap but carry no theme. Without these, two
  // unrelated meanings can appear to "circle around" each other.
  'each', 'self', 'selves', 'other', 'others', 'either', 'neither', 'both',
  'same', 'much', 'many', 'often', 'still', 'even', 'ever', 'quite', 'rather',
  'anything', 'something', 'everything', 'nothing', 'someone', 'anyone', 'everyone',
  'another', 'every', 'always', 'never', 'away', 'back', 'over', 'under',
  // Auxiliary and copula verbs: grammatical glue, never themes.
  'will', 'shall', 'must', 'does', 'have', 'were', 'been', 'being',
]);

export function sharedTopics(text: string, ...sources: string[]): string[] {
  const words = (value: string) => value.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const sourceWords = new Set(sources.flatMap(words));
  return [...new Set(words(text))].filter((word) => !commonWords.has(word) && sourceWords.has(word));
}

export function cardInPosition(draw: DrawnCard, card: CardMeaning, personal?: string): string {
  const role = positionRole(draw.positionLabel);
  const positionNote = role ? prompts[role] : draw.positionMeaning;
  if (personal) {
    // When the reader's own meaning shares nothing with the book's, say so
    // plainly and let theirs win. Quiet agreement needs no announcement.
    const book = draw.reversed ? card.reversed : card.upright;
    const tension = sharedTopics(personal, book).length === 0
      ? ` That pulls against the card’s traditional meaning — yours wins here, because it’s built from your life, not the book.`
      : '';
    return `You associate ${card.name} with “${personal}.”${tension} ${positionNote}`;
  }
  const specific = role && !draw.reversed ? positionReadings[card.id]?.[role] : undefined;
  if (specific) return specific;
  const theme = firstSentence(draw.reversed ? card.reversed : card.upright);
  if (role === 'fear') return `This position points to what feels risky to you. Read this card’s theme as a possible fear: ${theme} ${positionNote}`;
  if (role === 'outcome') return `Here is a possibility to consider if the current direction continues: ${theme} ${positionNote}`;
  return `${theme} ${positionNote}`;
}

const suitFocus: Record<string, string> = {
  cups: 'what you feel or need from the people involved',
  pentacles: 'what you can test or build with the resources you have',
  swords: 'what needs to be said, decided, or understood clearly',
  wands: 'where you have the energy and initiative to act',
};

export function cardInCompany(
  draw: DrawnCard,
  nextDraw: DrawnCard,
  nextCard: CardMeaning,
  nextAssociation?: string,
): string {
  const role = positionRole(draw.positionLabel);
  const nextRole = positionRole(nextDraw.positionLabel);
  if ((role !== 'support' && role !== 'task') || nextRole !== 'outcome') return '';

  if (nextAssociation) {
    return `As you decide what to try, use your association of “${nextAssociation}” for ${nextCard.name} as a way to ask whether the next step leads where you want to go.`;
  }
  if (draw.cardId === 'page-of-pentacles' && !draw.reversed && nextCard.id === 'king-of-wands' && !nextDraw.reversed) {
    return 'With the King of Wands as the possible outcome, make the experiment small enough to start and useful enough to show whether you want to lead something bigger.';
  }
  if (nextDraw.reversed) {
    return `With ${nextCard.name} reversed in the outcome, let the first attempt show you what still feels blocked or unfinished.`;
  }
  const focus = nextCard.suit ? suitFocus[nextCard.suit] : undefined;
  return focus
    ? `With ${nextCard.name} in the outcome, judge that approach by ${focus}.`
    : `With ${nextCard.name} in the outcome, use this approach to see which part of that possibility you can influence.`;
}

export function readTogether(
  draws: DrawnCard[],
  lexicon: Record<string, LexiconEntry>,
  getCard: (id: string) => CardMeaning | undefined,
  context: string,
): string {
  const cards = draws.flatMap((draw) => {
    const card = getCard(draw.cardId);
    return card ? [{ draw, card, role: positionRole(draw.positionLabel) }] : [];
  });
  const support = cards.find(({ role }) => role === 'support' || role === 'task');
  const outcome = cards.find(({ role }) => role === 'outcome');
  const associated = cards.find(({ card }) => personalAssociation(lexicon[card.id]));
  const contextual = cards
    .map((entry) => ({ ...entry, topics: sharedTopics(context, entry.draw.positionLabel, entry.draw.positionMeaning,
      personalAssociation(lexicon[entry.card.id]) ?? (entry.draw.reversed ? entry.card.reversed : entry.card.upright)) }))
    .sort((a, b) => b.topics.length - a.topics.length)[0];
  const relevant = contextual?.topics.length ? cards.find(({ draw }) => draw === contextual.draw) : undefined;
  const first = relevant ?? associated ?? support ?? cards[0];
  const neighbors = cards.filter((entry) => entry !== first);
  const second = neighbors.find(({ card }) => personalAssociation(lexicon[card.id]))
    ?? neighbors.find((entry) => entry === outcome)
    ?? neighbors.find((entry) => entry === support)
    ?? neighbors[0];
  if (!first || !second) return '';

  const personal = personalAssociation(lexicon[first.card.id]);
  const otherPersonal = personalAssociation(lexicon[second.card.id]);
  const contextLink = relevant && contextual
    ? `You brought up “${contextual.topics[0]}.” ${first.card.name} gives you a place to explore that in this spread. `
    : '';
  const pairing = new Set(cards.filter(({ draw }) => !draw.reversed).map(({ card }) => card.id));
  if (!personal && !otherPersonal && pairing.has('the-high-priestess') && pairing.has('page-of-pentacles')
    && cards.some(({ card, role }) => card.id === 'the-high-priestess' && role === 'task')
    && cards.some(({ card, role }) => card.id === 'page-of-pentacles' && role === 'support')) {
    const next = outcome?.card.id === 'king-of-wands' && !outcome.draw.reversed
      ? ' If the experiment points somewhere you want to lead, that’s the direction the King of Wands invites you to explore.' : '';
    return `${contextLink}The High Priestess gives you a way to decide, and the Page of Pentacles gives you a way to test it. Take a quiet moment to name what you suspect is worth pursuing, then try one small thing that could confirm or challenge it.${next}`;
  }

  // The card-by-card section already stated each meaning, so the synthesis
  // composes relationships — shared topics, reversals, suits, roles — instead
  // of re-quoting the same sentences.
  const reversed = cards.filter(({ draw }) => draw.reversed);
  const reversalNote = reversed.length > 1 && reversed.length === cards.length
    ? 'Every card arrived reversed, so read this spread as inner weather first — what is shifting inside you before anything changes outside you? '
    : reversed.length > 0
      ? `${joinNames(reversed.map(({ card }) => card.name))} arrived reversed, so hold ${reversed.length > 1 ? 'those' : 'that'} as the inner part of the story. `
      : '';
  if (personal) {
    const secondVoice = otherPersonal
      ? ` Your association of “${otherPersonal}” for ${second.card.name} is the other half of that conversation.`
      : '';
    return `${contextLink}${reversalNote}Bring your association of “${personal}” for ${first.card.name} in “${first.draw.positionLabel}” into conversation with ${second.card.name} in “${second.draw.positionLabel}.”${secondVoice} What does your association change about how you’d read that second card?`;
  }
  const shared = sharedTopics(
    first.draw.reversed ? first.card.reversed : first.card.upright,
    second.draw.reversed ? second.card.reversed : second.card.upright,
  );
  const sharedNote = shared.length > 0
    ? ` Both cards circle around ${joinQuoted(shared)}.`
    : '';
  const relationship = first.role === 'task' && second.role === 'outcome'
    ? 'How might what the first card asks you to try make the second card’s possibility easier or harder to reach?'
    : first.card.suit && first.card.suit === second.card.suit
      ? 'Both cards work in the same suit. What changes as that shared theme moves from one position to the other?'
      : 'Where do these cards support each other, and where might one ask you to reconsider the other?';
  return `${contextLink}${reversalNote}${first.card.name} in “${first.draw.positionLabel}” and ${second.card.name} in “${second.draw.positionLabel}” belong to the same story.${sharedNote} ${relationship}`;
}

export function joinQuoted(topics: string[]): string {
  const shown = topics.slice(0, 3).map((topic) => `“${topic}”`);
  if (shown.length <= 1) return shown[0] ?? '';
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

/** Life-domain bridges: question cue words mapped to theme words that
 *  actually appear in card meanings. Lets "will my app be well received"
 *  meet the Four of Pentacles on "money" instead of missing each other.
 *  Used only to find a meeting point, never stated as a claim. */
const QUESTION_DOMAINS: { match: RegExp; themes: string[] }[] = [
  { match: /\b(app|software|product|startup|business|company|launch|release)\b/i, themes: ['work', 'security', 'money', 'support', 'risk', 'venture', 'reward', 'effort'] },
  { match: /\b(job|career|work|boss|interview|promotion|client)\b/i, themes: ['work', 'security', 'money', 'support', 'effort', 'recognition'] },
  { match: /\b(money|debt|financ|afford|budget|bills|income)\b/i, themes: ['money', 'security', 'resources', 'support'] },
  { match: /\b(love|partner|marri|divorce|romance|crush|dating|husband|wife)\b/i, themes: ['love', 'relationship', 'support', 'trust', 'heart'] },
  { match: /\b(health|body|sick|sleep|tired|doctor|pain|hospital)\b/i, themes: ['health', 'body', 'rest', 'energy', 'recovery'] },
  { match: /\b(mother|father|family|child|kid|parent|home|house|move)\b/i, themes: ['home', 'family', 'support', 'security'] },
  { match: /\b(decision|decide|choice|choose|stuck|option|options)\b/i, themes: ['choice', 'fear', 'risk', 'support'] },
  { match: /\b(anxiet|anxious|worry|afraid|fear|scared|stress|overwhelm)\b/i, themes: ['fear', 'worry', 'rest', 'support'] },
];

/** Theme words a question points at, including via life-domain bridges. */
export function bridgeTopics(question: string): string[] {
  const found = QUESTION_DOMAINS.filter((d) => d.match.test(question)).flatMap((d) => d.themes);
  return [...new Set(found)];
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
