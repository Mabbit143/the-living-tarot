# The Living Tarot

A personal tarot reader that develops a relationship with you over time. It
remembers your personal symbolism, your recurring patterns, and how your life
has evolved between readings — and it interprets cards in the context of your
life, not from generic definitions.

## Status

V1 is live as a Muse app, and this repo now holds a runnable implementation
of it: a Vite + React + TypeScript app under `client/`, with the knowledge
base and documentation alongside it. Clone it, install, and run it — see
[Development](#development).

## What it does

- **1, 3, and 5-card spreads**, plus a catalog of classic layouts (Celtic
  Cross, Pyramid, Tree of Life, Decision, Partnership, and more) — drawn in
  the app or entered from your own physical deck.
- **Three in-app deck styles** are available at the Reading Table and in
  Profile. Rider–Waite–Smith is the default, with Tarot de Marseille and the
  text-only Midnight style also available. Saved readings keep their deck.
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
- **Take your history with you** — from the Archive, download a complete
  JSON backup or a readable plain-text copy of everything: every reading
  (spread, cards, interpretation, conversation, reflection), your personal
  Lexicon meanings and signifiers, Life Memories, and Symbol Journal
  entries. Both files are generated on your device from what is saved
  there; nothing is sent anywhere.

The product promise: it becomes more *personally informed* with every reading.
It never claims to be more *accurate*.

## Repo layout

```
client/                      The runnable app (Vite + React + TypeScript)
  src/
    lib/
      types.ts               Shared data model
      knowledge.ts           Typed access to the knowledge base
      store.ts               The single data layer (localStorage now)
      reader.ts              Interpretation assembly, in the reader's voice
      patterns.ts            Recurrence counting with honest caveats
      memory.ts              Memory extraction (suggestions start unconfirmed)
    components/
      Onboarding.tsx         Profile + life context + reading style
      ReadingTable.tsx       Spread picker, draw, physical-deck entry
      ChatReader.tsx         The conversational reader
      Lexicon.tsx            The 78-card Personal Tarot Lexicon
      LifeMemory.tsx         Confirmed / suggested / hidden memories
      Archive.tsx            Readings + post-reading reflections
      PatternsView.tsx       Recurring cards and pairs
      SymbolJournal.tsx      Symbol notebook
    App.tsx                  Shell + navigation
server/src/knowledge/    The synthesized knowledge base (the data layer)
  synthesized-meanings.json     78 cards, upright + reversed, sources per card
  combinations-and-spreads.json  Combination principles, positional rules,
                                 spread catalog
  reader-chat-guidance.json      Conversational flows, weaving, voices
  synthesis-notes.md             Per-book notes, coverage gaps, disagreements
docs/
  ARCHITECTURE.md                How the app is put together
```

## Card artwork

- **Rider–Waite–Smith** uses Pamela Colman Smith’s artwork from the early
  Pam-A printing, with 78 digitized faces from the
  [TaionWC collection on Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck_(TaionWC)).
- **Tarot de Marseille** uses the complete A. Camoin printing (1890–1900)
  based on Nicolas Conver’s design, digitized by the Bibliothèque nationale de
  France (btv1b10539497f) and available through
  [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Jeu_de_tarot_%C3%A0_enseignes_italiennes_dit_%22de_Marseille%22,_sur_le_mod%C3%A8le_du_tarot_de_Nicolas_Conver_-_jeu_de_cartes,_estampe_-_btv1b10539497f).

The public-domain artwork is bundled as WebP thumbnails. The Marseille
edition is mapped by card identity, including VIII Justice and XI Strength,
so the selected artwork uses the same reading and Lexicon entries.

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

Prerequisites for the checks: Node 22.12+ on the 22.x line, Node 24.x,
or Node 26+, and npm. The npm project lives in `client/`. From the repository
root, install the locked dependencies, including the dev dependencies needed
by Vitest and TypeScript:

```sh
npm --prefix client ci --include=dev
```

```sh
cd client
npm run dev      # start the dev server
npm test         # run the vitest suite
npm run build    # typecheck + production build (output in client/dist)
npm run preview  # serve the production build locally
npm run typecheck
```

Readings are API-led (owner decision 2026-11-25): with Gemini connected, the
model writes each reading grounded strictly in the bundled knowledge base
(synthesized from the owner's tarot library) plus the current reading and
recent messages — and it must never name, cite, or quote any books or
authors. To connect, open **Connect Gemini** on the Reading Table while
using the local dev or preview server. The dialog checks the key with Google
and the server holds it in memory until restart. Set `GEMINI_API_KEY` in the
server environment if you prefer a preconfigured key (`export` it before
`npm run dev` so restarts keep working). `GEMINI_MODEL` overrides the
default model (`gemini-3.5-flash-lite`). Sharing relevant saved context (ranked
memories, associations, names) is a separate opt-in. The local deterministic
reader is the offline fallback: static builds and Gemini failures use it
automatically. At release, readings are served by a hosted proxy holding the
key — see `docs/issues/P1-4-hosted-reader-proxy.md`. Point a build at it
with `VITE_TAROT_API_URL` (no trailing slash).

How it fits together:

- The client imports the knowledge JSONs directly from
  `server/src/knowledge/` (see `client/src/lib/knowledge.ts` and the
  `server.fs.allow` setting in `client/vite.config.ts`). The JSON files are
  the source of truth — edit the data, not the code, to change meanings.
- Persistence is localStorage behind the `StoreAdapter` interface in
  `client/src/lib/store.ts` (stored data is versioned and migrated on load;
  unreadable saves are quarantined, never overwritten). No cloud sync is
  planned; the Supabase adapter remains a documented seam only.
