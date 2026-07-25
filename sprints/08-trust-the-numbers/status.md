# Sprint 08 — "Trust the Numbers" — Status

**Theme:** correctness/completeness of what the UI shows — professor reviews + plan-generator reminder.
**Branch target:** `sprint/08-trust-the-numbers` off `main` (fork). Conventional Commits, PR into main.

| Phase | State |
|---|---|
| Plan (backlog + architect plan) | ✅ done — `backlog.md`, `plan.md` |
| Gate 1 (approval to build) | ✅ approved (2026-07-25) — US-1/2/3, stretch US-4 deferred |
| Run (engineers implement) | 🔄 in progress |
| Review (lint / build / test / acceptance) | ⬜ pending |
| Gate 2 (approval to open PR) | ⬜ pending |

## Tasks
| # | Task | Story | State | Commit |
|---|---|---|---|---|
| T1 | refactor(curriculum): export isRealElective predicate | US-2 | ✅ | `1c25133` |
| T2 | feat(plan-generator): compute remaining complementares/optativas hours | US-2 | ✅ | |
| T3 | fix(plan-generator): modal reminder copy for remaining hours | US-2 | ⬜ | |
| T4 | fix(professors): scope reply drafts per target | US-3 | ⬜ | |
| T5 | feat(professors): paginate professor-details reviews endpoint | US-1 | ⬜ | |
| T6 | feat(professors): "carregar mais" load-more in dialog | US-1 | ⬜ | |
| T7 | docs(professors): mark already-fixed rating issues resolved | — | ⬜ | |

## Deferred to backlog
- US-4 scheduler real-case regression test (#22).
- GridVisualizer status-logic dedupe (#17/#30).
