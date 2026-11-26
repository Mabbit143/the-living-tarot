# P1-3: Play Store readiness track

**Priority:** P1 — release target
**Area:** distribution, mobile, release

## Problem

The app is being designed for release on the Google Play Store, but today it
is a browser-only Vite app: no installable wrapper, no manifest or store
assets, and the Gemini path depends on dev/preview-only local middleware.
The on-device data story also becomes the whole product once there is no
desktop browser with easy file access.

Current state (grounding):

- Build output is `client/dist` (static) with `viewport` and `theme-color`
  set but no web manifest, maskable icon, or wrapper config — see
  [index.html](/C:/Users/mabbi/dev/the-living-tarot/client/index.html) and
  `client/public/` (favicon + decks/fonts only).
- The Gemini key is user-supplied at runtime through **Connect Gemini**
  (see [GeminiSettings.tsx](/C:/Users/mabbi/dev/the-living-tarot/client/src/components/GeminiSettings.tsx)),
  held in local server memory by
  `server/src/gemini-reader.mjs`. No secret is bundled — but a Play build
  has no local `server/` process, so Gemini needs a hosted proxy or an
  on-device path, otherwise the toggle silently stops working.
- All user data lives in localStorage under `living-tarot-db-v1` (see
  [store.ts](/C:/Users/mabbi/dev/the-living-tarot/client/src/lib/store.ts:58)).
  WebView storage can be evicted; backup/restore must work with mobile
  share sheets, not desktop file downloads.
- Storage hardening is already tracked separately: `docs/issues/P0-1` (corrupt
  wipe), `P0-2` (schema versioning), `P0-3` (silent save failures), `P0-4`
  (backup has no restore), `P0-5` (all-or-nothing validation). This issue
  does not duplicate those — it adds the Play-specific surface around them.

## Decisions to make first

- [ ] **Wrapper:** TWA (Bubblewrap, hosted PWA) vs Capacitor (bundled WebView).
  TWA keeps one codebase and instant updates but needs a hosted HTTPS origin
  + asset links; Capacitor ships offline-first but owns a native shell.
- [x] **Gemini: decided 2026-11-25, API-led; release backend decided same night — hosted proxy.**
  Screenshot evidence proved templates alone can't reach the target
  experience, so the reader is generative (Gemini) with the local kernel as
  offline fallback and grounding layer. At release users must never be asked
  for an API key, so readings are served by a hosted proxy that holds the key
  server-side and enforces the grounded prompt. The **Connect Gemini** flow
  stays for beta (key stays user-supplied, never bundled). New issue tracks
  the proxy service: auth, quotas, logging policy, Play data-safety.
- [ ] **Minimum Android version / WebView baseline** the bundle targets
  (affects CSS/JS feature use and testing matrix).

## Acceptance criteria

- [ ] An installable artifact path exists from a clean checkout (documented
  commands: web build → wrapper → signed AAB), reproducible by the owner.
- [ ] Cold start on a mid-range Android device: first reading reachable
  without jank; 78-card artwork + fonts stay within an agreed install size.
- [ ] No secret in the bundle: key handling follows the chosen Gemini
  decision; static scans of the AAB find no API key.
- [ ] Backup/restore round-trips through mobile share sheets (import **and**
  export), building on P0-4 rather than desktop downloads.
- [ ] P0-1…P0-5 storage issues are closed before store submission — on device
  there is no second copy.
- [ ] Store listing assets ready: icon (incl. maskable), feature graphic,
  screenshots at a 390px-class viewport, short + full description, content
  rating questionnaire answers, privacy policy URL (on-device data story).
- [ ] 390px phone pass (the primary viewport) has no buried actions or
  horizontal overflow — P1-2 was the first of these, not the last.

## Test plan

- Fresh-install test on a real device: onboarding → reading → reflection →
  backup → uninstall → reinstall → restore, all data intact.
- Offline cold start with no network: local reader works, Gemini paths
  degrade with a human message (no dead toggle, no crash).
- Gemini enabled on device: key connects, readings reply, key never appears
  in bundled output.
- Store pre-launch report (or equivalent) run: crashes, accessibility, and
  oversized-asset warnings addressed.
