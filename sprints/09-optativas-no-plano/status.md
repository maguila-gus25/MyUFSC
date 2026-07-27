# Sprint 09 — "Optativas no Plano" — Status

**Theme:** model electives (optativas) in the plan generator — schedule them, report them
honestly. First "Phase 2" work after four sprints of mandatory-only packing.
**Branch target:** `sprint/09-optativas-no-plano` off `main`. Conventional Commits, PR into main.

| Phase | State |
|---|---|
| Plan (backlog + architect plan) | ✅ done — `backlog.md`, `plan.md` |
| Gate 1 (approval to build) | ✅ approved — "faça sprint cycle" with proposed defaults |
| Run (engineers implement) | ✅ done — all tasks landed |
| Review (lint / build / test / acceptance) | ✅ done — all green (`review.md`) |
| Gate 2 (PR) | ✅ PR [#41](https://github.com/maguila-gus25/MyUFSC/pull/41) updated in place (draft) |

## Proposed stories
| Story | Issue(s) | Summary |
|---|---|---|
| US-1 | #7 | Pack real optativas into scenarios (greedy post-pass after mandatory) |
| US-2 | #24, #8 | Modal shows optativas placed vs remaining; no false "concluído" |
| US-3 | #11 | Re-tag Atividades Complementares as non-mandatory at ingestion |
| T7 | #40 | CLAUDE.md professors directory-map doc cleanup (cheap carry-over) |

## Tasks
| # | Task | Story | State |
|---|---|---|---|
| T1+T2 | offered-optativa pool + fill into free slots after mandatory packing (`electives.ts`, wiring) | US-1 | ✅ |
| T3 | zero-demand parity + placement tests (`electives.test.ts`) | US-1 | ✅ |
| T4 | expose `optativasPlacedHours` on PlanScenario | US-2 | ✅ |
| T5 | modal placed-vs-remaining copy + completion gate | US-2 | ✅ |
| T6 | re-tag Atividades Complementares at ingestion (+migration +test +bucket hardening) | US-3 | ✅ |
| T7 | refresh stale WriteReviewDialog/refreshKey doc references | #40 | ✅ |

**Checks:** `pnpm run lint` ✅ exit 0 · `pnpm test` ✅ 61/61 · `pnpm run build` ✅ · `tsc --noEmit` ✅

## Gate 1 questions for the maintainer
1. Elective "already earned" identity — by id only, or via equivalence map? (proposed: equivalence)
2. Optativa selection when pool > demand — deterministic by id/phase (proposed) vs rating-aware (#13, deferred)?
3. US-3 prod re-ingestion accepted as a maintainer follow-up (this sprint ships code+migration+tests only)?

## Deferred to backlog (not this sprint)
- #12 per-course accept/reject · #13 rating-aware section tie-break · #14 full-repack variant
- #23 exhaustive B=2 promotion · #22 real-case regression fixture (needs maintainer data)
- #25/#9 AND-of-OR prerequisites · #17/#30 GridVisualizer dedupe · #31 set-state-in-effect
