// export.ts — "Take your history with you".
//
// Both downloads are generated on-device from the loaded Db (the
// localStorage store). Nothing is sent anywhere: the files are built in the
// browser and saved through a plain anchor download.
//
// The JSON backup is the complete history, machine-readable. The plain-text
// copy is the same history in a form a person can read straight through.
// Both cover every reading (spread, cards with positions and position
// meanings, interpretation, conversation, reflection), all personal Lexicon
// meanings and signifiers, every Life Memory, and all Symbol Journal
// entries.

import { getCard } from './knowledge';
import { DECKS, readingDeck } from './decks';
import type { ChatMessage, Db, LexiconEntry, MemoryItem, Reading } from './types';

const APP_NAME = 'The Living Tarot';

function dateStamp(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fileName(kind: 'json' | 'txt'): string {
  return `living-tarot-history-${dateStamp(new Date())}.${kind}`;
}

function displayDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function displayDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

function cardName(cardId: string): string {
  return getCard(cardId)?.name ?? cardId;
}

function sorted<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** A lexicon entry only counts if the user actually added something to it. */
export function hasLexiconContent(entry: LexiconEntry): boolean {
  return Boolean(
    entry.personalMeaning ||
      entry.personalAssociations.length > 0 ||
      entry.signifier,
  );
}

/** Complete machine-readable backup of the whole history. */
export function buildJsonBackup(db: Db): string {
  const backup = {
    app: APP_NAME,
    format: 'living-tarot-history-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: db,
  };
  return JSON.stringify(backup, null, 2);
}

function signifierLine(entry: LexiconEntry): string | null {
  const s = entry.signifier;
  if (!s) return null;
  const kind =
    s.kind === 'self'
      ? 'You'
      : s.kind === 'other'
        ? 'Someone else'
        : s.kind === 'relationship'
          ? 'A relationship'
          : s.kind === 'period'
            ? 'A life period'
            : 'A situation';
  return `Signifier (${kind}): ${s.label}${s.temporary ? ' — temporary' : ' — ongoing'}`;
}

function readingText(r: Reading, conversation: ChatMessage[]): string {
  const lines: string[] = [];
  lines.push(`${r.spreadName} — ${displayDate(r.createdAt)}${r.status === 'draft' ? ' (unfinished)' : ''}`);
  if (r.physicalDeck) lines.push('Drawn from your physical deck.');
  if (r.deckId) lines.push(`Deck: ${DECKS[readingDeck(r)]}`);
  if (r.question) lines.push(`Question: ${r.question}`);
  lines.push('');
  lines.push('Cards:');
  for (const c of r.cards) {
    const name = cardName(c.cardId);
    lines.push(
      `- ${c.positionLabel} — ${name}${c.reversed ? ' (reversed)' : ''}`,
    );
    if (c.positionMeaning) lines.push(`  What this position asks: ${c.positionMeaning}`);
  }
  if (r.interpretation) {
    lines.push('');
    lines.push('Interpretation:');
    lines.push(r.interpretation);
  }
  if (r.personalizedGuidance) {
    lines.push('', 'Personalized guidance:', r.personalizedGuidance);
  }
  if (conversation.length > 0) {
    lines.push('');
    lines.push('Conversation:');
    for (const m of conversation) {
      lines.push(`${m.role === 'reader' ? 'Reader' : 'You'}: ${m.text}`);
    }
  }
  if (r.reflections.length > 0) {
    lines.push('');
    lines.push('Reflections — what actually happened:');
    for (const ref of r.reflections) {
      lines.push(`- ${ref.text} (${displayDay(ref.at)})`);
    }
  }
  return lines.join('\n');
}

function lexiconText(db: Db): string {
  const entries = Object.values(db.lexicon).filter(hasLexiconContent);
  if (entries.length === 0) return 'No personal meanings or signifiers yet.';
  const lines: string[] = [];
  for (const entry of entries) {
    lines.push(cardName(entry.cardId));
    if (entry.personalMeaning) lines.push(`  Your meaning: ${entry.personalMeaning}`);
    const sig = signifierLine(entry);
    if (sig) lines.push(`  ${sig}`);
    for (const a of entry.personalAssociations) {
      lines.push(`  Association (${displayDay(a.at)}): ${a.text}`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

function memoryText(m: MemoryItem): string {
  const bits = [
    m.timeframe === 'current' ? 'current' : 'past',
    m.kind,
    m.status,
    `confidence: ${m.confidence}`,
    `source: ${m.source}`,
  ].join(' · ');
  return `- ${m.text} (${bits})`;
}

/** The same history as readable plain text. */
export function buildTextExport(db: Db): string {
  const out: string[] = [];
  out.push(`${APP_NAME.toUpperCase()} — YOUR HISTORY`);
  out.push(`Exported ${new Date().toLocaleString()}`);
  out.push('');
  out.push('='.repeat(60));
  out.push('');

  if (db.profile) {
    out.push('ABOUT YOU');
    out.push('');
    if (db.profile.name) out.push(`Name: ${db.profile.name}`);
    if (db.profile.lifeContext) out.push(`Life context: ${db.profile.lifeContext}`);
    if (db.profile.people) out.push(`People: ${db.profile.people}`);
    if (db.profile.goals) out.push(`Goals: ${db.profile.goals}`);
    if (db.profile.concerns) out.push(`Concerns: ${db.profile.concerns}`);
    if (db.profile.themes.length > 0) {
      out.push(`Themes: ${db.profile.themes.join(', ')}`);
    }
    out.push('');
    out.push('='.repeat(60));
    out.push('');
  }

  out.push(`READINGS (${db.readings.length})`);
  out.push('');
  if (db.readings.length === 0) {
    out.push('No readings yet.');
  } else {
    const sortedReadings = sorted(db.readings);
    sortedReadings.forEach((r, i) => {
      const conversation = db.chat
        .filter((m) => m.readingId === r.id)
        .sort((a, b) => a.at.localeCompare(b.at));
      out.push(`${i + 1}. ${readingText(r, conversation)}`);
      out.push('');
      out.push('-'.repeat(60));
      out.push('');
    });
  }
  out.push('='.repeat(60));
  out.push('');

  out.push('YOUR LEXICON — PERSONAL MEANINGS AND SIGNIFIERS');
  out.push('');
  out.push(lexiconText(db));
  out.push('');
  out.push('='.repeat(60));
  out.push('');

  out.push(`LIFE MEMORIES (${db.memories.length})`);
  out.push('');
  if (db.memories.length === 0) {
    out.push('No life memories recorded yet.');
  } else {
    for (const m of sorted(db.memories)) {
      out.push(memoryText(m));
    }
  }
  out.push('');
  out.push('='.repeat(60));
  out.push('');

  out.push(`SYMBOL JOURNAL (${db.journal.length})`);
  out.push('');
  if (db.journal.length === 0) {
    out.push('No journal entries yet.');
  } else {
    const sortedJournal = [...db.journal].sort((a, b) => a.at.localeCompare(b.at));
    for (const j of sortedJournal) {
      const cards = j.cardIds.map(cardName).join(', ');
      out.push(`- ${displayDay(j.at)}: ${j.text}${cards ? ` (cards: ${cards})` : ''}`);
    }
  }
  out.push('');
  return out.join('\n');
}

/** Trigger a browser download of generated text. No network involved. */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadJsonBackup(db: Db): void {
  downloadTextFile(fileName('json'), buildJsonBackup(db), 'application/json');
}

export function downloadTextHistory(db: Db): void {
  downloadTextFile(fileName('txt'), buildTextExport(db), 'text/plain');
}
