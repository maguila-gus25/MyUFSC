# Sprint 06 — Cleanup + Perf — Backlog

**Theme:** Finish the Sprint 05 cleanup and pay down the top perf debt.
**Source:** GitHub issues on the fork (`maguila-gus25/MyUFSC`): #29, #15.
**Non-goal:** plan-generator features, professor-rating features, optativas accounting.

**Synergy:** the four loading hooks (#15's target — `useStudentProfile`, `UseCurriculum`,
`UseSchedule`, `LoadUser`) also carry lint findings (#29), so the two stories overlap in
`hooks/setup/`. Sequence them to avoid rework.

---

## US-1 — Make the linter clean / triaged (#29) · `tooling`

**As a** contributor / CI, **I want** `pnpm run lint` to exit 0 (or only known, justified
findings), **so that** lint becomes a real CI gate instead of a wall of noise.

Sprint 05 turned the linter on; it surfaced **63 pre-existing findings**. This story
triages and resolves them by category — **not** blanket-suppression.

**Verified finding tally (from `eslint . -f json`):**
| Rule | Count | Nature |
|---|---|---|
| `react-hooks/set-state-in-effect` | 25 | judgment — some are real "you-might-not-need-an-effect", some legit sync |
| `react-hooks/exhaustive-deps` | 12 | judgment — real missing deps vs intentional |
| `react-hooks/immutability` | 8 | likely real |
| `react-hooks/rules-of-hooks` | 7 | **likely real bugs** |
| `react-hooks/refs` | 6 | likely real |
| `react/no-unescaped-entities` | 4 | mechanical, safe |
| parse error | 1 | investigate |

Worst files: `CourseHighlighter.tsx` (9 — "access before declare"), `search-popup.tsx` (5),
`dependency-tree.tsx` / `professor-details-dialog.tsx` / `curriculum-visualizer.tsx` /
`progress-visualizer.tsx` (4 each).

**Acceptance criteria**
- Every finding is **categorized**: (a) real bug → fixed; (b) mechanical → fixed;
  (c) intentional pattern → narrowly-scoped `// eslint-disable-next-line <rule> -- <reason>`
  with a written justification (no file-wide or blanket disables).
- The `rules-of-hooks` (7) and `CourseHighlighter` access-before-declare (9) clusters are
  **fixed as real defects**, not suppressed, unless proven benign in writing.
- `pnpm run lint` exits 0.
- `pnpm run build` + `pnpm run test` stay green; no behavior regression (spot-verify the
  touched components render/behave the same).
- Scope may be **time-boxed**: if 63 is too many for one sprint, fix the real-bug + mechanical
  clusters fully and defer the pure-judgment `set-state-in-effect` refactors to a follow-up
  issue — but the linter must still exit 0 (deferred ones get justified disables). The plan
  decides the cut line.

**Priority:** P1.

---

## US-2 — Collapse the sequential hook waterfall on `/` (#15) · `tech-debt` / perf

**As a** user hitting `/` cold, **I want** the dashboard to load with fewer serial
round-trips, **so that** first paint of my plan is faster.

Today `app/page.tsx` runs 4 hooks **sequentially**: `useCheckAuth` → `useStudentProfile`
→ `useCurriculum` → `useSchedule` (each waits for the previous). CLAUDE.md documents a
`prefetched` short-circuit (profile endpoint bundles curriculum+schedule, keyed off the
`ufsc_prefetch_degrees` cookie) that already exists but the waterfall persists.

**Acceptance criteria**
- The cold-load dependency chain is shortened: independent fetches run concurrently rather
  than strictly serially, OR the existing `prefetched` bundle path is made the default so
  curriculum+schedule don't re-round-trip after the profile.
- Correctness preserved: auth gating, degree resolution, and the guest (anonymous) path all
  still work; no request is fired before its true data dependency is ready.
- No regression in the store hydration / `updateView` behavior.
- Measured or reasoned before/after of the round-trip count on `/` documented in `review.md`
  (exact timing is hard locally; a round-trip-count argument is acceptable).
- Changes stay within `app/page.tsx` + `hooks/setup/*` (+ the profile API only if the
  prefetch bundle needs extending).

**Priority:** P2 — larger blast radius; may be scoped to a safe subset (e.g. parallelize
curriculum+schedule) with the full waterfall collapse deferred if risk is high.

---

## Deferred (not this sprint)
- #30 (#17 Step 4b regex reconciliation), #17 remainder · #21 professor-rating umbrella
- All plan-generator / optativas / prerequisites issues (#7–#14, #22–#25)
- Any lint clusters the plan explicitly time-boxes out (tracked as a follow-up issue)
