# P0-3: Silent save failures (quota, private mode)

**Priority:** P0 — silent data loss
**Area:** persistence

## Problem

Every write goes through `updateDb` in
[App.tsx](C:\Users\mabbi\dev\the-living-tarot\client\src\App.tsx:65), which
fires `void store.save(next)` with no error handling. `localStorage.setItem`
throws on quota exhaustion (large reading histories + base64-free but growing
JSON) and in some private-mode configurations. The user keeps interacting with
in-memory state that will be gone on reload, with no indication.

## Repro

1. Fill storage near quota (or simulate by stubbing `setItem` to throw).
2. Complete a reading. UI shows "Reading saved".
3. Reload. The reading is gone.

## Acceptance criteria

- [ ] `StoreAdapter.save` failures surface to the UI: a persistent banner
  ("Couldn't save your latest changes — storage is full or blocked") that
  stays until a save succeeds.
- [ ] While a save has failed, navigation away from unsaved work warns first
  (or at minimum the banner names what's at risk: readings vs profile).
- [ ] `updateDb` awaits save outcome instead of fire-and-forget; in-memory
  state is still updated optimistically so the app stays responsive.
- [ ] Unit test: failing `save` triggers the error state; succeeding `save`
  clears it.

## Test plan

- Stub `localStorage.setItem` to throw `QuotaExceededError`; assert banner
  appears and no data is silently discarded from memory.
- Restore `setItem`; assert banner clears after next successful save.
