import { personalAssociation } from './readingContext';
import { memoryCandidates, rankCandidates } from './relevance';
import type { ChatMessage, Db, Reading, VoiceId } from './types';

// Same-origin dev server by default; set VITE_TAROT_API_URL to point at the
// hosted proxy (no trailing slash) for builds that have no local server.
const apiBase = (import.meta.env.VITE_TAROT_API_URL as string | undefined ?? '').replace(/\/$/, '');
const keyEndpoint = `${apiBase}/api/reader/gemini-key`;
const readingEndpoint = `${apiBase}/api/reader/gemini`;

export async function geminiConfigured(signal?: AbortSignal): Promise<boolean> {
  const response = await fetch(keyEndpoint, { signal, cache: 'no-store' });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return false;
  return (await response.json()).configured === true;
}

export async function connectGemini(key: string): Promise<void> {
  const response = await fetch(keyEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (response.headers.get('content-type')?.includes('application/json')) {
    const result = await response.json();
    if (response.ok && result.configured === true) return;
    if (typeof result.error === 'string') throw new Error(result.error);
  }
  throw new Error('Could not reach the local Gemini connection.');
}

export async function requestGeminiReply(
  reading: Reading,
  db: Db,
  voice: VoiceId,
  messages: ChatMessage[],
  mode: 'reading' | 'follow-up',
  message: string | undefined,
  signal: AbortSignal,
): Promise<string> {
  const context = [reading.question, message].filter(Boolean).join(' ');
  // The kernel decides what the model gets told: ranked by topic overlap,
  // recency, and confirmation status — the same ordering the local reader
  // itself uses. Confirmed memories sharing at least two topics only.
  const memories = db.geminiSavedContext
    ? rankCandidates(memoryCandidates(db.memories), { question: context })
      .filter(({ candidate, topics }) => candidate.kind === 'memory' && topics.length >= 2)
      .slice(0, 2)
      .map(({ candidate }) => db.memories.find((m) => m.id === candidate.key)?.text.slice(0, 500))
      .filter((text): text is string => Boolean(text))
    : [];
  const chat = messages.filter((turn) => turn.role === 'user' || turn.gemini === 'current-reading'
    || (db.geminiSavedContext && turn.gemini === 'with-saved-context'));
  const response = await fetch(readingEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      mode,
      voice,
      spread: reading.spreadName,
      question: reading.question.slice(0, 2500),
      cards: reading.cards.map((card) => ({
        id: card.cardId,
        position: card.position,
        reversed: card.reversed,
        association: db.geminiSavedContext ? personalAssociation(db.lexicon[card.cardId])?.slice(0, 800) : undefined,
      })),
      chat: chat.slice(-6).map(({ role, text }) => ({ role, text: text.slice(0, 2400) })),
      message: message?.slice(0, 2500),
      memories,
      profileName: db.geminiSavedContext ? db.profile?.name?.trim() || undefined : undefined,
      mediumName: db.geminiSavedContext ? db.profile?.readerName?.trim() || undefined : undefined,
    }),
  });
  if (response.headers.get('content-type')?.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Gemini reader unavailable.');
    if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('Gemini returned an empty reading.');
    return data.text;
  }
  throw new Error('Gemini reader unavailable.');
}
