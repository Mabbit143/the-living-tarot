# P2-4: Production bundle exceeds the mobile-friendly size budget

**Priority:** P2 — Play-readiness follow-up
**Area:** build, mobile performance

## Problem

`npm run build` (green, 2026-11-25) emits a single
`dist/assets/index-*.js` of ~528KB (~163KB gzip) with Vite's own warning:

> Some chunks are larger than 500 kB after minification.

The bulk is the inlined knowledge base (`server/src/knowledge/*.json`,
imported statically via [knowledge.ts](/C:/Users/mabbi/dev/the-living-tarot/client/src/lib/knowledge.ts:10))
plus React. It works, but on mid-range Android phones — the primary beta
device class — first paint pays the full download + parse cost up front.

## Acceptance criteria

- [ ] Production JS for first paint is under ~300KB gzipped, or a measured
  reason is recorded for staying larger (e.g. offline-first single file).
- [ ] Candidate splits: knowledge JSONs per deck (`rws` default first,
  Marseille/Midnight lazy), route-level splits (Archive, Lexicon, Patterns
  behind `React.lazy`), `manualChunks` for vendor separation.
- [ ] Cold start on a mid-range Android device re-measured after the split;
  no regression in offline behavior (everything must still resolve from the
  installed bundle — no network fetch for split chunks beyond the local
  package).

## Test plan

- `npm run build` shows no chunk-size warning; record before/after sizes.
- Fresh-install cold start: time to interactive on device, before and after.
- Airplane-mode pass: every tab and deck style renders with no network.
