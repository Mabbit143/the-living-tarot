import { useEffect, useRef, useState } from 'react';
import SpreadCards from './SpreadCards';
import { readingDeck } from '../lib/decks';
import {
  flowForSpread,
  getCard,
  getSpread,
  voiceProfile,
} from '../lib/knowledge';
import {
  buildInterpretation,
  detectRememberRequest,
  formatInterpretationText,
  requestsInterpretation,
} from '../lib/reader';
import { suggestMemories } from '../lib/memory';
import type { ChatMessage, Db, Reading, VoiceId } from '../lib/types';
import { newId, nowIso } from '../lib/types';

interface Props {
  reading: Reading;
  db: Db;
  updateDb: (fn: (db: Db) => Db) => void;
  onDone: () => void;
  onBack: () => void;
}

const ACKS: Record<VoiceId, string[]> = {
  familiar: [
    'That lands. What part of that feels closest to you?',
    'Mm, I hear you. What else is in there?',
    'Okay — I am with you. Keep going.',
  ],
  mystic: [
    'The image shifts as you speak. What do you see in it now?',
    'Listen to what is underneath the words. What stirs?',
    'The cards are listening. What else wants to be said?',
  ],
  interpreter: [
    'Noted. How does that connect to the card in this position?',
    'That gives me something to work with. What is the next thread?',
    'Understood — and does that fit the pattern you have seen before?',
  ],
};

