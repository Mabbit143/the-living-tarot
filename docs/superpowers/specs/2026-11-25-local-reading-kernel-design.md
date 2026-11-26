# Local reading kernel — backend design

## Decision (2026-11-25, owner-confirmed)

- **Reasoning: API-led (Gemini), kernel-grounded — revised same night.**
  Screenshot evidence proved templates alone can't reach the target
  experience, so the reader is generative. The deterministic kernel stays
  as the offline fallback AND as the grounding layer: its ranked retrieval
  decides what the model gets told (question, talk-first answers, ranked
  memories, card meanings, synthesis skeleton). No model, no inference API
  was the original call; the owner reversed it on the evidence.
- **Data: local-only.** No Supabase/Postgres for now — not for inference,
  not for sync. Single device, localStorage behind `StoreAdapter`, file
  backup/restore. The adapter boundary stays, so this decision is reversible.

## What exists today

- `client/src/lib/reader.ts` — `buildInterpretation` assembles readings from
  card meanings + personal context in the reader's voice. Header contract:
  "No live model call."
- `client/src/lib/readingContext.ts` — position roles, `sharedTopics`
  keyword overlap, `cardInPosition`, `personalAssociation` (personal meaning
  wins over book meaning), sparse hand-authored `positionReadings`.
- `client/src/lib/knowledge.ts` — 78 `CardMeaning`s, spreads, combination
  principles, positional rules, voices, flows, weaving techniques.
- `client/src/lib/memory.ts` — `suggestMemories` (question → concern, major
  card theme → event); personal inputs: `Profile` (incl. the medium's
  chosen `readerName`, falling back to the voice title), `LexiconEntry`,
  `MemoryItem`, past `Reading`s (see `client/src/lib/types.ts`).
- `client/src/lib/patterns.ts` — `computePatterns`: honest recurrence
  counting, never fate claims.
- `client/src/lib/store.ts` — `LocalStorageStore` (`living-tarot-db-v1`).

## The kernel to build

Small, explicit reasoning pieces over the same inputs — each independently
testable, no network, deterministic (same inputs → same reading):

1. **Relevance ranking.** Given question + context, rank candidate personal
   material (confirmed memories, lexicon entries, past readings) by topic
   overlap, confirmation status, recency, and frequency. Replaces today's
   first-match `find` with a scored top-N the composition stages share.
2. **Recency vs frequency weighting.** A card seen 5 times a year ago should
   not outshout a card seen twice this month. `computePatterns` keeps honest
   counting; the kernel adds a separate, stated weighting for emphasis.
3. **Contradiction rule.** Personal association beats book meaning, stated
   plainly in the text ("You associate X with ___, which pulls against the
   traditional ___"). Never silently substituted, never averaged away.
4. **Synthesis composition.** Extend `readTogether` so the "how they read
   together" section composes N cards without restating the card-by-card
   text — the most human-feeling gap in the current output.
5. **Follow-up understanding.** Extend `followUpReply`'s matching (thanks,
   read-together, named card/position, pronoun reference) to use the same
   ranked retrieval, so follow-ups can pull in memories and past readings.
6. **Voice consistency.** The voice shapes wording of replies, never rewrites
   a delivered interpretation (ties to `docs/issues/P2-1`).

## Non-goals

- No network inference, no API keys, no bundled secrets (Play-store safe).
- No cloud sync, accounts, or backend to maintain.
- No predictions or fate language — the product promise holds: more
  *personally informed*, never more *accurate*.
- No rewriting saved interpretations or reflections.
- No hand-authored content explosion: breadth comes from composition rules,
  not from writing 78 × roles bespoke passages.

## Storage (unchanged)

`StoreAdapter` stays the seam. Supabase/Postgres remains a documented
"later" that this decision defers indefinitely — revisit only for
cross-device sync, never for reasoning.

## Acceptance

- [ ] Airplane-mode pass: full reading + follow-ups + reflection, zero
  network calls.
- [ ] Determinism: same readings/profile/lexicon/memories → byte-identical
  interpretation text.
- [ ] Personal-wins tests: personal association overrides book meaning and
  says so; confirmed memory outranks unconfirmed suggestion.
- [ ] Device spot-check at 390px: new synthesis reads as one story, not N
  repeated paragraphs.
- [ ] No measurable cold-start regression on a mid-range Android device.

## Build order (all five slices implemented 2026-11-25, verified with
behavior harnesses and the committed vitest suite)

Postscript (same night): screenshot evidence proved templates alone can't
reach the target experience, so the kernel's role changed — it is now the
offline fallback AND the grounding layer for API-led readings: its ranked
retrieval decides what the model gets told (question, talk-first context,
ranked memories, card meanings, synthesis-relevant links), and the server
prompt in `server/src/gemini-reader.mjs` enforces book-only knowledge with
a no-cite rule. See `docs/issues/P1-4-hosted-reader-proxy.md` for the
release backend.

1. [x] Relevance-ranking module + unit tests (feeds everything else).
2. [x] Synthesis composition over ranked material.
3. [x] Recency/frequency weighting + contradiction rule.
4. [x] Follow-up understanding on the same retrieval.
5. [x] Voice-consistency pass (with P2-1; medium `readerName` + `readerDisplayName`).
