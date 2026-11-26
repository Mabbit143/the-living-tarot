# Handoff — phone-test round 1 → screenshot analysis (ChatGPT)

Date: 2026-11-25. All work below is implemented, typechecked, and
behavior-harness verified. Nothing is committed — commit from a clean
`git status` when ready.

## What this session did (phone-test fixes)

1. **Landing hero labeled as example** (`client/src/components/LandingPage.tsx`).
   The three-card preview now reads "Example reading" — it was being mistaken
   for a real spread dealt before any draw.
2. **"Add more context" opened by default** (`client/src/components/ReaderSetup.tsx`).
   The collapsed `<details>` was invisible; it now renders open with a
   descriptive summary (people, goals, concerns, themes).
3. **Question-as-memory suggestion removed** (`client/src/lib/memory.ts`).
   "Save the question?" entries were unusable clutter — past readings already
   carry their questions into ranked retrieval. Card-theme suggestions
   (`cards suggested …`) remain. LifeMemory help text updated.
4. **Reflections now shape new readings** (`client/src/lib/reader.ts`).
   New readings echo the latest reflection on shared cards up front:
   "Last time X came up, you noted: … How does that sit beside this reading?"
   Previously reflections only fed follow-up recall + Archive display.
5. **P0-2 schema versioning** (`version: 1`, `migrate()`, unknown versions
   quarantined) + committed tests. P0-2 and P2-2 issues checked off.

## Verify on your machine

```sh
cd client
npm test                 # expect 3 files / 29 tests
npm run build
```

All covered behaviors have committed vitest cases (`relevance.test.ts`,
`store.test.ts`, `reader.test.ts`); throwaway harnesses were removed.

## Open phone-test items (need your screenshots / answers)

1. **Error message on phone** — quote the exact text and where it appeared.
   The `taste/moments` animation import already fails soft (warn-only), and
   its modules are self-contained, so an unknown error is coming from
   somewhere else.
2. **`taste/moments` URL failed to load** — same: which URL, where seen
   (page, console, dialog)? Files exist in both `public/` and `dist/`.
3. **Spread laid out before drawing** — fixed on the assumption it was the
   landing hero. If you saw it on the Reading Table instead, say so: the
   table only renders cards when `previewCards` is non-empty.
4. **Vague cold readings (the big one)** — which flow: "Draw and read" straight
   through, or "Talk first" then read? Cold readings (no profile, no context)
   currently give 3 first-sentences + question prompts and no substance.
   Candidate direction: talk-first answers already feed the interpretation as
   context, so the fix may be making that path unavoidable/visible rather
   than rewriting the reader.
5. **No restore during onboarding** — known gap, tracked as P0-4 (backup has
   no restore). Needs a decision: restore inside onboarding vs Archive-only.
6. **Vague cold readings — fixed 2026-11-25 after the screenshot.** Stopword list
   expanded ("each"/"self"/auxiliaries no longer count as shared themes);
   each card now names the part of its meaning that speaks to the question
   (with life-domain bridges, e.g. app→money/security), in 1 of 3 rotating
   phrasings; the closing question is picked by topic overlap with the
   reader's own words (≥2 shared topics, else rotation) instead of pure
   rotation. Verified by generating the exact Five-Card app reading and
   reading it: synthesis clean, bridges land ("money", "security"), closing
   sane.
7. **Cold-reading follow-up (same night).** Card sections now LEAD with the
   question instead of appending a spotlight line; the opening leads with
   talk-first context when there is no typed question; synthesis names where
   the topic lives ("holds it clearest"); talk-first answers became the
   top-priority personalization input with an honest fallback when no card
   names the situation. Also fixed 107 question-shaped position meanings
   missing their `?` in the knowledge data.
8. **Annotated-screenshot round (same night).** Killed filler-word
   "insights" (stand/good/better/like…), added synonym-aware matching
   (RELATED groups: trust↔loyalty, money↔wealth…), synthesis topics must
   now matter to the reader's question, past cards name the release
   ("stop carrying"), outcomes in trust readings are shared ("build
   together"), the new-relationship/past-hurt inference is voiced, and
   the closing question got an **Answer this** button (Reader only).
   Committed suite: 3 files / 29 tests (run `npm test` to confirm).
9. **Reflections** — now wired into new readings (see 4 above). Confirm the
   echo feels like remembering, not parroting.

## Context the next session needs

- Goal: working tarot reader that feels like a person, beta-ready. 93–95%.
- Backend decision: on-device deterministic kernel, local-only data, no API
  pull (API is a documented last resort). Spec:
  `docs/superpowers/specs/2026-11-25-local-reading-kernel-design.md`.
- Play Store is the release target; 390px is the primary viewport.
- `npx impeccable login` still not run (needs the owner).
- Test/build sandbox limits: `npm install` and `vite build` fail in this
  sandbox; they pass on the owner machine.

