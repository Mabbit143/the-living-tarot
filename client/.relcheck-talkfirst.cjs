const { buildInterpretation, formatInterpretationText } = require('./.relcheck-tmp/client/src/lib/reader.js');
const K = require('./.relcheck-tmp/client/src/lib/knowledge.js');

const spread = K.getSpread('Three-Card Spread');
const cards = ['knight-of-swords', 'the-lovers', 'king-of-cups'];
const labels = ['Past', 'Present', 'Future'];
const drawn = cards.map((cardId, i) => ({
  cardId, position: i, positionLabel: labels[i], positionMeaning: labels[i], reversed: false,
}));
const context = 'How do i trust casein, with parts of my life, that will matter if he f***s them up';
const it = buildInterpretation({
  spread, drawn, question: '', context, memories: [], profile: null, lexicon: {}, pastReadings: [],
  voice: 'familiar', readingIndex: 0, now: '2026-11-25T12:00:00.000Z',
});
console.log(formatInterpretationText(it));
