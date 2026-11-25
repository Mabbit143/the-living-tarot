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
    return `You associate ${card.name} with “${personal}.” ${positionNote}`;
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

  const secondTheme = otherPersonal
    ? `Your association for ${second.card.name} is “${otherPersonal}.”`
    : firstSentence(second.draw.reversed ? second.card.reversed : second.card.upright);
  if (personal) {
    return `${contextLink}Bring your association of “${personal}” for ${first.card.name} in “${first.draw.positionLabel}” into conversation with ${second.card.name} in “${second.draw.positionLabel}.” ${secondTheme} What does your association change about how you’d read that second card?`;
  }
  const firstTheme = firstSentence(first.draw.reversed ? first.card.reversed : first.card.upright);
  const relationship = first.role === 'task' && second.role === 'outcome'
    ? 'How might what the first card asks you to try make the second card’s possibility easier or harder to reach?'
    : first.card.suit && first.card.suit === second.card.suit
      ? 'Both cards work in the same suit. What changes as that shared theme moves from one position to the other?'
      : 'Where do these cards support each other, and where might one ask you to reconsider the other?';
  return `${contextLink}Start with ${first.card.name} in “${first.draw.positionLabel}”: ${firstTheme} Then look at how it sits beside ${second.card.name} in “${second.draw.positionLabel}.” ${secondTheme} ${relationship}`;
}
