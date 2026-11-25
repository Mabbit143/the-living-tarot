# P0-2: No schema versioning or migration for stored data

**Priority:** P0 — future data loss
**Area:** persistence

## Problem

The stored `Db` has no `version` field and `load()` has no migration path (see
[store.ts](C:\Users\mabbi\dev\the-living-tarot\client\src\lib\store.ts:17) and
[types.ts](C:\Users\mabbi\dev\the-living-tarot\client\src\lib\types.ts:108)).
Any future shape change (new required field, renamed key) will either crash old
clients or silently drop user data on first write.

## Acceptance criteria

- [ ] `Db` carries a `version: number` (start at `1`).
- [ ] `load()` runs stored data through a `migrate(raw) -> Db` function that
  upgrades older versions and fills new fields with documented defaults.
- [ ] Unknown future versions are quarantined (same mechanism as P0-1), never
  force-migrated.
- [ ] Unit test: a v0 payload (no version field, i.e. today's shape) migrates
  to v1 with all existing user content intact.

## Test plan

- Fixture of the current production shape migrates cleanly.
- Fixture with an unknown version (e.g. `999`) is quarantined, not loaded.
