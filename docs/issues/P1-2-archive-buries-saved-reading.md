# P1-2: Archive buries the saved reading and reflection action on phones

**Priority:** P1 — completion handoff
**Area:** Archive layout

## Problem

The backup/utilities panel renders before any entry, and the reflection
editor sits after the full interpretation text. On a 390px viewport the
newest entry opened ~1175px down the page and the editor ~2700px after
opening the entry. The archived interpretation is also a flat `div`, losing
the Reader's section structure, and every entry shares the same **Open**
button name.

See [Archive.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/Archive.tsx:66)
(backup + search panels lead),
[Archive.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/Archive.tsx:115)
(entries render after),
[Archive.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/Archive.tsx:153)
(flat interpretation `div` vs the Reader's `ReadingInterpretation` sections),
and [Archive.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/Archive.tsx:126)
(identical **Open** labels).

Snapshot: [critique 2026-11-25](/C:/Users/mabbi/dev/the-living-tarot/.impeccable/critique/2026-11-25T12-29-54Z__client-src-components-readingtable-tsx.md).

## Repro

1. Complete a reading on a 390×844 viewport.
2. Open the Archive. The newest entry is below the backup panel.
3. Open the entry. Scroll to the reflection editor — it is a long scroll
   past the full interpretation.

## Acceptance criteria

- [ ] The saved reading and an **Add reflection** entry point render before
  the backup utilities (at least on narrow viewports).
- [ ] The archived interpretation uses the same readable section structure
  as the Reader instead of one flat block.
- [ ] Each entry's open control has a unique accessible name (e.g. includes
  spread name / date), instead of repeated **Open** labels.

## Test plan

- Manual 390×844 pass: newest entry and reflection entry point visible
  without scrolling past utilities; editor reachable without a ~2700px scroll.
- Screen-reader pass: entry buttons announced distinctly; archived
  interpretation keeps heading structure.
