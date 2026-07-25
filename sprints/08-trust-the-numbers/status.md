# Sprint 08 — "Trust the Numbers" — Status

**Theme:** correctness/completeness of what the UI shows — professor reviews + plan-generator reminder.
**Branch target:** `sprint/08-trust-the-numbers` off `main` (fork). Conventional Commits, PR into main.

| Phase | State |
|---|---|
| Plan (backlog + architect plan) | ✅ done — `backlog.md`, `plan.md` |
| Gate 1 (approval to build) | ✅ approved (2026-07-25) — US-1/2/3, stretch US-4 deferred |
| Run (engineers implement) | ✅ done — all 7 tasks landed |
| Review (lint / build / test / acceptance) | ⬜ pending |
| Gate 2 (approval to open PR) | ⬜ pending |

## Tasks
| # | Task | Story | State | Commit |
|---|---|---|---|---|
| T1 | refactor(curriculum): export isRealElective predicate | US-2 | ✅ | `1c25133` |
| T2 | feat(plan-generator): compute remaining complementares/optativas hours | US-2 | ✅ | `6d4cae6` |
| T3 | fix(plan-generator): modal reminder copy for remaining hours | US-2 | ✅ | `7f83aae` |
| T4 | fix(professors): scope reply drafts per target | US-3 | ✅ | `532d51e` |
| T5 | feat(professors): paginate professor-details reviews endpoint | US-1 | ✅ | `904d462` |
| T6 | feat(professors): "carregar mais" load-more in dialog | US-1 | ✅ | `4b22f82` |
| T7 | docs(professors): mark already-fixed rating issues resolved | — | ✅ | `f68f9fa` |

## Deferred to backlog
- US-4 scheduler real-case regression test (#22).
- GridVisualizer status-logic dedupe (#17/#30).

## Notes for Gate 2 / review phase
- Sequencing followed exactly as planned: T1→T2→T3 (US-2 chain), T4 before T6, T5 before T6, T7 last.
- No file collisions: each task's diff was scoped to its own files, verified after every commit.
- CLAUDE.md's directory-map row for `ProfessorDetailsDialog` (`refreshKey full-reload pattern`) and its `WriteReviewDialog` component-list entry are now stale (both patterns were removed) — flagged by the T7 engineer as a possible follow-up, out of this sprint's stated scope (only the "Known architecture issues" bullets and the professor-rating-architecture-issues.md doc were in scope for T7).
