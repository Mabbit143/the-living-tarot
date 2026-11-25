# P0-1: Corrupt localStorage wipes user history

**Priority:** P0 — data loss
**Area:** persistence

## Problem

`LocalStorageStore.load()` returns a blank DB when the stored JSON fails to
parse. The next `updateDb` call then saves that blank DB over the corrupt key,
permanently destroying the user's readings, lexicon, memories, and journal.

See [store.ts](C:\Users\mabbi\dev\the-living-tarot\client\src\lib\store.ts:60)
(`load` catch-all) and [App.tsx](C:\Users\mabbi\dev\the-living-tarot\client\src\App.tsx:65)
(`void store.save(next)` unconditionally persists whatever is in memory).

## Repro

1. Open the app, complete one reading.
2. In DevTools, overwrite `living-tarot-db-v1` with `{broken json`.
3. Reload. App starts blank ("Lighting the candles…" then empty state).
4. Perform any action that triggers `updateDb`. Original data is now
   unrecoverable — the corrupt string was never preserved.

## Acceptance criteria

- [x] On parse failure, the raw corrupt string is preserved under
  `living-tarot-db-v1.corrupt-<ISO-date>` before anything else is written.
  (LocalStorageStore.quarantine; identical content stored once.)
- [x] The app starts with a clean DB but shows a recoverable notice
  ("Your saved data couldn't be read — a copy was kept for recovery").
- [x] No save ever overwrites the quarantined copy.
- [x] Unit test: corrupt input produces quarantined copy + clean DB, and a
  subsequent save does not touch the quarantine key.
  (`client/src/lib/store.test.ts`; behavior-harness verified, vitest green
  on owner machine 2026-11-25.)

## Test plan

- New test for `LocalStorageStore.load` with malformed JSON, valid JSON, and
  valid-JSON-wrong-shape inputs. Assert quarantine behavior and return values.
