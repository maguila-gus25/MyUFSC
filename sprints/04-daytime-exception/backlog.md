# Sprint 04 — Backlog (Daytime-Exception Simulation)

Reconstructed from `plan.md` + `decisions.md` for the closure record. Task-driven
(T1–T5), engine-first. Objective unchanged: **fewest total semesters**; the new axis is a
budget `B ∈ {0,1,2}` of daytime "exceptions" a night student may spend to break the
Monday-18:30 bottleneck.

## Acceptance criteria

### T1 — Clique-aware floor (`bottleneck.ts`)
- Graph-coloring lower bound over the night conflict graph: `chromaticFloor = |largest mutex clique|`.
- `minSemestersFloor = max(criticalPathFloor, capacityFloor, chromaticFloor)`.
- Result exposes `bottleneckClique { cell, courseIds }` naming WHERE the jam is; pairwise
  `bottleneckCollisions` retained.
- **AC:** k-clique fixture → `chromaticFloor ≥ k`; the real SI 6-clique (Mon 18:30) is named.

### T2 — Daytime-exception model (`night.ts`, `packing.ts`, `generate.ts`)
- `GeneratorConfig.daytimeExceptionBudget?: number` (default 0 = strict night).
- Per-run promoted set: a promoted course may use ANY section; non-promoted stays night-only
  (+ `INE5638` Saturday whitelist unchanged).
- **AC:** promoted courses expose daytime sections to the packer; conflict/invariant math unchanged.

### T3 — Promotion search (`search.ts`, `candidates.ts`)
- Candidate set = clique / high-conflict-degree courses that have ≥1 daytime section.
- B=1: search once per candidate promoted, keep min makespan. B=2: greedy-then-verify (heuristic).
- **AC:** finds the ≤B promotions minimizing makespan without brute-forcing all subsets.

### T4 — Comparison output (`types.ts`, `generate.ts`)
- `generatePlanScenarios` returns cards "Só à noite" (B=0), "1 de manhã" (best B=1),
  "2 de manhã" (best B=2, only if it beats B=1).
- Each scenario carries `daytimeExceptionsUsed` + `promotedCourses[]`.
- **AC:** a higher-budget scenario is dropped when it doesn't improve on a smaller one.

### T5 — Modal (`plan-generator-modal.tsx`)
- Render the comparison cards; badge promoted courses ("… de manhã"). Read-only, reuses existing styling.
- **AC:** promoted scenarios visibly flagged.

## Verification gate (real case)
- B=0 → 6 future / 12 total, floor 6, clique named (Mon 18:30, the six IDs).
- B=1 → 5 future / 11 total, promoting one Monday-18:30 course to a daytime section.
- B=2 → report whatever it finds. Build + tests green; Sprint-02 invariant preserved.

## Out of scope (deferred)
Optativas 288h accounting; AND-of-OR prereq data model; changing the snapshot/offering source.
