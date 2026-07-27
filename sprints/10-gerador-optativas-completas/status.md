# Sprint 10 — "Gerador: optativas completas + turnos gerais" — Status

**Theme:** finish the elective story (plan reaches the 288h target) + verify mixed-turno capacity.
**Branch:** `claude/sprint-planning-i25yap` (restarted from `main` after Sprint 09 merged).

| Phase | State |
|---|---|
| Plan | ✅ `backlog.md`, `plan.md` |
| Gate 1 | ✅ approved — "faça sprint cycle" (proposed defaults) |
| Run | ✅ US-1, US-2 landed; US-3 deferred |
| Review | ✅ all green (`review.md`) |
| Gate 2 (PR) | ✅ opened |

## Tasks
| # | Task | Story | State |
|---|---|---|---|
| T1 | `electiveOnlySemesters` on PlanScenario | US-1 | ✅ |
| T2 | append elective-only semesters until demand met | US-1 | ✅ |
| T3 | elective-only tail semester tests | US-1 | ✅ |
| T4 | modal note for elective-only semesters | US-1 | ✅ |
| T5 | mixed/arbitrary turno packing tests (#10) | US-2 | ✅ |
| T6 | exhaustive B=2 promotion (#23) | US-3 | ⬜ deferred (stretch, low-impact) |

**Checks:** `pnpm run lint` ✅ exit 0 · `pnpm test` ✅ 69/69 · `pnpm run build` ✅ · `tsc --noEmit` ✅

## Deferred (kept as issues)
#23 exhaustive B=2 (stretch, not started) · #12 · #13 · #14 · #22 · #25/#9 · #17/#30 · #31.
