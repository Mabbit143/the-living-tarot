# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tarot beginners learning through self-readings. They use the app to choose a spread, understand what each card and position contributes, and build their own associations through repeat readings. They can work with an in-app deck or a physical deck they already use.

## Product Purpose

The Living Tarot helps people learn tarot by doing readings and reflecting on them. A reader can start with a question, explore how the cards relate to it, and return later to add what they noticed. Over time, past readings and personal associations give new readings more context.

## Positioning

The app remembers how a card has shown up in the reader’s life. It combines sourced card meanings with the card’s position, its relationship to other cards, and the reader’s own notes and history. The promise is a reading that becomes more personally informed over time.

## Operating Context

- Begin at the **Reading Table**. Choose a spread, draw in the app or enter cards from a physical deck, and explore the reading in conversation.
- Return to the **Archive** to revisit the original reading and add a follow-up reflection. Export a JSON backup or a readable plain-text copy of saved history.
- Use the **Lexicon** to learn meanings and record personal associations, **Life Memory** to manage remembered life context, the **Symbol Journal** to collect recurring images or ideas, and **Patterns** to explore repeated cards and combinations.

## Capabilities and Constraints

- The app supports 1-, 3-, and 5-card readings and a catalog of classic spreads. In-app deck choices are Rider–Waite–Smith (default), Tarot de Marseille, and Midnight (text only). Saved in-app readings retain their deck choice.
- The current implementation stores personal data in the browser and generates interpretations from the bundled knowledge base and saved context. Exports are created on the device.
- Suggested Life Memories start unconfirmed. The reader can keep, edit, hide, or dismiss them.
- Pattern counts depend on the number of readings, deck, and draw method. Interpretations use open questions and avoid predictions.

## Brand Commitments

- **The Living Tarot** uses the tagline “A reader that remembers you.”
- **The Familiar**, the default reader voice, is warm and plainspoken. **The Mystic** works through imagery and metaphor. **The Interpreter** explains how the cards, positions, and recurring themes relate.

## Evidence on Hand

- `server/src/knowledge/` contains the 78-card meaning synthesis, source attribution, spread and combination rules, reader guidance, and notes on coverage gaps.
- `client/public/decks/` contains the in-app card artwork.
- `test-screenshots/` contains existing captures of onboarding, desktop and mobile Reading Table, Reader, Archive, and other app views.

## Product Principles

1. Teach through the reading. Help beginners understand how a card, its position, and the surrounding cards contribute to an interpretation.
2. Give the reader room to form their own associations. Use questions and reflections to support their judgment.
3. Keep memory under the reader’s control. Ask before treating a suggestion as lasting context and preserve the original reading when a reflection is added.
4. Let specificity build over time. Use the reader’s history to add context and be explicit about what recurrence counts can tell them.
