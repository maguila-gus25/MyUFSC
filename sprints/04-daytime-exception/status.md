# Sprint 04 — Status

**Branch:** `sprint/04-daytime-exception` (off `main`) — **merged** to `main` as `e64d4f8`.

| Phase | State |
|---|---|
| Plan (product-owner + architect) | ✅ done — plan.md, decisions.md, backlog.md |
| Gate 1 (approval to build) | ✅ approved (2026-07-22) — build daytime-exception simulation first |
| Run — engine (backend-engineer) | ✅ done — T1–T4 |
| Run — modal render (frontend-engineer) | ✅ done — T5 |
| Review (build/test/code-review) | ✅ build clean · 38/38 tests · code review sound |
| Gate 2 (approval to open PR) | ✅ merged (`e64d4f8`) |
| Closure (review.md/status.md + issues) | ✅ this pass |

## Tasks
1. ✅ T1 — clique-aware floor (`chromaticFloor`, `bottleneckClique`) — real 6-clique asserted
2. ✅ T2 — daytime-exception model (`daytimeExceptionBudget`, promoted set)
3. ✅ T3 — promotion search (`candidates.ts`, B=1 exhaustive / B=2 greedy)
4. ✅ T4 — `generatePlanScenarios` comparison ("Só à noite" / "1 de manhã" / "2 de manhã")
5. ✅ T5 — modal scenario cards + "manhã" promotion badge

## Verified
- Floor now honest: 6-clique (Mon 18:30) with the maintainer's real IDs → floor 6 (was under-reported 5).
- Daytime exception saves a semester on the 3-clique fixture (makespan 3 → 2); non-improving B=2 dropped; determinism held.

## Deferred → tracked as issues on the fork
- ⬜ End-to-end real-case gate `238_20111` not in CI — [#22](https://github.com/maguila-gus25/MyUFSC/issues/22)
- ⬜ B=2 promotion greedy, not exhaustive — [#23](https://github.com/maguila-gus25/MyUFSC/issues/23)
- ⬜ Optativas 288h accounting — [#24](https://github.com/maguila-gus25/MyUFSC/issues/24)
- ⬜ AND-of-OR prerequisite data model — [#25](https://github.com/maguila-gus25/MyUFSC/issues/25)
