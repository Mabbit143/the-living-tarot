# P2-1: Voice selector does not say it applies to future replies only

**Priority:** P2 — misleading control
**Area:** Reader voice

## Problem

The `Reader:` select sits next to a delivered interpretation, but switching
from The Familiar to The Mystic leaves the displayed interpretation in
place — the control only affects subsequent replies. Nothing says so.

See [ChatReader.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/ChatReader.tsx:248)
(the `Reader:` label + select) and
[ChatReader.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/ChatReader.tsx:100)
(voice passed to follow-up replies, not the delivered reading).

Snapshot: [critique 2026-11-25](/C:/Users/mabbi/dev/the-living-tarot/.impeccable/critique/2026-11-25T12-29-54Z__client-src-components-readingtable-tsx.md).

## Repro

1. Complete a reading with The Familiar.
2. Switch the selector to The Mystic.
3. The displayed interpretation is unchanged, with no note about what the
   switch affected.

## Acceptance criteria

- [ ] Either the control is labeled for future replies (e.g. "Voice for
  follow-ups"), or voice selection happens before the reading starts.
- [ ] Switching voice after delivery never implies the shown interpretation
  was rewritten.

## Test plan

- Manual pass: switch voice post-delivery, confirm the label/explanation
  matches behavior; start a fresh reading and confirm the chosen voice
  applies from the start.
