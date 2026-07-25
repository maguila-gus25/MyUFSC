# Sprint 06 — Cleanup + Perf — Technical Plan

**Stories:** #29 (triage & resolve 63 lint findings) · #15 (collapse the `/` hook waterfall).
**Verified totals** (`npx eslint . -f json`, exit 1): **63** findings.
By rule: `set-state-in-effect` 25 · `exhaustive-deps` 12 · `immutability` 8 · `rules-of-hooks` 7 · `refs` 6 · `no-unescaped-entities` 4 · "parse error" 1.

Two corrections to the recon after reading the actual output:
- The **"parse error" is not a parse error and not a config gap.** It is an *unused
  eslint-disable directive* at `components/schedule/timetable.tsx:338` — a stale
  `// eslint-disable ... react-hooks/exhaustive-deps` whose rule now passes there. Fix = delete the directive. Zero risk. (Timetable's real `exhaustive-deps` findings are at lines 113 and 419, different lines.)
- `CourseHighlighter.tsx`'s 9 findings are **not** all "access before declare": 6 are
  `immutability` (access-before-declare), 2 are `refs` (reading `dashboardRef.current` in the dep array at line 87), and 1 is `exhaustive-deps` (same line 87). They collapse into one file-scoped fix.

These are the React Compiler ruleset shipped by `eslint-config-next` 16 (`eslint.config.mjs` spreads `eslint-config-next/core-web-vitals`, which already ignores `components/ui/**`, `scrapers/**`, data trees).

---

## Part 1 — #29 lint triage

Buckets: **(a) real bug → fix** · **(b) mechanical → fix** · **(c) intentional pattern → narrowly-scoped `// eslint-disable-next-line <rule> -- <reason>`.** No file-wide or blanket disables.

### Triage table

| Cluster (rule · files) | Cnt | Bucket | Disposition | Risk |
|---|---|---|---|---|
| **rules-of-hooks** — `curriculum-visualizer.tsx:81,112,122,128` · `progress-visualizer.tsx:94,132,142` | 7 | **(a)** | Real bug: an early `if (!curriculum)` / `if (!studentPlan)` guard sits **between** hook calls (`curriculum-visualizer.tsx:66`, `progress-visualizer.tsx:76`), so the hooks after it are called conditionally. Fix: **hoist the guard above every hook** (top of component body). | **Low.** In practice the guard never fires today — earlier hooks (`generatePhases(curriculum)` at line 46, `useCourseMap` etc.) already dereference the value, so a null would have thrown first. Relocating the guard is behavior-neutral. Spot-verify both grids still render. |
| **immutability / "access before declare"** — `CourseHighlighter.tsx:31,32,33,83,84,85` · `dependency-tree.tsx:43` · `ResizablePanel.tsx:77` | 8 | **(a)** | Effects/callbacks reference helper `const fn = () => …` declared **below** them. Fix: convert those helpers from `const` arrow assignments to **hoisted `function` declarations** (or move above the referencing hook). For `CourseHighlighter` that is `addHighlightStyles`/`applyTransitions`/`addOverlay`/`cleanupHighlights`/`removeHighlightStyles`/`removeOverlay`; for `dependency-tree` `cleanupDashboard`. | **Low** for CourseHighlighter/dependency-tree (pure DOM helpers, no reactive closure). **`ResizablePanel.tsx:77` is special** — `handlePointerUp` references *itself* (`removeEventListener("pointerup", handlePointerUp)`); a self-referential `useCallback`. Prefer a small refactor (hold the handler in a ref) **or** a narrow `-- self-referential removeEventListener, intentional` disable. Verify panel drag-resize + persistence still works. |
| **refs** — `CourseHighlighter.tsx:87` (×2) · `professor-details-dialog.tsx:746` · `useStableValue.ts:14,15,17` | 6 | **(a) + (c)** | `CourseHighlighter:87` reads `dashboardRef.current` **in the dep array** — **(a)** remove it from deps (refs don't trigger re-render, so it was never a reliable trigger; this also clears the `exhaustive-deps:87` and the 2 `refs:87` at once). `professor-details-dialog:746` (`voteStateRef.current = voteState` in render) and `useStableValue.ts:14-17` (deep-equal ref cache read/written in render) are **legit, well-known patterns** → **(c)** narrow per-line disable with reason. | **Low.** Removing `dashboardRef.current` from deps: effect keys on `courseElements`/`course.id` which already change together with the ref target. useStableValue/vote-ref: no behavior change (disable only). |
| **no-unescaped-entities** — `professor-search.tsx:242` · `search-popup.tsx:335` | 4 | **(b)** | Mechanical: escape `'`/`"` (`&apos;`/`&quot;`) or wrap in `{'…'}`. | **None.** |
| **stale disable directive** — `timetable.tsx:338` | 1 | **(b)** | Delete the unused `// eslint-disable` line. | **None.** |
| **exhaustive-deps (non-hook-waterfall)** — `dependency-tree.tsx:41,46,53` · `professor-details-dialog.tsx:756` · `search-popup.tsx:108` · `timetable.tsx:113,419` · `grid-visualizer.tsx:162` | 8 | **(b) or (c)** case-by-case | If the missing dep is trivially stable/correct to add → **(b)** add it. If adding it would **change effect timing / re-run frequency** (the effect intentionally runs once or on a narrower key) → **(c)** narrow disable with a written reason. Engineer decides per line after reading. | **Medium — flagged.** `exhaustive-deps` additions can change *when* an effect fires. Any addition must be paired with a render smoke-test of that component; when in doubt, disable-with-reason over a risky auto-add. |
| **exhaustive-deps (loading hooks)** — `UseCurriculum.ts:219` · `UseSchedule.ts:150` · `useStudentProfile.ts:129` | (3 of the 12 above) | **(c)** | These deliberately omit deps (signature-guard / ref-gated fetch pattern). Narrow disable with reason. **Handle inside the #15 task** (same files) so the disable is written against the *post-#15* effect. | Low, but sequence with #15 (see Part 3). |
| **set-state-in-effect** — 25 findings across 18 files | 25 | **mixed (c) + defer** | See split below. | Judgment-heavy. |

### `set-state-in-effect` (25) — split and cut line

This is the pure-judgment cluster. Split case-by-case (NOT a blanket disable):

- **Legit external-sync / measure-and-store → (c) narrow disable, ship now.**
  `hooks/use-mobile.tsx:14` (matchMedia subscription), `ResizablePanel.tsx:57` (hydrate persisted height from `localStorage`), `useDashboardRef.ts:13`, `curriculum-visualizer`/`progress-visualizer` ResizeObserver measure effects, and the **loading-flag setters** in the four setup hooks (`LoadUser.ts:41`, `UseCurriculum.ts:95`, `UseSchedule.ts:42`, `useStudentProfile.ts:40`) — these set `isLoading`/hydrate from async I/O, which is exactly what effects are for. Each gets a one-line `-- external sync, not derivable in render` reason.
- **Genuine "you-might-not-need-an-effect" → defer to follow-up issue, justified-disable now.**
  Candidates where state is *derived from props/state* and the effect is avoidable: `progress-visualizer.tsx:72` (`setLastUpdate(Date.now())` on `studentPlan` change — verify it even has a consumer), `professor-search.tsx:38`, `details-panel.tsx:57,181`, `search-popup.tsx:164,216`, `custom-events-overlay.tsx:125`, `plan-generator-modal.tsx:91,98`, `degree-selector.tsx:154`, `custom-event-modal.tsx:67`, `Header.tsx:114`, `register-client.tsx:88,205`, `setup-client.tsx:67`. These need behavior-preserving redesign + manual verification per component — too many to do safely in one sprint alongside #15.

**Recommended cut line (Gate 1 decision #1):**
> Ship in-sprint: **all (a) real bugs + all (b) mechanical + all (c) narrow disables** (including the external-sync `set-state` subset and the loading-hook `exhaustive-deps`). **Defer the actual "you-might-not-need-an-effect" refactors** to a new follow-up issue; cover them *now* with narrowly-scoped justified disables so `pnpm run lint` still exits 0.

This satisfies the AC: `rules-of-hooks` (7) and the `CourseHighlighter` access-before-declare are fixed as real defects, not suppressed; the linter reaches exit 0; only genuine-refactor `set-state-in-effect` cases are deferred, and they are *justified-disabled, not silently ignored*. All 63 reach green this sprint.

---

## Part 2 — #15 collapse the `/` waterfall

### Current dependency chain (`app/page.tsx:29-56`)
1. `useCheckAuth()` → `GET /api/user/auth/check` → sets `userId`, `authCheckCompleted`.
2. `useStudentProfile({userId, …})` — gated on `userId` — `GET /api/user/profile/:userId`. **The response already bundles `prefetched.curriculums` + `prefetched.schedules`** (server route reads the `ufsc_prefetch_degrees` cookie, `route.ts:52-98`) and primes both caches (`cacheCurriculum` + `primeScheduleCache`, `useStudentProfile.ts:57-76`) before `setStoreStudentInfo`.
3. `useCurriculum({studentInfo, isProfileLoading})` — gated on `!isProfileLoading` + `studentInfo` — `GET /api/degree-programs` + `GET /api/curriculum/:id` per degree, **skipped on a cache hit** from step 2's prefetch (`UseCurriculum.ts:179`).
4. `useSchedule({studentInfo, isProfileLoading, isCurriculumLoading})` — gated on `!isProfileLoading` **and `!isCurriculumLoading`** + `studentInfo` — `GET /api/schedule` per degree, **skipped when primed** by step 2 (`UseSchedule.ts:76` → `fetchClassSchedule` cache hit).

### True vs incidental dependencies
- **auth → profile: TRUE.** Need `userId` to fetch the profile. (Returning/guest users: Zustand persists `studentInfo` synchronously, so the profile fetch only fires when the store is empty but a `userId` exists — `useStudentProfile.ts:39`.)
- **profile → curriculum: TRUE.** Curriculum needs the decrypted degree list (`studentInfo.currentDegree` + `interestedDegrees`). But when the prefetch cookie is present the caches are already primed, so this is a **cache hit, not a round-trip**.
- **curriculum → schedule: FALSE (incidental).** `useSchedule` gates on `isCurriculumLoading` but consumes **no** curriculum-hook output — it derives its degree set from the same `studentInfo.currentDegree` + `interestedDegrees` (`UseSchedule.ts:54-58`). The `isCurriculumLoading` gate is serialization by habit. **This is the win.**

### Chosen minimal approach — decouple schedule from curriculum (Option ii)
Remove `useSchedule`'s dependency on `isCurriculumLoading`; gate it on `!isProfileLoading` + `studentInfo` only. Curriculum and schedule then fetch **concurrently** off the same `studentInfo`. This is the true-dependency-correct change with the smallest blast radius (one hook + one prop in the page). No server change: the prefetch bundle already ships curriculum+schedule with the profile and is already the default whenever the cookie exists — the remaining serialization was purely the curriculum→schedule gate.

**Explicitly NOT doing** (over-engineering / higher risk, deferred): merging auth+profile into one request, SSR-ing first paint, or extending the profile route to prefetch on the very first (cookie-less) load. Those touch true deps or the backend for marginal gain.

### Files / functions touched (frontend only)
- `hooks/setup/UseSchedule.ts` — drop `isCurriculumLoading` from `UseScheduleProps`, from the early gate (`:41`), and from the dep array (`:150`). Keep everything else: the `!studentInfo || !currentDegree` guard, the signature guard, the `LATEST`→concrete-semester pre-emption + `primeScheduleCache`, and `isScheduleLoading`.
- `app/page.tsx:52-56` — stop passing `isCurriculumLoading` to `useSchedule`.
- `docs/data-loading-hooks.md` — update the sequence diagram (curriculum ∥ schedule).

### Invariants to preserve
- Schedule never fetches before degree IDs are known (keep `!studentInfo`/`!currentDegree` guard + `!isProfileLoading` gate).
- Signature guard + `LATEST`→concrete-semester pre-emption unchanged (no double-fetch when the server resolves the latest semester).
- `isScheduleLoading` still feeds `app/page.tsx`'s loading gate (`:164-167`) and the redirect effect (`:76-95`) — unchanged, just no longer transitively waits on curriculum.
- Guest/anonymous path: `studentInfo` from persisted store → `isProfileLoading` false quickly → curriculum & schedule both fire in parallel. Unchanged semantics.
- `primeScheduleCache` from the prefetch bundle still short-circuits the schedule fetch.

### Round-trip count before/after

| Scenario | Before | After |
|---|---|---|
| Cold authed, **no** prefetch cookie (first-ever load) | 4 serial | **3** — auth → profile → (curriculum ∥ schedule) |
| Warm authed, prefetch cookie valid (returning, degrees unchanged) | 2 network + serial render ticks | **2** — curriculum ∥ schedule both cache-hit, no extra serial tick |
| Guest (store hydrated synchronously) | 2 serial (curriculum → schedule) | **1** — curriculum ∥ schedule |

---

## Part 3 — Task breakdown (owner · sequence · droppable?)

Backend: **none required** — the prefetch bundle already exists in `route.ts`. `backend-engineer` only enters if Gate 1 elects to prefetch on the cookie-less first load (out of scope; recommend no).

| # | Task | Owner | Depends on | Droppable? |
|---|---|---|---|---|
| **T6** | **#15**: decouple `UseSchedule` from `isCurriculumLoading` (`UseSchedule.ts` + `app/page.tsx` + doc). **Also, while in these files, apply #29's `hooks/setup/*` dispositions**: narrow justified disables for `set-state-in-effect` (`LoadUser:41`, `UseCurriculum:95`, `UseSchedule:42`, `useStudentProfile:40`) and `exhaustive-deps` (`UseCurriculum:219`, `UseSchedule:150`, `useStudentProfile:129`) against their **final** form. | frontend | — | No (core of #15) |
| **T1** | #29-(a) rules-of-hooks: hoist guards in `curriculum-visualizer.tsx` + `progress-visualizer.tsx`. | frontend | — | No |
| **T2** | #29-(a) access-before-declare: convert helper consts → function declarations in `CourseHighlighter.tsx` + `dependency-tree.tsx`; handle `ResizablePanel.tsx:77` self-reference (ref or narrow disable). **Fold the `CourseHighlighter:87` refs+deps fix in here** (same file). | frontend | — | No |
| **T3** | #29-(a/c) remaining refs: `professor-details-dialog.tsx:746` + `useStableValue.ts:14-17` narrow disables. | frontend | — | No |
| **T4** | #29-(b) mechanical: `no-unescaped-entities` (4), delete stale disable `timetable.tsx:338`, trivially-correct `exhaustive-deps` additions. | frontend | — | No |
| **T5** | #29-(c) component `set-state-in-effect`: external-sync subset → narrow disables (ship). "You-might-not-need-an-effect" subset → **defer to follow-up issue**, justified-disable now. Also the non-hook `exhaustive-deps` judgment calls. | frontend | T1–T4 land first to reduce churn | **Partial** — the refactors defer; the disables are not droppable (needed for exit 0) |
| **T7** | Verification: lint (exit 0) + build + test + manual `/` smoke via the `run`/`verify` skill. | frontend | all | No |

**Overlap handling (`hooks/setup/*` between #29 and #15):** the `set-state`/`exhaustive-deps` findings in `UseSchedule.ts` sit on the exact lines #15 rewrites. To avoid rework, **T6 owns those files end-to-end** — it does the #15 change *and* writes the justified disables against the finished effect. The standalone #29 tasks (T1–T5) touch **components only**. Recommended order: **T6 first** (or in parallel with T1–T4 since files don't overlap), then T5, then T7.

---

## Part 4 — Verification strategy

- **`pnpm run lint` → exit 0** (the AC gate). Re-run `npx eslint . -f json` to confirm 0 messages and **no new unused-disable directives** (over-broad disables self-report as findings).
- **`pnpm run build`** — catches the rules-of-hooks guard relocation and function-declaration hoisting at type/compile level.
- **`pnpm run test`** — `node --import tsx --test lib/*.test.ts lib/plan-generator/*.test.ts` (42 tests). No touched file is under test, so this only guards against collateral import breakage; must stay green.
- **Manual `/`-load smoke (use the `run`/`verify` skill on the real app):**
  - Guest new (no plan) → welcome screen; Guest with plan → dashboard; Authed cold load → dashboard. Confirms auth gating + guest path after the #15 gate change.
  - Curriculum phase grid renders (T1 `curriculum-visualizer` guard) and progress lanes render (T1 `progress-visualizer`).
  - Dependency-tree overlay opens and the depth-staggered highlight animation plays (T2 `CourseHighlighter` — the highest-churn file).
  - Resizable panel drag-resize + height persistence across reload (T2 `ResizablePanel` self-referential handler).
  - Timetable renders + semester selector switches semesters (guards T6 `UseSchedule` change: `LATEST`→concrete-semester, no double fetch, no schedule fetch before degrees known).
  - Professor details dialog: vote debounce still works (T3 `voteStateRef`).
- **Behavior-change risk watchlist (from the triage):**
  - `exhaustive-deps` **additions** (T4/T5) — can change effect timing; smoke-test each affected component, prefer disable-with-reason when uncertain.
  - `ResizablePanel.handlePointerUp` reorder (T2) — verify pointer capture add/remove symmetry.
  - `UseSchedule` gate change (T6) — verify no schedule request fires before `studentInfo`/degrees are known and the semester pre-emption still suppresses the second fetch.
- Record the round-trip before/after table in `review.md` per #15's AC.

---

## Part 5 — Deferred (tracked as a new follow-up issue)

- The genuine **"you-might-not-need-an-effect"** `set-state-in-effect` refactors (the ~14 component cases listed in Part 1). Justified-disabled now (linter still exits 0); real fix deferred because each needs behavior-preserving redesign + per-component manual verification — unsafe to batch alongside #15 in one sprint.
- Fuller `/` waterfall collapse (auth+profile merge, SSR first paint, cookie-less first-load prefetch). Higher risk / backend surface; the schedule∥curriculum decouple already captures the safe win.
- Non-goals per backlog: #30/#17 remainder, #21 professor-rating umbrella, all plan-generator/optativas/prerequisites issues.

---

## Gate 1 — decisions for the maintainer

1. **#29 cut line** (Part 1): fix all real-bug + mechanical + structural clusters fully; **justified-disable the pure-judgment `set-state-in-effect` refactors now and defer the actual refactors** to a follow-up issue. Linter still exits 0. **Approve, or fix all 25 `set-state` cases in-sprint?**
2. **#15 aggressiveness** (Part 2): smallest safe win = **decouple schedule from curriculum only** (one hook + one prop, no auth/profile merge, no server change). **Approve, or pursue the fuller collapse** (higher risk, backend surface)?
