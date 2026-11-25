import { describe, expect, it } from 'vitest';
import { LocalStorageStore, emptyDb, migrate } from './store';

// Minimal localStorage mock so these run in the node environment too.
const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => { data.set(k, String(v)); },
    removeItem: (k: string) => { data.delete(k); },
    clear: () => { data.clear(); },
  },
  configurable: true,
});

const KEY = 'living-tarot-db-v1';
const quarantineKeys = () => [...data.keys()].filter((k) => k.startsWith(`${KEY}.corrupt-`));

describe('LocalStorageStore corruption handling', () => {
  it('quarantines malformed JSON and starts clean with the flag set', async () => {
    data.clear();
    data.set(KEY, '{broken json');
    const store = new LocalStorageStore(KEY);
    expect(await store.load()).toEqual(emptyDb());
    expect(store.recoveredFromCorruptStorage()).toBe(true);
    expect(quarantineKeys()).toHaveLength(1);
    expect(data.get(quarantineKeys()[0])).toBe('{broken json');
  });

  it('quarantines valid JSON with the wrong shape', async () => {
    data.clear();
    data.set(KEY, JSON.stringify({ readings: 'nope' }));
    const store = new LocalStorageStore(KEY);
    expect(await store.load()).toEqual(emptyDb());
    expect(store.recoveredFromCorruptStorage()).toBe(true);
    expect(quarantineKeys()).toHaveLength(1);
  });

  it('never overwrites the quarantine copy on reload or save', async () => {
    data.clear();
    data.set(KEY, '{broken json');
    const store = new LocalStorageStore(KEY);
    await store.load();
    await store.load();
    expect(quarantineKeys()).toHaveLength(1);
    const before = data.get(quarantineKeys()[0]);
    await store.save({ ...emptyDb(), hasStarted: true });
    expect(data.get(quarantineKeys()[0])).toBe(before);
    expect((await store.load()).hasStarted).toBe(true);
    expect(store.recoveredFromCorruptStorage()).toBe(false);
  });

  it('migrates a v0 payload with all user content intact', async () => {
    data.clear();
    const v0 = {
      profile: { name: 'June' },
      hasStarted: true,
      readings: [{ id: 'r1' }],
      lexicon: { 'the-fool': {} },
      memories: [{ id: 'm1' }],
      chat: [],
      journal: [],
    };
    const migrated = migrate(v0);
    expect(migrated.version).toBe(1);
    expect(migrated.profile).toEqual({ name: 'June' });
    expect(migrated.readings).toHaveLength(1);
    expect(migrated.memories).toHaveLength(1);
    // And through the store: v0 on disk loads with content intact, no flag.
    data.set(KEY, JSON.stringify(v0));
    const store = new LocalStorageStore(KEY);
    const loaded = await store.load();
    expect(loaded.version).toBe(1);
    expect(loaded.profile).toEqual({ name: 'June' });
    expect(store.recoveredFromCorruptStorage()).toBe(false);
    expect(quarantineKeys()).toHaveLength(0);
  });

  it('quarantines unknown future versions instead of force-migrating', async () => {
    data.clear();
    data.set(KEY, JSON.stringify({ ...emptyDb(), version: 999 }));
    const store = new LocalStorageStore(KEY);
    expect(await store.load()).toEqual(emptyDb());
    expect(store.recoveredFromCorruptStorage()).toBe(true);
    expect(quarantineKeys()).toHaveLength(1);
  });

  it('loads healthy data with no quarantine and no flag', async () => {
    data.clear();
    const store = new LocalStorageStore(KEY);
    await store.save({ ...emptyDb(), hasStarted: true });
    expect((await store.load()).hasStarted).toBe(true);
    expect(store.recoveredFromCorruptStorage()).toBe(false);
    expect(quarantineKeys()).toHaveLength(0);
  });
});
