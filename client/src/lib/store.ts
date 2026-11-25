// store.ts — the single data layer.
// Every read and write in the app goes through a StoreAdapter. V1 ships a
// localStorage adapter. The Supabase/PostgreSQL adapter later implements the
// same interface, so no reading, lexicon, or chat code has to change.
//
// The interface is async on purpose: localStorage is synchronous, but a
// remote store is not, and the app is written against the async shape from
// the start.

import type { Db } from './types';

export interface StoreAdapter {
  load(): Promise<Db>;
  save(db: Db): Promise<void>;
}

export function emptyDb(): Db {
  return {
    profile: null,
    readings: [],
    lexicon: {},
    memories: [],
    chat: [],
    journal: [],
  };
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

export class LocalStorageStore implements StoreAdapter {
  constructor(private key = 'living-tarot-db-v1') {}

  async load(): Promise<Db> {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return emptyDb();
      const parsed: unknown = JSON.parse(raw);
      if (!isDb(parsed)) return emptyDb();
      // Older versions could leave a transcript behind when deleting a reading.
      const readingIds = new Set(parsed.readings.map((reading) => reading.id));
      const chat = parsed.chat.filter((message) => readingIds.has(message.readingId));
      return { ...emptyDb(), ...parsed, chat };
    } catch {
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
