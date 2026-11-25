import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReadingInterpretation from './ReadingInterpretation';
import SpreadCards from './SpreadCards';
import { readingDeck } from '../lib/decks';
import { requestGeminiReply } from '../lib/gemini';
import { getCard, getSpread } from '../lib/knowledge';
import {
  buildInterpretation,
  conversationOpening,
  detectRememberRequest,
  followUpReply,
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
  onSetupReader?: () => void;
}

export default function ChatReader({ reading, db, updateDb, onDone, onBack, onSetupReader }: Props) {
  const spread = getSpread(reading.spreadName);
  const [voice, setVoice] = useState<VoiceId>(db.profile?.preferredVoice ?? 'familiar');
  const [input, setInput] = useState('');
  const [rememberText, setRememberText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [readerNotice, setReaderNotice] = useState('');
  const activeRequest = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const interpretationHeadingRef = useRef<HTMLHeadingElement>(null);
  const guidanceHeading = useRef<HTMLHeadingElement>(null);
  const hadGuidance = useRef(Boolean(reading.personalizedGuidance));

  useEffect(() => {
    if (!reading.personalizedGuidance || hadGuidance.current) return;
    hadGuidance.current = true;
    if (db.profile) setVoice(db.profile.preferredVoice);
    guidanceHeading.current?.focus();
  }, [reading.personalizedGuidance, db.profile]);

  const messages: ChatMessage[] = db.chat
    .filter((m) => m.readingId === reading.id)
    .sort((a, b) => a.at.localeCompare(b.at));
  const delivered = Boolean(reading.interpretation);
  const originalReply = delivered ? messages.find((message) => (
    message.role === 'reader' && message.text === reading.interpretation
  )) : undefined;
  const conversation = messages.filter((message) => message.id !== originalReply?.id);
  const readOnOpen = reading.firstStep ? reading.firstStep === 'read' : !reading.question.trim();
  const canSkipToReading = Boolean(!delivered && spread && messages.length > 0);
  const hasReply = Boolean(input.trim());
  const suggestions = delivered ? suggestMemories(reading) : [];
  const newSuggestionCount = suggestions.filter(
    (suggestion) => !db.memories.some((memory) => memory.text === suggestion.text),
  ).length;

  function messagesForReply(text: string, userText?: string, gemini?: ChatMessage['gemini']): ChatMessage[] {
    const fields = { readingId: reading.id, at: nowIso() };
    const reply: ChatMessage = { ...fields, id: newId(), role: 'reader', text, gemini };
    return userText
      ? [{ ...fields, id: newId(), role: 'user', text: userText }, reply]
      : [reply];
  }

  function reply(
    text: string,
    userText?: string,
    interpretation?: string,
    gemini?: ChatMessage['gemini'],
  ) {
    const turn = messagesForReply(text, userText, gemini);
    updateDb((d) => ({
      ...d,
      chat: [...d.chat, ...turn],
      readings: interpretation
        ? d.readings.map((r) => r.id === reading.id ? { ...r, interpretation } : r)
        : d.readings,
    }));
  }

  function localInterpretation(context?: string): string {
    if (!spread) return 'This spread is no longer in the catalog.';
    const pastReadings = db.readings.filter((r) => r.id !== reading.id && r.status === 'complete');
    const it = buildInterpretation({
      spread,
      drawn: reading.cards,
      question: reading.question,
      context,
      memories: db.memories,
      profile: db.profile,
      lexicon: db.lexicon,
      pastReadings,
      voice,
      readingIndex: pastReadings.length,
    });
    return formatInterpretationText(it);
  }

  async function respond(mode: 'reading' | 'follow-up', userText?: string, context?: string) {
    if (activeRequest.current) return;
    const local = () => mode === 'reading' ? localInterpretation(context)
      : followUpReply(userText ?? '', reading.cards, messages, reading.interpretation, db.lexicon, voice);
    const write = (text: string, gemini?: ChatMessage['gemini']) =>
      reply(text, userText, mode === 'reading' ? text : undefined, gemini);
    if (!db.useGeminiReader) {
      write(local());
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setReaderNotice('');
    setLoading(true);
    try {
      const message = mode === 'follow-up' ? userText : context;
      const text = await requestGeminiReply(reading, db, voice, messages, mode, message, controller.signal);
      if (!controller.signal.aborted) {
        write(text, db.geminiSavedContext ? 'with-saved-context' : 'current-reading');
      }
    } catch {
      if (!controller.signal.aborted) {
        setReaderNotice('Gemini was unavailable, so the local reader answered. You can reconnect from the Reading Table.');
        write(local());
      }
    } finally {
      if (!controller.signal.aborted) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  }

  // A saved draft already has its last prompt or interpretation in the transcript.
  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  useLayoutEffect(() => {
    if (!delivered) return;
    const heading = interpretationHeadingRef.current;
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'nearest' });
  }, [delivered]);

  useEffect(() => {
    if (messages.length > 0 || delivered) return;
    // Defer the first turn so React can discard its development-only rehearsal.
    const start = window.setTimeout(() => {
      if (readOnOpen) void respond('reading');
      else if (spread) reply(conversationOpening(reading.question, voice));
    }, 0);
    return () => window.clearTimeout(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => activeRequest.current?.abort(), []);

  function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    if (!delivered && spread && requestsInterpretation(text)) {
      void respond('reading', text);
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

    if (!delivered && spread) {
      void respond('reading', text, text);
      return;
    }
    void respond('follow-up', text);
  }

  function completeReading() {
    const createdAt = nowIso();
    const newMemories = suggestions.map((suggestion) => ({ ...suggestion, id: newId(), createdAt }));
    updateDb((d) => ({
      ...d,
      readings: d.readings.map((r) =>
        r.id === reading.id ? { ...r, status: 'complete' as const } : r,
      ),
      memories: [
        ...d.memories,
        ...newMemories.filter((s) => !d.memories.some((m) => m.text === s.text)),
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

  const cards = <SpreadCards cards={reading.cards} deck={readingDeck(reading)} />;

  return (
    <div className="reader-view">
      <div className="row space-between">
        <button className="ghost" onClick={onBack}>
          ← Back to the table
        </button>
        <div className="row">
          <label htmlFor="chat-reader-voice" style={{ margin: 0 }}>Reader:</label>
          <select
            id="chat-reader-voice"
            value={voice}
            disabled={loading}
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
        <h2 ref={headingRef} tabIndex={-1} style={{ overflowWrap: 'anywhere' }}>
          {reading.spreadName}
        </h2>
        {reading.question && <p className="reading-question muted">“{reading.question}”</p>}
        {loading && messages.length === 0 && <p className="small muted" role="status">Reading the cards…</p>}
        {delivered && (
          <>
            <ReadingInterpretation reading={reading} headingRef={interpretationHeadingRef} />
            {reading.personalizedGuidance ? (
              <section className="personalized-guidance" aria-labelledby="personalized-guidance-heading">
                <h3 id="personalized-guidance-heading" tabIndex={-1} ref={guidanceHeading}>Personalized guidance</h3>
                <p className="reading-copy">{reading.personalizedGuidance}</p>
              </section>
            ) : onSetupReader && (
              <section className="personalized-guidance" aria-labelledby="reader-setup-invitation">
                <h3 id="reader-setup-invitation">Guidance for your situation</h3>
                <p>Share a little about what’s on your mind to get a follow-up for this spread.</p>
                <button className="ghost" onClick={onSetupReader} disabled={loading}>Set up my reader</button>
              </section>
            )}
            <div className="row reading-finish">
              <button className="primary" onClick={completeReading} disabled={loading}>
                Complete this reading
              </button>
              {newSuggestionCount > 0 && (
                <span className="small muted">
                  {newSuggestionCount} memory {newSuggestionCount === 1 ? 'suggestion' : 'suggestions'} to review after completing.
                </span>
              )}
            </div>
          </>
        )}
        {delivered && reading.cards.length > 3 ? (
          <details className="reading-disclosure reader-support">
            <summary>Cards in this spread</summary>
            {cards}
          </details>
        ) : <div className={delivered ? 'reading-card-strip reader-support' : undefined}>{cards}</div>}

        <div className={delivered ? 'reader-support' : undefined}>
          {delivered && <h3>Talk about this reading</h3>}
          <div className="chat" role="log" aria-label="Reading conversation">
            {conversation.map((m) => (
              <div key={m.id} className={`chat-msg ${m.role}`}>
                <strong className="chat-speaker">{m.role === 'reader' ? 'Reader' : 'You'}</strong>
                {m.text}
              </div>
            ))}
          </div>

          {canSkipToReading && (
            <div className="row" style={{ marginBottom: '0.6rem' }}>
              <button className={hasReply ? 'ghost' : 'primary'} onClick={() => void respond('reading')} disabled={loading}>
                Read the cards
              </button>
            </div>
          )}
          <div className="chat-input-row">
            <input
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              placeholder="Talk to the reader…"
              aria-label="Talk to the reader"
            />
            <button className={!canSkipToReading || hasReply ? 'primary' : 'ghost'} onClick={send} disabled={loading || !hasReply}>
              Send
            </button>
          </div>
          {((loading && messages.length > 0) || readerNotice) && (
            <p className="small muted" role="status">
              {loading ? 'Gemini is preparing a reply…' : readerNotice}
            </p>
          )}
        </div>
      </div>

      {delivered && (
        <details className="reading-disclosure card personal-meanings">
          <summary>Add personal card meanings</summary>
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
        </details>
      )}
    </div>
  );
}
