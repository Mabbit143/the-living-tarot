# P1-1: Reflection draft is shared across readings, can save under the wrong entry

**Priority:** P1 — wrong-reading save
**Area:** Archive reflections

## Problem

`Archive` keeps one `reflection` string for every entry. Switching the open
entry carries the typed text along, and `addReflection` saves it under
whatever entry is selected at save time.

See [Archive.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/Archive.tsx:21)
(shared `reflection` state),
[Archive.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/Archive.tsx:33)
(`addReflection` uses the live `selectedId`), and
[Archive.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/Archive.tsx:177)
(the single input bound to that shared state).

Critique evidence: a reviewer typed an unsaved note in synthetic reading B,
opened A, and saved the carried-over text under A.
Snapshot: [critique 2026-11-25](/C:/Users/mabbi/dev/the-living-tarot/.impeccable/critique/2026-11-25T12-29-54Z__client-src-components-readingtable-tsx.md).

## Repro

1. Open Archive with two readings, A and B.
2. Open B, type a reflection, do not save.
3. Open A. The typed text is still in the box.
4. Press **Add reflection**. The note lands on A.

## Acceptance criteria

- [ ] Drafts are keyed by reading id: switching entries preserves each
  entry's own unsaved text independently.
- [ ] The save control identifies its destination (e.g. the entry it will
  attach to), so a carried-over draft cannot silently land elsewhere.
- [ ] Deleting a reading discards that reading's draft; other drafts survive.
- [ ] Saving clears only the saved entry's draft.

## Test plan

- Component test: type a draft under reading B, switch to A, assert A's box
  is empty and B's draft is intact; save under A and assert the note is on A
  only.
- Regression test for delete: draft on B survives deleting A.
