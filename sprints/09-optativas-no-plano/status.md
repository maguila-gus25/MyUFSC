# Sprint 09 — "Optativas no Plano" — Status

**Theme:** model electives (optativas) in the plan generator — schedule them, report them
honestly. First "Phase 2" work after four sprints of mandatory-only packing.
**Branch target:** `sprint/09-optativas-no-plano` off `main`. Conventional Commits, PR into main.

| Phase | State |
|---|---|
| Plan (backlog + architect plan) | ✅ done — `backlog.md`, `plan.md` |
| Gate 1 (approval to build) | ⏳ **awaiting maintainer approval** |
| Run (engineers implement) | ⬜ not started |
| Review (lint / build / test / acceptance) | ⬜ not started |
| Gate 2 (approval to open PR) | ⬜ not started |

## Proposed stories
| Story | Issue(s) | Summary |
|---|---|---|
| US-1 | #7 | Pack real optativas into scenarios (greedy post-pass after mandatory) |
| US-2 | #24, #8 | Modal shows optativas placed vs remaining; no false "concluído" |
| US-3 | #11 | Re-tag Atividades Complementares as non-mandatory at ingestion |
| T7 | #40 | CLAUDE.md professors directory-map doc cleanup (cheap carry-over) |

## Tasks
| # | Task | Story | State | Commit |
|---|---|---|---|---|
| T1 | build offered-optativa candidate pool | US-1 | ⬜ | — |
| T2 | fill electives into free slots after mandatory packing | US-1 | ⬜ | — |
| T3 | zero-demand parity + placement tests | US-1 | ⬜ | — |
| T4 | expose optativa placed/remaining on PlanScenario | US-2 | ⬜ | — |
| T5 | modal placed-vs-remaining copy + completion gate | US-2 | ⬜ | — |
| T6 | re-tag Atividades Complementares at ingestion (+migration+test) | US-3 | ⬜ | — |
| T7 | refresh CLAUDE.md professors directory-map row | #40 | ⬜ | — |

## Gate 1 questions for the maintainer
1. Elective "already earned" identity — by id only, or via equivalence map? (proposed: equivalence)
2. Optativa selection when pool > demand — deterministic by id/phase (proposed) vs rating-aware (#13, deferred)?
3. US-3 prod re-ingestion accepted as a maintainer follow-up (this sprint ships code+migration+tests only)?

## Deferred to backlog (not this sprint)
- #12 per-course accept/reject · #13 rating-aware section tie-break · #14 full-repack variant
- #23 exhaustive B=2 promotion · #22 real-case regression fixture (needs maintainer data)
- #25/#9 AND-of-OR prerequisites · #17/#30 GridVisualizer dedupe · #31 set-state-in-effect
