# Optional reader setup

## Goal

Let someone receive their first tarot reading without sharing personal details. After they see the main interpretation, offer to guide them through building a profile and use what they share to add guidance to that same spread.

## First visit

- Introduce The Living Tarot with a three-card spread using the app’s Rider–Waite–Smith artwork and the existing midnight-and-gold identity.
- **Start a reading** opens the Reading Table with The Familiar as the default voice. Reading, draft resumption, saving, and revisiting the Archive work without a completed profile.
- **Set up my reader** opens the optional guide. Readers can also open it later from Profile. Returning readers go directly to the Reading Table.

## Profile guide

Ask what to call the reader, what’s on their mind, and which reader voice they prefer. Explain how the answers shape guidance. Offer people, goals, concerns, and recurring themes under **Add more context**. Each step can be skipped. Save profile changes only when the reader chooses to finish. Cancel returns them to where they started.

## After the main interpretation

- Offer **Set up my reader** beneath the main interpretation to readers who have yet to complete setup. Keep the existing save action available.
- Finishing setup returns to the same reading. Show **Personalized guidance** directly below the original interpretation. Tie the guidance to the question, the cards and their positions, and the context the reader chose to share. When only a voice is selected, use that voice without implying personal details were shared.
- Save the guidance with that reading so it is available in the Archive. Preserve the original interpretation and the card draw. Cancel or skip setup to continue with the original reading. Later profile edits apply to future guidance and preserve previously saved text.

## Approaches considered

- **Personalize this reading** is the selected approach. The reader sees what their profile contributes while the question and spread are still in front of them. This requires returning to the same reading and storing an additional piece of guidance.
- **Personalize future readings** would save the same profile with a shorter first-reading flow. The reader would see the benefit on a later reading.

## Implementation boundaries

Use the existing React app, profile fields, local reader, and browser storage. The new guidance uses the local reader, so completing the guide does not send profile details to Gemini. Keep personalized guidance separate from the original interpretation in storage and exports. Existing profiles and readings continue to open without a data migration. Verify the first visit, skip and cancel, same-spread return, and Archive after reload on desktop and mobile.
