# Sprint 04 — Review

Branch `sprint/04-daytime-exception` (off `main`). Merged to `main` as `e64d4f8`
(feat commit `d051bc6`). This review is the formal closure record, produced after the
merge against the shipped code.

## Commits
| Hash | Subject |
|---|---|
| `18d21a0` | docs(sprint): plan Sprint 04 daytime-exception simulation |
| `d051bc6` | feat(schedule): compare night-only vs daytime-exception plans |
| `e64d4f8` | Merge sprint/04-daytime-exception |

Diff: 7 files, +726 / −96 — `bottleneck.ts`, `generate.ts`, `search.ts` (+`candidates.ts`),
`types.ts`, `night.ts`/`packing.ts` (model), `plan-generator-modal.tsx`, plus tests.

## Checks
| Check | Result |
|---|---|
| `pnpm run build` (tsc type gate) | ✅ clean |
| `pnpm run test` (`node --test`) | ✅ 38/38 |
| `pnpm run lint` | ⚠️ broken repo-wide, pre-existing (`next lint` invocation) — not this sprint |
| Code review (bottleneck/search/generate + modal) | ✅ sound; Sprint-02 invariant preserved |

## Acceptance criteria
- **T1 — clique-aware floor:** ✅ `chromaticFloor = |largest mutex clique|`;
  `minSemestersFloor = max(criticalPath, capacity, chromatic)`; `bottleneckClique {cell,courseIds}`
  exposed. Test asserts the **real 6-clique** (INE5649, INE5670, INE5614, INE5625, INE5664,
  INE5687) → `chromaticFloor 6`, floor 6, cell `0:10` (Mon 18:30), every member conflict-degree 5.
- **T2 — daytime-exception model:** ✅ `daytimeExceptionBudget` (default 0); per-run promoted set —
  promoted course uses any section, non-promoted stays night-only (+`INE5638` Saturday whitelist).
  Conflict/invariant math unchanged.
- **T3 — promotion search:** ✅ candidates = clique/high-degree courses with a daytime section
  (`candidates.ts`); B=1 per-candidate min; B=2 greedy-then-verify (documented heuristic).
- **T4 — comparison output:** ✅ `generatePlanScenarios` → "Só à noite" / "1 de manhã" / "2 de manhã";
  each carries `daytimeExceptionsUsed` + `promotedCourses`; higher budget dropped when it doesn't improve.
- **T5 — modal:** ✅ scenario cards + "… de manhã" promotion badge; read-only, reuses styling.

## Verification gate
- **Floor (real IDs):** ✅ 6-clique proven at unit level with the maintainer's actual Monday-18:30
  course IDs — `chromaticFloor` and `minSemestersFloor` both 6 (old pairwise `+1` under-reported 5).
- **Daytime promotion saves a semester:** ✅ synthetic 3-clique fixture → strict-night makespan 3;
  promoting one course with a morning section → makespan 2. `generatePlanScenarios` contrasts
  night vs "1 de manhã" and drops a non-improving B=2. Determinism (byte-for-byte) held.
- **End-to-end real case (honest gap):** the full live `238_20111` run (B=0 → 6/12, B=1 → 5/11)
  is NOT asserted in an automated test — it needs the maintainer's actual completed-courses set
  + offering snapshot, same gap carried from Sprint 03. Floor and mechanism are proven; the
  exact makespan on live data is validated by the maintainer regenerating in-app. → issue.

## Deferred (filed as issues on the fork)
- Optativas 288h accounting (still deferred).
- AND-of-OR prerequisite data model (still deferred).
- B=2 promotion is a greedy heuristic, not exhaustive (documented limitation).
- End-to-end real-case gate for `238_20111` not reproduced in CI (needs maintainer data).
