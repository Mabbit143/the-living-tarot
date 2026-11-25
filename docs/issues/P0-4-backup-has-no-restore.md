# P0-4: Backup export has no matching import/restore

**Priority:** P0 — recovery gap
**Area:** persistence, Archive

## Problem

[export.ts](C:\Users\mabbi\dev\the-living-tarot\client\src\lib\export.ts:56)
produces a complete JSON backup and a plain-text copy, but there is no way to
restore from them. If P0-1 or P0-3 bites (or the user switches browsers), the
"take your history with you" promise is one-way: the backup file exists but the
app cannot read it back.

## Acceptance criteria

- [ ] Archive gains "Restore from JSON backup": file picker → validate →
  confirm (shows reading count, export date) → replace current DB.
- [ ] Current DB is auto-quarantined (same mechanism as P0-1) before restore
  replaces it, so a bad backup file can't destroy good data.
- [ ] Backup payload gains `{ format, version }` check — reject files that
  aren't `living-tarot-history-backup` with a human-readable error.
- [ ] Malformed backup file shows which check failed, never half-imports
  (validate fully, then commit, single `updateDb`).
- [ ] Unit test: round-trip `buildJsonBackup(db) -> import` preserves readings,
  lexicon, memories, journal, and reflections byte-for-byte.

## Test plan

- Export from a seeded DB, restore into a fresh profile, diff all collections.
- Restore with a truncated file, a wrong-format JSON file, and a future
  `version` — each must fail cleanly with the current DB untouched.
