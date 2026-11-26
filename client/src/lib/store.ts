// store.ts — the single data layer.
// Every read and write in the app goes through a StoreAdapter. V1 ships a
// localStorage adapter. The Supabase/PostgreSQL adapter later implements the
// same interface, so no reading, lexicon, or chat code has to change.
//
// The interface is async on purpose: localStorage is synchronous, but a
// remote store is not, and the app is written against the async shape from
// the start.

import type { CardSelection, Db, ReadingSetup } from './types';
import { DB_VERSION, nowIso } from './types';

export interface StoreAdapter {
  load(): Promise<Db>;
  save(db: Db): Promise<void>;
  /** True when the most recent load recovered from quarantined storage. */
  recoveredFromCorruptStorage?: () => boolean;
}

export function emptyDb(): Db {
  return {
    version: DB_VERSION,
    profile: null,
    readings: [],
    lexicon: {},
    memories: [],
    chat: [],
    journal: [],
  };
}

/** Remove a reading and every chat message tied to it. An unknown id
 *  returns the database unchanged. */
export function deleteReading(db: Db, id: string): Db {
  if (!db.readings.some((reading) => reading.id === id)) return db;
  return {
    ...db,
    readings: db.readings.filter((reading) => reading.id !== id),
    chat: db.chat.filter((message) => message.readingId !== id),
  };
}

/** Upgrade stored data to the current shape. v0 (no version field, i.e. the
 *  shape shipped before versioning) gains `version: 1` with documented
 *  defaults for newer optional fields. Unknown future versions throw so the
 *  caller quarantines them instead of force-migrating. */
export function migrate(raw: unknown): Db {
  if (typeof raw !== 'object' || raw === null) throw new Error('stored value is not a reading database');
  const data = raw as Record<string, unknown> & Partial<Db>;
  if (data.version !== undefined && data.version !== DB_VERSION) {
    throw new Error(`unsupported database version ${String(data.version)}`);
  }
  const base = { ...emptyDb(), ...data, version: DB_VERSION };
  if (!isDb(base)) throw new Error('stored value is not a reading database');
  return base;
}

function isDb(v: unknown): v is Db {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Record<string, unknown>;
  return (
    Array.isArray(d.readings) &&
    Array.isArray(d.memories) &&
    Array.isArray(d.chat) &&
    Array.isArray(d.journal) &&
    typeof d.lexicon === 'object' &&
    d.lexicon !== null
  );
}

function isCardSelection(value: unknown): value is CardSelection {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<CardSelection>;
  return typeof card.cardId === 'string' && typeof card.reversed === 'boolean';
}

function isReadingSetup(value: unknown): value is ReadingSetup {
  if (!value || typeof value !== 'object') return false;
  const setup = value as Partial<ReadingSetup>;
  return typeof setup.question === 'string' && typeof setup.spreadName === 'string'
    && (setup.mode === 'draw' || setup.mode === 'physical')
    && Array.isArray(setup.drawn) && setup.drawn.every(isCardSelection)
    && Boolean(setup.physical && typeof setup.physical === 'object' && !Array.isArray(setup.physical)
      && Object.values(setup.physical).every(isCardSelection));
}

export class LocalStorageStore implements StoreAdapter {
  private recovered = false;

  constructor(private key = 'living-tarot-db-v1') {}

  recoveredFromCorruptStorage(): boolean {
    return this.recovered;
  }

  /** Preserve an unreadable payload under a quarantine key before anything
   *  else is written. Never overwrites: identical content is stored once. */
  private quarantine(raw: string): void {
    const prefix = `${this.key}.corrupt-`;
    for (let i = 0; i < localStorage.length; i += 1) {
      const name = localStorage.key(i);
      if (name?.startsWith(prefix) && localStorage.getItem(name) === raw) return;
    }
    localStorage.setItem(`${prefix}${nowIso()}`, raw);
  }

  async load(): Promise<Db> {
    this.recovered = false;
    const raw = localStorage.getItem(this.key);
    if (!raw) return emptyDb();
    try {
      const parsed = migrate(JSON.parse(raw));
      // Older versions could leave a transcript behind when deleting a reading.
      const readingIds = new Set(parsed.readings.map((reading) => reading.id));
      const chat = parsed.chat.filter((message) => readingIds.has(message.readingId));
      const readingSetup = isReadingSetup(parsed.readingSetup) ? parsed.readingSetup : undefined;
      return { ...emptyDb(), ...parsed, chat, readingSetup };
    } catch {
      this.quarantine(raw);
      this.recovered = true;
      return emptyDb();
    }
  }

  async save(db: Db): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(db));
  }
}

/** The store the app uses. Swap this for the Supabase adapter when the
 * backend exists; nothing else in the app needs to change. */
export const store: StoreAdapter = new LocalStorageStore();
