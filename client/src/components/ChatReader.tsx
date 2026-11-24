import { useEffect, useRef, useState } from 'react';
import {
  QUESTION_TYPES,
  flowForSpread,
  getCard,
  getSpread,
  voiceProfile,
} from '../lib/knowledge';
import { buildInterpretation, detectRememberRequest, formatInterpretationText } from '../lib/reader';
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
  const [stepIdx, setStepIdx] = useState(1);
  const [delivered, setDelivered] = useState(false);
  const [rememberText, setRememberText] = useState<Record<string, string>>({});
  const [ackCount, setAckCount] = useState(0);
  const startedRef = useRef(false);

  const messages: ChatMessage[] = db.chat
    .filter((m) => m.readingId === reading.id)
    .sort((a, b) => a.at.localeCompare(b.at));

  function pushReader(text: string) {
    const msg: ChatMessage = { id: newId(), readingId: reading.id, role: 'reader', text, at: nowIso() };
    updateDb((d) => ({ ...d, chat: [...d.chat, msg] }));
  }

  function pushUser(text: string) {
    const msg: ChatMessage = { id: newId(), readingId: reading.id, role: 'user', text, at: nowIso() };
    updateDb((d) => ({ ...d, chat: [...d.chat, msg] }));
  }

  function deliverInterpretation() {
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
    pushReader(formatInterpretationText(it));
    setDelivered(true);
    updateDb((d) => ({
      ...d,
      readings: d.readings.map((r) =>
        r.id === reading.id ? { ...r, interpretation: formatInterpretationText(it) } : r,
      ),
    }));
  }

  // Seed the conversation on first open; resume straight to the
  // interpretation if this draft already has chat history.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (messages.length === 0 && flow) {
      pushReader(flow.steps[0].reader_says);
    } else if (!reading.interpretation) {
      deliverInterpretation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    pushUser(text);

    // Did the user ask the reader to remember a meaning for a card?
    const remember = detectRememberRequest(text, reading.cards);
    if (remember) {
      const card = getCard(remember.cardId);
      updateDb((d) => {
        const entry = d.lexicon[remember.cardId] ?? { cardId: remember.cardId, personalAssociations: [] };
        return {
          ...d,
          lexicon: {
            ...d.lexicon,
            [remember.cardId]: {
              ...entry,
              personalMeaning: remember.meaning,
              personalAssociations: [...entry.personalAssociations, { text: remember.meaning, at: nowIso() }],
            },
          },
        };
      });
      pushReader(
        `Remembered — ${card?.name ?? 'that card'} is now "${remember.meaning}" in your lexicon. It will read that way from here on, until you change it.`,
      );
      return;
    }

    if (flow && stepIdx < flow.steps.length) {
      pushReader(flow.steps[stepIdx].reader_says);
      setStepIdx(stepIdx + 1);
      return;
    }
    if (!delivered) {
      deliverInterpretation();
      return;
    }
    const acks = ACKS[voice];
    pushReader(acks[ackCount % acks.length]);
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

  function rememberMeaning(cardId: string) {
    const text = (rememberText[cardId] ?? '').trim();
    if (!text) return;
    updateDb((d) => {
      const entry = d.lexicon[cardId] ?? { cardId, personalAssociations: [] };
      return {
        ...d,
        lexicon: {
          ...d.lexicon,
          [cardId]: {
            ...entry,
            personalMeaning: text,
            personalAssociations: [...entry.personalAssociations, { text, at: nowIso() }],
          },
        },
      };
    });
    setRememberText((r) => ({ ...r, [cardId]: '' }));
    pushReader(`Noted — I will remember that meaning for ${getCard(cardId)?.name}.`);
  }

  const vp = voiceProfile(voice);
  const followUp =
    QUESTION_TYPES[Math.floor(messages.length / 2) % QUESTION_TYPES.length]?.example_questions[0];

  return (
    <div>
      <div className="row space-between">
        <button className="ghost" onClick={onBack}>
          ← Back to the table
        </button>
        <div className="row">
          <label style={{ margin: 0 }}>Reader:</label>
          <select
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
        <div className="card-grid" style={{ marginBottom: '0.5rem' }}>
          {reading.cards.map((d) => {
            const card = getCard(d.cardId);
            return (
              <div key={d.position} className={`tarot-card${d.reversed ? ' reversed' : ''}`}>
                <span className="position">{d.positionLabel}</span>
                <span className="name">{card?.name}</span>
              </div>
            );
          })}
        </div>

        <div className="chat">
          {messages.map((m) => (
            <div key={m.id} className={`chat-msg ${m.role}`}>
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
          />
          <button className="primary" onClick={send}>
            Send
          </button>
        </div>
        {followUp && (
          <p className="small muted" style={{ marginTop: '0.5rem' }}>
            A question to sit with: {followUp}
          </p>
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
                <label>
                  {card?.name}
                  {entry?.personalMeaning ? ` — yours: “${entry.personalMeaning}”` : ''}
                </label>
                <div className="chat-input-row">
                  <input
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
