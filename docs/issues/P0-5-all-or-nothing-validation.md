# P0-5: All-or-nothing DB validation drops everything on one bad item

**Priority:** P0 — data loss
**Area:** persistence

## Problem

`isDb` in [store.ts](C:\Users\mabbi\dev\the-living-tarot\client\src\lib\store.ts:28)
only checks that top-level collections exist and are arrays. It does not
validate item shape — so one malformed reading (e.g. from a future version, a
bad restore, or manual editing) either crashes render downstream or, combined
with P0-1, wipes the whole DB on load.

## Acceptance criteria

- [ ] Per-item validators for `readings`, `chat`, `memories`, `journal`, and
  `lexicon` entries; invalid items are dropped and counted, valid items load.
- [ ] Dropped-item count is reported to the user ("3 saved items couldn't be
  read and were set aside") with the set-aside payload quarantined for
  inspection (same mechanism as P0-1).
- [ ] `readingSetup` validation (already exists via `isReadingSetup`) is kept
  and covered by the same reporting.
- [ ] Unit test: DB with 2 valid + 1 malformed reading loads 2 readings,
  quarantines the bad one, and reports the count.

## Test plan

- Fixtures with each collection containing one malformed item; assert the rest
  loads and counts are correct.
- Fixture where every item is malformed; assert clean empty DB + quarantine,
  no exception.
