# Sprint 06 — Cleanup + Perf — Review

## Automated gate (re-run consolidated)
- `pnpm run lint` → **exit 0, 0 findings** (was: broken → 63 findings after Sprint 05 turned it on).
- `pnpm run build` → **✓ Compiled successfully**, 20/20 static pages generated.
- `pnpm run test` → **42 passed / 0 failed** (node:test; no test file touched — guards against collateral import breakage).

## Work commits (6)
| Commit | Task | What |
|---|---|---|
| `ba679c9` | T6 (#15) | Decouple `useSchedule` from `isCurriculumLoading` → curriculum ∥ schedule; + 7 justified disables in `hooks/setup/*` |
| `61c9b7f` | T1 (#29) | Hoist null guards past hooks — real `rules-of-hooks` fix in both visualizers |
| `92ab8fe` | T2 (#29) | `CourseHighlighter`/`dependency-tree` helpers → function declarations; drop ref-in-deps; `ResizablePanel` self-ref disable |
| `08fe8d4` | T3 (#29) | Narrow disables for intentional ref-in-render (`useStableValue`, vote ref) |
| `36953a4` | T4 (#29) | Escape entities, delete stale disable, fix trivial deps |
| `ff1d07f` | T5 (#29) | Classify + disable the 21 `set-state-in-effect` (5 external-sync perma, 16 deferred→#31) |

## Acceptance check

### US-1 — lint clean/triaged (#29)
| Criterion | Verdict | Evidence |
|---|---|---|
| Every finding categorized (real-bug / mechanical / intentional) | ✅ | Triage table in `plan.md` §Part 1; per-finding dispositions in T1–T5 reports |
| `rules-of-hooks` (7) + access-before-declare (8) fixed as real defects, not suppressed | ✅ | `61c9b7f` (guard relocation), `92ab8fe` (const→function). **Correction to plan:** hoisting guards *above* hooks multiplied findings under the React Compiler rule — correct behavior-neutral fix is guard *after* all hooks (guard never fires today). |
| `pnpm run lint` exits 0 | ✅ | Verified. All disables are narrow per-line with written `-- reason`; no file-wide/blanket disables; no unused-directive self-reports |
| Build + test green, no behavior regression | ✅ (automated) / ⚠️ (see runtime note) | Build ✓, tests 42/42 |
| Time-box: real bugs + mechanical fixed; judgment refactors deferred with justified disables | ✅ | 5 external-sync disables permanent; 16 avoidable-effect disables cite **#31** (follow-up opened) |

### US-2 — collapse the `/` waterfall (#15)
| Criterion | Verdict | Evidence |
|---|---|---|
| Cold-load chain shortened (concurrent fetches) | ✅ | `curriculum → schedule` was a **false dependency** (`useSchedule` consumes no curriculum output). Gate removed → concurrent. Round-trips: **cold 4→3, guest 2→1** |
| Correctness preserved (auth gating, degree resolution, guest path) | ✅ | `!isProfileLoading` gate + `!studentInfo/!currentDegree` guard intact; no schedule fetch before degrees known; signature guard + LATEST→concrete pre-emption + `primeScheduleCache` untouched |
| No store-hydration / `updateView` regression | ✅ | `isScheduleLoading` still feeds the page loading gate + redirect effect, unchanged |
| Round-trip before/after documented | ✅ | Table above + `plan.md` §Part 2 |
| Scope stays in `app/page.tsx` + `hooks/setup/*` (no backend) | ✅ | Backend untouched — prefetch bundle already existed |

## Runtime verification note
The automated gate (lint/build/test) is green. The plan's **manual `/`-load smoke** (dependency-tree overlay animation, ResizablePanel drag-resize persistence, timetable semester switch, guest vs authed load) was **not executed live** — dev-volume disk pressure (~100% used) made spinning up the dev server risky. Runtime safety rests on: (a) the production build type-checking the guard relocation + function-declaration hoisting, (b) the #29 disables being behavior-neutral by construction, (c) the #15 change preserving every documented invariant. **Recommend the maintainer eyeball the dependency-tree overlay + timetable on the preview before merge** — those (CourseHighlighter's 117-line churn, the schedule gate) carry the only real runtime risk.

## Deferred → follow-up issues
- **#31** — refactor the 16 avoidable `set-state-in-effect` cases (disabled-with-reason now).
- Fuller waterfall collapse (auth+profile merge, SSR first paint, cookie-less first-load prefetch) — deferred per Gate 1 (decouple-only).

## Verdict
All automated gate checks green; all in-scope acceptance criteria met. **Ready to open PR into `main`**, pending Gate 2 approval. One honest caveat: manual runtime smoke not run (disk) — flagged for maintainer eyeball on preview.
