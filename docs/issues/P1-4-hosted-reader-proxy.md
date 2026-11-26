# P1-4: Hosted reader proxy (release backend for Gemini readings)

**Priority:** P1 — release blocker (beta can proceed on the dev server)
**Area:** backend, release

## Decision

Owner-confirmed 2026-11-25: at release, users must never be asked for an API
key. Readings are served by a hosted proxy that holds the Gemini key
server-side and enforces the grounded prompt. The local deterministic reader
stays as the offline fallback; the kernel's ranked retrieval decides what the
model gets told either way.

## What the proxy must do

- **Key custody.** Hold the Gemini API key server-side (env/secret manager).
  The key never ships in the app, never crosses to clients.
- **Prompt enforcement.** Reuse `server/src/gemini-reader.mjs` logic:
  same-origin `readingContext` validation, same grounded system prompt
  (book-only knowledge, no-cite rule, per-card application, true arc,
  one personal closing question), same output contract
  `{ text }` / `{ error }`, same 40KB body cap.
- **Auth.** Beta: shared secret or allowlist. Release: per-install
  identity with rate limits, so one user cannot spend the key down.
- **Quotas.** Per-user daily reading cap + global budget alarm. Log counts,
  never reading contents.
- **Privacy.** No prompt/response logging by default. No third parties
  beyond Google's API. State this plainly for the Play data-safety form.
- **Client seam (done).** The app reads `VITE_TAROT_API_URL` at build time
  and prefixes both Gemini endpoints with it; same-origin dev server remains
  the default. See [gemini.ts](/C:/Users/mabbi/dev/the-living-tarot/client/src/lib/gemini.ts).

## Acceptance criteria

- [ ] A clean-checkout deploy path exists (one service, documented env).
- [ ] A Play build with `VITE_TAROT_API_URL` set completes a Talk-first
  reading end to end with no key on device.
- [ ] Loopback-only dev middleware still works with no env set (beta path).
- [ ] Abuse test: unauthenticated / over-quota requests are refused without
  touching the Gemini key budget.
- [ ] Data-safety answers written from the logging policy, not aspirationally.

## Test plan

- Deploy to staging, run the mock-Google harness pattern from development
  against it (structure mandates, names, memory, no-cite rule in the sent
  prompt).
- Fresh install → onboarding → Talk-first reading on a real device, airplane
  mode off, then airplane mode on (local fallback answers).
- Kill the proxy and confirm the app degrades to the local reader with a
  human message, not a dead toggle.
