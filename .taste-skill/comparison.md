# The Living Tarot before and after

The inspection covered the same 13 views and dialog states at 1440, 1024, 768, 390, and 320 CSS pixels. The `before` and `after` folders contain 1440 px and 390 px screenshots, raw measurements, interaction logs, and Taste copy lint on the static JSX copy and document metadata.

| Measurement | Before | After |
| --- | ---: | ---: |
| View and width combinations | 65 | 65 |
| Smallest observed button or disclosure height | 33 px | 44 px |
| Button or disclosure observations below 44 px | 580 | 0 |
| View and width combinations with horizontal overflow | 0 | 0 |
| Broken images observed | 0 | 0 |
| Scripted UI interactions completed | 91 | 100 |
| Local Gemini fixture submissions | 4 | 4 |
| Browser exceptions | 0 | 0 |
| Static copy lint failures | 0 | 0 |
| Static copy lint warnings | 1 | 1 |

The copy warning counts 10 existing em dashes across the extracted source copy from all app views. Those existing labels and explanatory lines were retained.

## Rendered page height

| View | Before 1440 | After 1440 | Before 390 | After 390 |
| --- | ---: | ---: | ---: | ---: |
| Landing | 900 px | 1,800 px | 844 px | 1,688 px |
| Reading Table | 900 px | 900 px | 844 px | 844 px |
| Reader | 1,007 px | 900 px | 1,190 px | 1,153 px |
| Archive | 1,743 px | 1,727 px | 2,928 px | 2,993 px |
| Lexicon | 4,906 px | 3,641 px | 11,362 px | 11,519 px |
| Life Memory | 944 px | 992 px | 1,364 px | 1,354 px |
| Patterns | 1,004 px | 981 px | 1,359 px | 1,395 px |
| Symbol Journal | 900 px | 900 px | 844 px | 844 px |
| Profile | 1,139 px | 1,255 px | 1,304 px | 1,380 px |

The landing gains a second screen explaining personalized guidance. Heights for data-driven views describe the captured state, including the current spread, open disclosures, and saved data. Random draws can change card name lengths, pattern rows, and memory suggestion counts.

## Interaction coverage

The 91 shared interactions cover both landing actions, optional setup and save from a reading, spread and deck menus, physical card search and selection, reversal, read and talk-first flows, draft resume, reading chat, personal card meaning, completion, Archive search, reflection, downloads and deletion, Lexicon filters and card detail, association and signifier, memory creation, edit cancellation, hide and restore, Patterns, Journal entry and removal, and Profile save. The baseline uses buttons for navigation and had no anchor links. The nine additional checks cover the new keyboard skip link, the closing reading button, and a local mobile physical-deck reading with a reversed card.

The Gemini key, reading, and follow-up forms were exercised against a local fixture with fictional data. Both runs sent the same endpoint and payload field sets in the same order. The test generated both export downloads in-browser. It did not contact an external Gemini service.

## Final checks

The production build passed. The Taste landing-page gate passed on round three with five advisory warnings and no waivers. Warnings covered the dealt scroll highlight, copy heuristics, the closing action placement, and social sharing metadata. The landing performance check had zero failures and two warnings for parsed JavaScript size, one at each width. See `after/gate.txt` and `after/perf.txt` for the raw results.
