---
name: The Living Tarot
description: A reader that remembers you.
colors:
  midnight: "#0d0b12"
  midnight-2: "#171224"
  midnight-3: "#221a33"
  gold: "#c9a227"
  gold-soft: "#e3c766"
  violet: "#8b6fc0"
  violet-soft: "#b39ddb"
  cream: "#f5f2ea"
  muted: "#b8b0c4"
  line: "#3a2f52"
  control-border: "#867799"
  danger: "#c96a6a"
typography:
  display:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "1.9rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    lineHeight: 1.55
  label:
    fontSize: "0.85rem"
rounded:
  art: "4px"
  control: "8px"
  tarot-card: "10px"
  panel: "12px"
  chip: "999px"
spacing:
  app-gutter: "1rem"
  navigation-gap: "0.4rem"
  spread-gap: "0.6rem"
  card-grid-gap: "0.7rem"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.midnight-2}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.9rem"
  button-secondary:
    backgroundColor: "{colors.midnight-3}"
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.9rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.9rem"
  field:
    backgroundColor: "{colors.midnight-2}"
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    padding: "0.55rem 0.7rem"
  panel:
    backgroundColor: "{colors.midnight-2}"
    textColor: "{colors.cream}"
    rounded: "{rounded.panel}"
    padding: "1rem 1.1rem"
---

# Design System: The Living Tarot

## Overview

**Creative North Star: "The Midnight Study"**

The Midnight Study is quiet and welcoming for beginners. Dark, closely related surfaces make space for card artwork and reading notes. Familiar controls and clear edges help readers move through a spread at their own pace.

**Key Characteristics**

- Midnight surfaces with thin, visible borders
- Candle gold for headings, primary actions, and selected navigation
- Georgia headings and system sans-serif for reading and controls

## Colors

- **Candle gold** fills primary actions and marks current navigation. Soft candle gold is used for headings and selected text.
- **Muted violet** outlines the Lexicon dialog and the reader’s conversation partner. Soft violet carries links and orientation cues.
- **Midnight surfaces** distinguish the page, panel, and control layers. Cream carries body text. Muted lavender is used for labels and supporting copy. Fields have a more visible border than panels.

## Typography

Georgia gives titles and card names a bookish character. System sans-serif handles conversation, labels, and controls. The app title is 1.9rem, body copy uses 1.55 line height, and field labels use 0.85rem.

## Layout

The app uses a centered reading column with a 920px maximum width and a 1rem horizontal gutter. Navigation and grouped controls wrap. Card grids reflow with a 150px column minimum, and spread grids use a 200px minimum.

## Elevation & Depth

Panels and controls separate through changes in surface tone and thin borders. The Lexicon dialog darkens the page behind it. Tarot card faces use a subtle dark gradient.

## Shapes

Buttons and fields use an 8px radius. Content panels use 12px, tarot card frames use 10px, and the artwork inside uses 4px. Small chips use a pill shape.

## Components

- **Buttons.** Gold fill identifies primary actions. Secondary buttons use a dark fill, and ghost buttons use a transparent fill. Enabled controls show a gold border on hover.
- **Fields.** Inputs, selects, and textareas use a dark panel fill, a visible label, and a gold outline on focus.
- **Navigation.** Compact buttons wrap across lines. The current view has a gold border and soft gold text.
- **Panels.** Dark panels use a thin border and about 1rem of padding. Conversation bubbles use alignment and borders to distinguish speakers.
- **Tarot cards.** The face keeps the card name and spread position readable with or without artwork. A reversed card uses a dashed border and, when artwork is shown, a rotated image.

## Do's and Don'ts

- Use visible labels and preserve the gold focus outline on fields.
- Pair reversal styling with the written orientation label.
- Let navigation and spread grids reflow within the reading column.
