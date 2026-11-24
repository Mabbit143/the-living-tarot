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

## Modules (Muse build)

| Module | Job |
|---|---|
| Deck data | The 78 cards as a standalone data module (now the synthesized knowledge base) |
| Data layer (`store.ts`) | All reads/writes: profile, readings, lexicon, memories, patterns |
| Reader voices | The Familiar (default), The Mystic, The Interpreter — tone and question style |
| Pattern engine | Recurrence counting, honest frequency caveats |
| Memory extraction | Suggests memories from readings; all suggestions start unconfirmed |

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
