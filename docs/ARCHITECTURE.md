# Architecture

## Principles

- **Layered and portable.** The app is built so the code can be lifted out of
  the Muse runtime into this repo and run standalone.
- **One data layer.** All persistence goes through a single data-layer module
  (`store.ts`). Local storage by owner decision (2026-11-25): on-device data
  is the product, and inference stays on-device too — no API pull. The
  `StoreAdapter` seam stays, so a future backend would not require touching
  reading or lexicon logic, but none is planned.
- **The reader remembers by ranking.** A deterministic, offline retrieval
  kernel (`lib/relevance.ts`) ranks memories, lexicon entries, and past
  readings by topic overlap, recency, and confirmation status, so composition
  stages share one ordering. Same inputs always give the same reading.
- **Knowledge is data, not code.** Card meanings, combination rules, spreads,
  and chat guidance live in `server/src/knowledge/` as JSON, read through a
  `knowledgeBase` module. Updating the knowledge base means updating data
  files, not the app.
- **The reader is a conversation.** Readings are assembled from embedded
  meanings plus the user's stored context, in the reader's voice — under the
  medium's chosen name when one is set. No predictive claims. The local
  reader is the default and the offline fallback; an opt-in connected Gemini
  path exists for readings but is not required for anything.

## Modules (this repo — `client/src/`)

| Module | Job |
|---|---|
| `lib/knowledge.ts` | Typed access to the knowledge base; imports the JSONs from `server/src/knowledge/` |
| `lib/store.ts` | The single data layer: `StoreAdapter` interface, versioned `LocalStorageStore` with quarantine + `migrate()` |
| `lib/reader.ts` | Interpretation assembly: meanings + ranked retrieval + recency weighting + follow-up recall, in the reader's voice |
| `lib/relevance.ts` | Deterministic ranked retrieval over memories, lexicon, and past readings; appearance history |
| `lib/readingContext.ts` | Position roles, topic overlap, relational synthesis, personal-vs-book tension |
| `lib/patterns.ts` | Recurrence counting with honest frequency caveats |
| `lib/memory.ts` | Memory extraction: suggestions from readings, all starting unconfirmed, sources distinguished |
| `lib/types.ts` | Shared data model (`Db.version`, `Profile.readerName`) |
| `components/` | `Onboarding`, `ReaderSetup`, `ReadingTable`, `PhysicalDeckEntry`, `ChatReader`, `ReadingInterpretation`, `Lexicon`, `LifeMemory`, `Archive`, `PatternsView`, `SymbolJournal`, `GeminiSettings`, `LandingPage`, `DeckPicker`, `SpreadCards`, `CardFace` |
| `App.tsx` | Shell + navigation + onboarding gate |

## Scaffold layout

```
client/
  package.json  vite.config.ts  tsconfig.json  index.html
  src/
    main.tsx  App.tsx  index.css
    lib/      types.ts  knowledge.ts  store.ts  reader.ts  relevance.ts  readingContext.ts
              patterns.ts  memory.ts  decks.ts  export.ts  gemini.ts
    components/  (see table above)
server/src/knowledge/   The knowledge base (source of truth, never edited by the app)
docs/                   This file
```

## Data gaps (round 1)

The round-1 JSON carries synthesized upright/reversed meanings, sources, and
disagreement notes per card — but no separate traditional-meaning field and
no per-card thin-reversal flag. The Lexicon therefore shows the synthesized
meanings, sources, and notes, and carries a plain note that reversal
synthesis rests on fewer sources. Those two display elements need round-2
data that carries them explicitly.

## Data model

Stored data is versioned (`Db.version`, currently `1`). `load()` migrates
older shapes and quarantines anything unreadable or from an unknown future
version instead of overwriting it.

- **profile** — onboarding answers, life context, preferred reading style,
  the medium's chosen name (`readerName`), initial themes.
- **readings** — spread type, cards with positions and orientations,
  interpretation, conversation, reflections.
- **reading_cards** — per-card position, orientation, and position meaning.
- **lexicon_entries** — per card: synthesized meaning, traditional meaning,
  sources, earlier vs. recent associations, appearance count, signifier
  designation, and the user's own personal meaning.
- **memories** — life memories with source, date, confidence level, and
  user-editable status (confirmed / suggested / hidden, plus delete).
  Suggestion sources distinguish what the reader shared (`you asked …`)
  from what the cards suggested (`cards suggested …`).
- **chat_messages** — the reading conversation.
- **journal_entries** — Symbol Journal entries.

## Knowledge base

`server/src/knowledge/`:

- `synthesized-meanings.json` — 78 cards. Each entry: id, name, arcana,
  suit, number, synthesized upright (2–4 sentences), synthesized reversed,
  `sources` (which books contributed), `notes` (disagreements and distinctive
  angles). Traditional Rider-Waite meanings are kept as a separate layer.
- `combinations-and-spreads.json` — combination principles (how cards shade
  each other), positional rules (how a card's meaning shifts by position),
  and the spread catalog (14 spreads with per-position meanings).
- `reader-chat-guidance.json` — conversational flows per spread type, weaving
  techniques, responding to the user's own interpretations (adopt / ask /
  store), questions-not-predictions, and the three voice profiles.
- `synthesis-notes.md` — per-book contribution notes, coverage table, known
  gaps (e.g. reversals rest on fewer sources; Six of Wands and Six of Swords
  are the thinnest cards).

## Memory architecture (decided: local-only)

On-device data is the product — no cloud backend is planned. Each memory
carries its source, date, confidence level, and user-editable status. Users
can correct, hide, or delete memories. The app asks before treating a
sensitive inference as a lasting fact. Ranked retrieval
(`lib/relevance.ts`) decides what the reader remembers right now: topic
overlap first, then card relevance, recency, and confirmation status.

## Reader voices

The reader can be named: `Profile.readerName` replaces the voice title as
the conversation speaker, falling back to the voice name when blank.

- **The Familiar** (default) — warm, plain-spoken, like someone who knows
  you. Asks the question underneath the question.
- **The Mystic** — symbolic, image-led, leans into archetype and metaphor.
- **The Interpreter** — precise, structured, names the mechanism: what the
  card says, what the position adds, what recurs.