export default function ChatReader({ reading, db, updateDb, onDone, onBack }: Props) {
  const spread = getSpread(reading.spreadName);
  const flow = spread ? flowForSpread(spread) : null;
  const [voice, setVoice] = useState<VoiceId>(db.profile?.preferredVoice ?? 'familiar');
  const [input, setInput] = useState('');
  const [rememberText, setRememberText] = useState<Record<string, string>>({});
  const [ackCount, setAckCount] = useState(0);
  const startedRef = useRef(false);

  const messages: ChatMessage[] = db.chat
    .filter((m) => m.readingId === reading.id)
    .sort((a, b) => a.at.localeCompare(b.at));
  const delivered = Boolean(reading.interpretation);
  const nextPromptIndex = reading.nextPromptIndex ?? messages.reduce((index, message) => {
    // Older drafts only recorded the conversation. Match guide prompts in order,
    // skipping replies about personal meanings and any other reader messages.
    return message.role === 'reader' && message.text === flow?.steps[index]?.reader_says
      ? index + 1
      : index;
  }, 0);

  function messagesForReply(text: string, userText?: string): ChatMessage[] {
    const fields = { readingId: reading.id, at: nowIso() };
    const reply: ChatMessage = { ...fields, id: newId(), role: 'reader', text };
    return userText
      ? [{ ...fields, id: newId(), role: 'user', text: userText }, reply]
      : [reply];
  }

  function reply(
    text: string,
    userText?: string,
    progress?: Partial<Pick<Reading, 'interpretation' | 'nextPromptIndex'>>,
  ) {
    const turn = messagesForReply(text, userText);
    updateDb((d) => ({
      ...d,
      chat: [...d.chat, ...turn],
      readings: progress
        ? d.readings.map((r) => r.id === reading.id ? { ...r, ...progress } : r)
        : d.readings,
    }));
  }

  function deliverInterpretation(userText?: string) {
    if (!spread) return;
    const it = buildInterpretation({
      spread,
      drawn: reading.cards,
      question: reading.question,
      profile: db.profile,
      lexicon: db.lexicon,
      pastReadings: db.readings.filter((r) => r.id !== reading.id && r.status === 'complete'),
      voice,
      readingIndex: db.readings.filter((r) => r.status === 'complete').length,
    });
    const interpretation = formatInterpretationText(it);
    reply(interpretation, userText, { interpretation });
  }

  // A saved draft already has its last prompt or interpretation in the transcript.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (messages.length > 0 || delivered) return;
    if (!reading.question.trim()) {
      deliverInterpretation();
      return;
    }
    const firstPrompt = flow?.steps[0];
    if (firstPrompt) {
      reply(firstPrompt.reader_says, undefined, { nextPromptIndex: 1 });
    } else {
      deliverInterpretation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');

    if (!delivered && spread && requestsInterpretation(text)) {
      deliverInterpretation(text);
      return;
    }

    // Did the user ask the reader to remember a meaning for a card?
    const remember = detectRememberRequest(text, reading.cards);
    if (remember) {
      const card = getCard(remember.cardId);
      savePersonalMeaning(
        remember.cardId,
        remember.meaning,
        `Remembered — ${card?.name ?? 'that card'} is now "${remember.meaning}" in your lexicon. It will read that way from here on, until you change it.`,
        text,
      );
      return;
    }

    const prompt = flow?.steps[nextPromptIndex];
    if (!delivered && prompt) {
      reply(prompt.reader_says, text, { nextPromptIndex: nextPromptIndex + 1 });
      return;
    }
    if (!delivered && spread) {
      deliverInterpretation(text);
      return;
    }
    const acks = ACKS[voice];
    reply(acks[ackCount % acks.length], text);
    setAckCount(ackCount + 1);
  }

  function completeReading() {
    const suggestions = suggestMemories(reading);
    updateDb((d) => ({
      ...d,
      readings: d.readings.map((r) =>
        r.id === reading.id ? { ...r, status: 'complete' as const } : r,
      ),
      memories: [
        ...d.memories,
        ...suggestions.filter((s) => !d.memories.some((m) => m.text === s.text)),
      ],
    }));
    onDone();
  }

  function savePersonalMeaning(cardId: string, text: string, response: string, userText?: string) {
    const turn = messagesForReply(response, userText);
    const at = nowIso();
    updateDb((d) => {
      const entry = d.lexicon[cardId] ?? { cardId, personalAssociations: [] };
      return {
        ...d,
        chat: [...d.chat, ...turn],
        lexicon: {
          ...d.lexicon,
          [cardId]: {
            ...entry,
            personalMeaning: text,
            personalAssociations: [...entry.personalAssociations, { text, at }],
          },
        },
      };
    });
  }

  function rememberMeaning(cardId: string) {
    const text = (rememberText[cardId] ?? '').trim();
    if (!text) return;
    savePersonalMeaning(cardId, text, `Noted — I will remember that meaning for ${getCard(cardId)?.name}.`);
    setRememberText((r) => ({ ...r, [cardId]: '' }));
  }

  const vp = voiceProfile(voice);

  return (
    <div>
      <div className="row space-between">
        <button className="ghost" onClick={onBack}>
          ← Back to the table
        </button>
        <div className="row">
          <label htmlFor="chat-reader-voice" style={{ margin: 0 }}>Reader:</label>
          <select
            id="chat-reader-voice"
            value={voice}
            onChange={(e) => setVoice(e.target.value as VoiceId)}
            style={{ width: 'auto' }}
          >
            <option value="familiar">The Familiar</option>
            <option value="mystic">The Mystic</option>
            <option value="interpreter">The Interpreter</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h2>
          {reading.spreadName}
          {reading.question ? <span className="muted"> — “{reading.question}”</span> : ''}
        </h2>
        <p className="small muted">{vp.tone}</p>
        <SpreadCards cards={reading.cards} deck={readingDeck(reading)} />

        <div className="chat" role="log" aria-label="Reading conversation">
          {messages.map((m) => (
            <div key={m.id} className={`chat-msg ${m.role}`}>
              <strong className="chat-speaker">{m.role === 'reader' ? 'Reader' : 'You'}</strong>
              {m.text}
            </div>
          ))}
        </div>

        <div className="chat-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder="Talk to the reader…"
            aria-label="Talk to the reader"
          />
          <button className="primary" onClick={send}>
            Send
          </button>
        </div>
        {!delivered && spread && (
          <div className="row" style={{ marginTop: '0.5rem' }}>
            <button className="ghost" onClick={() => deliverInterpretation()}>
              Read the cards
            </button>
          </div>
        )}
      </div>

      {delivered && (
        <div className="card">
          <h3>Make it yours</h3>
          <p className="small muted">
            If a card means something of your own to you, tell the reader and it will remember —
            that meaning becomes part of your lexicon. You can also just type it in chat, e.g.
            “remember the Star means hope after a long night for me”.
          </p>
          {reading.cards.map((d) => {
            const card = getCard(d.cardId);
            const entry = db.lexicon[d.cardId];
            return (
              <div key={d.position} style={{ marginBottom: '0.8rem' }}>
                <label htmlFor={`remember-${d.cardId}`}>
                  {card?.name}
                  {entry?.personalMeaning ? ` — yours: “${entry.personalMeaning}”` : ''}
                </label>
                <div className="chat-input-row">
                  <input
                    id={`remember-${d.cardId}`}
                    value={rememberText[d.cardId] ?? ''}
                    onChange={(e) =>
                      setRememberText((r) => ({ ...r, [d.cardId]: e.target.value }))
                    }
                    placeholder={`What does ${card?.name} mean to you?`}
                  />
                  <button onClick={() => rememberMeaning(d.cardId)}>Remember</button>
                </div>
              </div>
            );
          })}
          <div className="row" style={{ marginTop: '1rem' }}>
            <button className="primary" onClick={completeReading}>
              Complete this reading
            </button>
            <span className="small muted">
              Completing saves it to the archive and suggests memories for you to confirm.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
