# Sprint 05 — Tech-Debt Cleanup — Status

**Branch target:** feature branches off `main` (fork `maguila-gus25/MyUFSC`), Conventional
Commits, merged via PR. **Theme:** pay down cross-cutting tech debt (issues #20, #18, #16, #17, #19).

| Phase | State |
|---|---|
| Plan (backlog + architect plan) | ✅ done — `backlog.md`, `plan.md` |
| Gate 1 (approval to build) | ✅ **approved** (2026-07-24) — T1–T5, baseline `core-web-vitals`, **T6 deferred** |
| Run (engineers implement tasks) | 🔄 in progress (`/sprint-run`) |
| Review (build/lint/test/parity + PR) | ⬜ not started (`/sprint-review`) |

## Headline finding
Architect verification shows the issue text is **stale for 4 of 5 items** — most of this
"cleanup" is already done in code. Net scope: **1 real tooling task + 2 tiny extractions +
3 doc/close-as-invalid fixes.** Full table in `plan.md` §Ground-truth.

## Tasks (initial — not yet dispatched)
| # | Task | Owner | Issue | Depends | Droppable | State |
|---|---|---|---|---|---|---|
| T1 | Install ESLint + flat config, `eslint .` script | backend-engineer | #20 | — | no (P0) | ⬜ |
| T2 | Verify #19 reachability, close as invalid, fix stale notes | frontend-engineer | #19 | — | no | ⬜ |
| T3 | Close #16 (already unified), fix cache docs | frontend-engineer | #16 | — | no | ⬜ |
| T4 | Point `timetable.tsx` + `update-professors.ts` at canonical normalizer | backend-engineer + fe | #18 | T1 | no | ⬜ |
| T5 | Extract `computeCurriculumStatusMap` + golden-master test | frontend-engineer | #17 | T1 | yes | ⬜ |
| ~~T6~~ | ~~Unify placeholder predicate across visualizers~~ | — | #17 | — | **DEFERRED at Gate 1** | ⏭️ |

## Maintainer decisions required at Gate 1
1. **US-1 baseline ruleset** — no prior ESLint config exists; adopt Next 16
   `next/core-web-vitals` as baseline and **record (not fix)** the first-ever lint findings? (recommended: yes)
2. **US-4 Step 4b (T6)** — unifying the drifted placeholder regex can change the electives
   grid's course set. Ship 4b only with sign-off or a proven-empty parity diff; otherwise
   ship T5 (4a) only and defer T6. (recommended: defer T6 unless parity diff is empty)

## Deferred → stay as issues
#15 (hook waterfall), #21 (professor-rating umbrella), all plan-generator issues, and
triaging the pre-existing ESLint findings T1 surfaces (follow-up issue).
