# Sprint 10 — Implementation Plan

Pure `lib/plan-generator` work, verified with `node:test`. Grounded in the Sprint 09 code
(`electives.ts`, `search.ts`, `packing.ts`).

## US-1 — Elective-only tail semesters
**File:** `lib/plan-generator/electives.ts` (+ `types.ts`, `generate.ts` default, modal, tests).

- Add `PlanScenario.electiveOnlySemesters: number` (default `0` in `packForward`'s literal).
- In `fillElectivesIntoScenario`, after the existing `[firstGen..lastGen]` fill loop, if
  `placedHours < demand`: append new semesters starting at `(lastGen ?? maxExistingSemester) + 1`.
  Each new semester starts empty (`occupied = ∅`, `credits = 0`); pack pool optativas into it with
  the same greedy fit (creditCap, `sectionsConflict`, `checkPrerequisites` against the evolving
  `workingInfo`). Stop when `placedHours >= demand`, when a new semester places nothing (pool
  exhausted / prereqs block), or at a safety cap (reuse a `MAX_ELECTIVE_SPAN`, e.g. 16).
- Count appended semesters → `electiveOnlySemesters`. Extend `perSemesterCredits` to cover them.
- **Invariant:** `totalFutureSemesters` (mandatory makespan) and the `generatePlanScenarios`
  card comparison are untouched — that comparison runs on the pre-fill scenario, and the fill only
  adds to the scenario object afterwards. The zero-demand no-op path is unchanged (parity holds).
- Modal: extend the reminder block to note `electiveOnlySemesters` when > 0.

## US-2 — Mixed-turno capacity (#10)
**File:** `lib/plan-generator/*.test.ts` (coverage first), packer only if a real gap surfaces.

- The packer's conflict math (`expandToCells`/`stripNeutralDays`/`sectionsConflict`) is
  turno-agnostic; eligibility is gated by `isNightTurnoValid` → `sectionInTurno`. Expectation:
  mixed turnos already pack correctly via the cell grid. Prove it with morning/afternoon/mixed
  fixtures; only generalize code if an assertion fails.
- Assert: two conflict-free courses in different turnos co-schedule; two same-cell courses defer;
  night-only + `INE5638` Saturday whitelist unchanged.

## US-3 (stretch) — Exhaustive B=2 (#23)
**File:** `lib/plan-generator/search.ts` (+ test).

- Replace the greedy B≥2 branch with an exhaustive double loop over `candidates` (i<j pairs),
  `searchMinSemesters(promoted={a,b})`, keep best by `comparePromotion`; still fold in the best
  single so the return is the best plan using ≤budget exceptions. Update the doc comment (drop the
  "documented heuristic" caveat).
- Test: 3-candidate synthetic where the best single's greedy pair is beaten by a disjoint pair.

## Task breakdown (Conventional Commits)
| # | Task | Story |
|---|---|---|
| T1 | `feat(plan-generator): expose electiveOnlySemesters on PlanScenario` | US-1 |
| T2 | `feat(plan-generator): append elective-only semesters until optativa demand is met` | US-1 |
| T3 | `test(plan-generator): elective-only tail semester cases` | US-1 |
| T4 | `fix(schedule): note elective-only semesters in the plan modal` | US-1 |
| T5 | `test(plan-generator): mixed/arbitrary turno packing capacity` (+generalize if needed) | US-2 |
| T6 | `refactor(plan-generator): exhaustive B=2 daytime-promotion pair search` (+test) | US-3 (stretch) |

**Sequencing:** T1→T2→T3→T4 (US-1 chain). T5 independent. T6 last / droppable.

**Risk:** US-1 tail loop must terminate (safety cap + break when a semester places nothing);
keep `totalFutureSemesters` semantics stable so the daytime comparison and labels don't shift.
