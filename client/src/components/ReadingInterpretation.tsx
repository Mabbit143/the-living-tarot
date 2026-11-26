import type { Ref } from 'react';
import { getCard } from '../lib/knowledge';
import type { Reading } from '../lib/types';

const synthesisHeading = 'How they read together';

function readingBlocks(reading: Reading) {
  // The local reader stores known position headings. Other reader text stays prose.
  const headings = new Set([synthesisHeading, 'A question for your situation']);
  for (const draw of reading.cards) {
    headings.add(draw.positionLabel);
    const card = getCard(draw.cardId);
    if (card) headings.add(`${draw.positionLabel} — ${card.name}${draw.reversed ? ' (reversed)' : ''}`);
  }

  return reading.interpretation.trim().replace(/\r\n/g, '\n').split(/\n[ \t]*\n+/).map((text) => {
    const newline = text.indexOf('\n');
    const firstLine = newline > 0 ? text.slice(0, newline).trim() : '';
    return headings.has(firstLine)
      ? { heading: firstLine, body: text.slice(newline + 1) }
      : { heading: undefined, body: text };
  });
}

const closingPrefix = 'One question to carry with you:';

export default function ReadingInterpretation({ reading, headingRef, onAnswerQuestion }: {
  reading: Reading;
  headingRef?: Ref<HTMLHeadingElement>;
  /** In a live conversation, the closing question gets an answer button. In the Archive there is no one to answer to, so it stays plain text. */
  onAnswerQuestion?: (question: string) => void;
}) {
  const blocks = readingBlocks(reading);
  const summaryIndex = blocks.findIndex(({ heading }) => heading === synthesisHeading);
  const firstCardIndex = blocks.findIndex(({ heading }) => Boolean(heading));
  const leadIndex = summaryIndex >= 0 ? summaryIndex : Math.max(firstCardIndex, 0);
  const lead = blocks[leadIndex];
  const details = blocks.filter((_, index) => index !== leadIndex);

  function renderBody(body: string, key: number | string) {
    if (onAnswerQuestion && body.startsWith(closingPrefix)) {
      const question = body.slice(closingPrefix.length).trim();
      return (
        <p className="reading-copy" key={key}>{body}{' '}
          <button className="ghost" onClick={() => onAnswerQuestion(question)}>
            Answer this
          </button>
        </p>
      );
    }
    return <p className="reading-copy" key={key}>{body}</p>;
  }

  return (
    <section className="reading-interpretation" aria-labelledby="reading-interpretation-heading">
      <h3 id="reading-interpretation-heading" ref={headingRef} tabIndex={-1}>
        {lead.heading ?? 'The reading'}
      </h3>
      {renderBody(lead.body, 'lead')}
      {details.length > 0 && (
        <details className="reading-disclosure">
          <summary>{details.some(({ heading }) => heading) ? 'Card-by-card reading' : 'Continue reading'}</summary>
          <div className="reading-breakdown">
            {details.map(({ heading, body }, index) => (
              heading ? (
                <section key={index}>
                  <h4>{heading}</h4>
                  <p className="reading-copy">{body}</p>
                </section>
              ) : renderBody(body, index)
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
