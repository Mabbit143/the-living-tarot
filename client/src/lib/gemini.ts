import { personalAssociation, sharedTopics } from './readingContext';
import type { ChatMessage, Db, Reading, VoiceId } from './types';

const keyEndpoint = '/api/reader/gemini-key';

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
  const memories = db.geminiSavedContext
    ? db.memories.filter((memory) => memory.status === 'confirmed' && sharedTopics(context, memory.text).length >= 2)
      .slice(0, 2).map((memory) => memory.text.slice(0, 500))
    : [];
  const chat = messages.filter((turn) => turn.role === 'user' || turn.gemini === 'current-reading'
    || (db.geminiSavedContext && turn.gemini === 'with-saved-context'));
  const response = await fetch('/api/reader/gemini', {
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
    }),
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Gemini reader unavailable.');
  }
  const data = await response.json();
  if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('Gemini returned an empty reading.');
  return data.text;
}
