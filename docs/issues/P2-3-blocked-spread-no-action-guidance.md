# P2-3: Filled physical spread blocks reading with no guidance at the action

**Priority:** P2 — recovery clarity
**Area:** Reading Table physical entry

## Problem

A duplicate spread can show all positions filled while **Read the cards**
stays disabled. The inline messages name the repeated card, but the disabled
action itself gives no reason and no recovery step.

See [ReadingTable.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/ReadingTable.tsx:50)
(`duplicateCards` blocks `canBegin`) and
[ReadingTable.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/ReadingTable.tsx:219)
(disabled button with no adjacent explanation).

Snapshot: [critique 2026-11-25](/C:/Users/mabbi/dev/the-living-tarot/.impeccable/critique/2026-11-25T12-29-54Z__client-src-components-readingtable-tsx.md).

## Repro

1. Choose a 3-card spread with physical-deck entry.
2. Enter the same card in two positions (3 of 3 filled).
3. **Read the cards** is disabled; the reason lives only in the inline
   picker messages, not at the action.

## Acceptance criteria

- [ ] When the action is disabled, a short note beside it states why and
  the one step to fix it (e.g. which card is repeated).
- [ ] The note appears for both **Read the cards** and **Talk first**, since
  both are gated on the same condition.

## Test plan

- Manual pass with a duplicate physical spread: disabled actions each show
  the adjacent reason; fixing the duplicate clears it.
