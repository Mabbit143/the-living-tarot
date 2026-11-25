# Optional Reader Setup Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Let new readers start immediately or open the profile guide, then offer same-spread guidance after delivery.

**Architecture:** App owns first-visit and guide entry state. A modal guide edits profile data until Save, when the profile and any same-reading guidance are written together. The existing local interpretation tools provide the card meanings and positions.

**Tech Stack:** React, TypeScript, Vite, browser local storage.

**Spec:** `docs/superpowers/specs/2026-11-25-optional-reader-setup-design.md`

## Global Constraints

- Use the existing React app, profile fields, local reader, and browser storage.
- Keep personalized guidance separate from the original interpretation in storage and exports.

## Review Focus

- A profile-free session can reload or resume a draft.
- Canceling setup preserves the current spread, profile, and unsent chat input.
- Saving setup with only a voice selected avoids claims about personal details.
- The Archive and exports preserve the original interpretation beside the new guidance.
- The first-visit artwork, actions, and guide remain usable at phone widths.

## Task 1. First visit and profile guide

- [x] Create `LandingPage({ onStart, onSetup })` and styles using local Rider–Waite–Smith cards.
- [x] Create `ReaderSetup({ initial, onSave, onCancel })` with optional fields, three steps, and a modal dialog.
- [x] In `App.tsx`, persist optional `Db.hasStarted` and leave existing profile editing available. Route first-visit and Profile actions into the guide.
- [x] Verify the desktop and mobile landing page, direct entry, cancel, and reopening after reload.

## Task 2. Guidance and persistence

- [x] Add optional `Reading.personalizedGuidance`. Implement `buildPersonalizedGuidance(reading, profile, lexicon)` in `reader.ts` using card positions and approximate topic matches.
- [x] Offer setup in `ChatReader` after the interpretation. Save the profile and guidance for the active reading together. Keep the reader mounted while the guide is open.
- [x] Display persisted guidance in the reader and Archive. Include it as a separate block in the readable export. JSON includes it through the existing database serialization.
- [x] Verify the same reading and cards, voice-only setup, cancel with text in chat, Archive after reload, and both exports. Run the production build and check the diff.
