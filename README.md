# The Living Tarot

A personal tarot reader that develops a relationship with you over time. It
remembers your personal symbolism, your recurring patterns, and how your life
has evolved between readings — and it interprets cards in the context of your
life, not from generic definitions.

## Status

V1 is live as a Muse app. This repo holds the portable heart of the project:
the synthesized knowledge base and the documentation. The runnable app source
is being packaged for development here as the next step.

## What it does

- **1, 3, and 5-card spreads**, plus a catalog of classic layouts (Celtic
  Cross, Pyramid, Tree of Life, Decision, Partnership, and more) — drawn in
  the app or entered from your own physical deck.
- **A conversational reader** (The Familiar by default, switchable to The
  Mystic or The Interpreter) that asks open questions instead of making
  predictions, and weaves cards, positions, and your past readings into one
  story.
- **Life Memory** — people, relationships, goals, concerns, and events, kept
  distinct as current or past. Suggested memories stay unconfirmed until you
  keep, edit, hide, or dismiss them.
- **Reading Memory** — every spread, position, orientation, interpretation,
  question, and reflection, searchable and revisit-able.
- **Personal Tarot Lexicon** — each card carries traditional meanings plus
  your own evolving history with it: earlier vs. recent associations,
  recurring contexts, appearance counts, and signifier designations.
- **Pattern Recognition** — recurring cards, combinations, related questions,
  and shifts in interpretation. Frequency is counted honestly: it depends on
  the number of readings, the deck, and the draw method. It never claims fate.
- **Reflection and Follow-Up** — revisit a reading, record what actually
  happened, compare without rewriting the original interpretation.

The product promise: it becomes more *personally informed* with every reading.
It never claims to be more *accurate*.

## Repo layout

```
server/src/knowledge/    The synthesized knowledge base (the data layer)
  synthesized-meanings.json     78 cards, upright + reversed, sources per card
  combinations-and-spreads.json  Combination principles, positional rules,
                                 spread catalog
  reader-chat-guidance.json      Conversational flows, weaving, voices
  synthesis-notes.md             Per-book notes, coverage gaps, disagreements
docs/
  ARCHITECTURE.md                How the app is put together
```

## Knowledge base provenance

The meanings are synthesized — not copied — from the owner's tarot library,
blended with traditional Rider-Waite meanings. Round 1 (nine books): Brigit
Esselmont, Robert Place, Micheline Stuart, Ethony Dawn, Lisa Papez, Abbi
Clark, Karen Hamaker-Zondag, Eden Gray, Johannes Fiebig. Round 2 (seven
books) is in progress. Each card's entry records which books contributed, and
where the books disagree the majority reading is used and the disagreement is
noted. Reversals rest on fewer sources; thin ones are flagged in the data.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). In short: standalone deck
data, one data layer behind a clear interface (local storage now, swappable
for Supabase/PostgreSQL later), separate reader-voice, pattern-engine, and
memory-extraction modules.

## Development

The full runnable codebase scaffold is the next step for this repo. The
intended direction is Supabase/PostgreSQL with vector search for the memory
systems, per `docs/ARCHITECTURE.md`.
