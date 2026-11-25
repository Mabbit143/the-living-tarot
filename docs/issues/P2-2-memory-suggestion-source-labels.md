# P2-2: Memory suggestion labels overstate their source

**Priority:** P2 — trust / wording
**Area:** Life Memory suggestions

## Problem

Both suggestions are reader-derived, but their kind labels read like facts
about the user's life: a typed question becomes a *current concern*, and a
card-derived theme becomes a *current event*. The list also shows **Hide**
and **Dismiss** without explaining the difference.

See [memory.ts](/C:/Users/mabbi/dev/the-living-tarot/client/src/lib/memory.ts:12)
(question → `kind: 'concern'`),
[memory.ts](/C:/Users/mabbi/dev/the-living-tarot/client/src/lib/memory.ts:29)
(card theme → `kind: 'event'`, both `source: reading (...)`), and
[LifeMemory.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/LifeMemory.tsx:80)
(renders `kind · timeframe · source · confidence` verbatim).

Snapshot: [critique 2026-11-25](/C:/Users/mabbi/dev/the-living-tarot/.impeccable/critique/2026-11-25T12-29-54Z__client-src-components-readingtable-tsx.md).

## Repro

1. Ask a fictional question (e.g. about gardening) and complete a reading.
2. Open Life Memory suggestions. The question appears as a *current
   concern*; a card theme appears as a *current event* — neither labeled as
   reader-suggested vs user-shared.

## Acceptance criteria

- [ ] Suggestions visibly distinguish what the reader shared from what the
  cards suggested (plain-language source line, not just kind labels).
- [ ] Card-derived themes are never labeled as life events the user reported.
- [ ] **Hide** vs **Dismiss** is explained where the choice is offered.

## Test plan

- Unit test on `suggestMemories`: question-based and card-based suggestions
  carry distinguishable, non-overstating source/kind metadata.
- Manual pass on LifeMemory: suggested list reads plainly; Hide/Dismiss
  difference is stated.
