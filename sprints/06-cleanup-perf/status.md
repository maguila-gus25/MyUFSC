# Sprint 06 — Cleanup + Perf — Status

**Theme:** finish Sprint 05 cleanup (#29 lint → exit 0) + top perf debt (#15 hook waterfall).
**Branch target:** `sprint/06-cleanup-perf` off `main` (fork), Conventional Commits, PR into main.

| Phase | State |
|---|---|
| Plan (backlog + architect plan) | ✅ done — `backlog.md`, `plan.md` |
| Gate 1 (approval to build) | ✅ **approved** (2026-07-24) — #29 disables+defer, #15 decouple-only |
| Run (engineers implement) | 🔄 in progress |
| Review + Gate 2 (PR) | ⬜ not started |

## Headline findings (architect verification)
- **#15 key insight:** `curriculum → schedule` is a **FALSE dependency** — `useSchedule`
  gates on `isCurriculumLoading` but consumes zero curriculum output. Removing the gate lets
  them fetch concurrently. Round-trips: cold **4→3**, guest **2→1**. Frontend-only, no server change.
- **#29 real bugs found:** `rules-of-hooks` (7) is a genuine conditional-hook violation (a
  guard sits between hook calls in both visualizers → hoist it); 8 access-before-declare
  (const arrows used before declaration → convert to `function`). The "parse error" is just a
  stale `eslint-disable` line at `timetable.tsx:338` (delete).

## Tasks (initial — not dispatched)
| # | Task | Owner | Depends | Droppable |
|---|---|---|---|---|
| T6 | #15: decouple `UseSchedule` from `isCurriculumLoading` + own `hooks/setup/*` #29 disables | frontend | — | no |
| T1 | #29 rules-of-hooks: hoist guards in both visualizers | frontend | — | no |
| T2 | #29 access-before-declare: `CourseHighlighter` + `dependency-tree` + `ResizablePanel` | frontend | — | no |
| T3 | #29 refs: `professor-details-dialog` + `useStableValue` narrow disables | frontend | — | no |
| T4 | #29 mechanical: unescaped entities, stale disable, trivial deps | frontend | — | no |
| T5 | #29 `set-state-in-effect`: ship external-sync disables, defer real refactors | frontend | T1–T4 | partial |
| T7 | Verify: lint exit 0 + build + test + `/` smoke | frontend | all | no |

## Gate 1 — decisions required
1. **#29 cut line** — fix all real-bug/mechanical/structural; **justified-disable** the
   pure-judgment `set-state-in-effect` refactors (~14 component cases) now and **defer** the
   real refactors to a follow-up issue (linter still exits 0). *(recommended: yes)*
2. **#15 scope** — decouple schedule from curriculum **only** (1 hook + 1 prop, no backend),
   vs the fuller collapse (auth/profile merge, higher risk). *(recommended: decouple only)*

## Deferred → follow-up issue
~14 genuine "you-might-not-need-an-effect" `set-state` refactors · fuller waterfall collapse ·
all non-goals (#30, #21, plan-generator/optativas/prerequisites).
