# Architecture

## Principles

- **Layered and portable.** The app is built so the code can be lifted out of
  the Muse runtime into this repo and run standalone.
- **One data layer.** All persistence goes through a single data-layer module
  (`store.ts` in the Muse build). Local storage now; swap it for
  Supabase/PostgreSQL without touching reading or lexicon logic.
- **Knowledge is data, not code.** Card meanings, combination rules, spreads,
  and chat guidance live in `server/src/knowledge/` as JSON, read through a
  `knowledgeBase` module. Updating the knowledge base means updating data
  files, not the app.
- **The reader is a conversation.** Readings are assembled from embedded
  meanings plus the user's stored context, in the reader's voice. No live
  model call, no predictive claims.

## Modules (this repo — `client/src/`)

| Module | Job |
|---|---|
| `lib/knowledge.ts` | Typed access to the knowledge base; imports the JSONs from `server/src/knowledge/` |
| `lib/store.ts` | The single data layer: `StoreAdapter` interface, `LocalStorageStore` now, Supabase later |
| `lib/reader.ts` | Interpretation assembly: meanings + combinations + positions + lexicon + history, in the reader's voice |
| `lib/patterns.ts` | Recurrence counting with honest frequency caveats |
| `lib/memory.ts` | Memory extraction: suggestions from readings, all starting unconfirmed |
| `lib/types.ts` | Shared data model |
| `components/` | `Onboarding`, `ReadingTable`, `ChatReader`, `Lexicon`, `LifeMemory`, `Archive`, `PatternsView`, `SymbolJournal` |
| `App.tsx` | Shell + navigation + onboarding gate |

## Scaffold layout

```
client/
  package.json  vite.config.ts  tsconfig.json  index.html
  src/
    main.tsx  App.tsx  index.css
    lib/      types.ts  knowledge.ts  store.ts  reader.ts  patterns.ts  memory.ts
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

- **profile** — onboarding answers, life context, preferred reading style,
  initial themes.
- **readings** — spread type, cards with positions and orientations,
  interpretation, conversation, reflections.
- **reading_cards** — per-card position, orientation, and position meaning.
- **lexicon_entries** — per card: synthesized meaning, traditional meaning,
  sources, earlier vs. recent associations, appearance count, signifier
  designation, and the user's own personal meaning.
- **memories** — life memories with source, date, confidence level, and
  user-editable status (confirmed / unconfirmed / hidden / deleted).
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

## Memory architecture (direction)

Structured database + semantic search — Supabase/PostgreSQL with vector
search — not conversation history. Each memory carries its source, date,
confidence level, and user-editable status. Users can correct, hide, or
delete memories. The app asks before treating a sensitive inference as a
lasting fact.

## Reader voices

- **The Familiar** (default) — warm, plain-spoken, like someone who knows
  you. Asks the question underneath the question.
- **The Mystic** — symbolic, image-led, leans into archetype and metaphor.
- **The Interpreter** — precise, structured, names the mechanism: what the
  card says, what the position adds, what recurs.
