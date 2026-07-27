# Sprint 09 — "Optativas no Plano" — Review

**Branch:** `claude/sprint-planning-i25yap` (the session's designated branch; the plan doc named
`sprint/09-…` but development is authorized only on this branch). **PR:** [#41](https://github.com/maguila-gus25/MyUFSC/pull/41) (extended in place).

## Automated checks
| Check | Result |
|---|---|
| `pnpm run lint` (eslint .) | ✅ exit 0, no findings |
| `pnpm test` (node:test) | ✅ 61/61 (was 49; +7 electives, +5 tagging) |
| `pnpm run build` (next build) | ✅ success |
| `npx tsc --noEmit` | ✅ clean |

## What shipped (per story)

### US-1 — Pack real optativas into scenarios (#7)
- New `lib/plan-generator/electives.ts`: `buildElectivePool` (real optativas offered with a
  turno-valid section, not already earned by id/equivalence, ordered phase→id) +
  `fillElectivesIntoScenario` (greedy per-semester fill of free night slots up to demand).
- **Design choice (deviates from plan.md on purpose):** the fill runs on the already-selected
  scenario inside `generatePlanScenarios`, **not** inside `packForward`. Reason: `packForward`
  runs 5 strategies and the search compares on peak credit load — injecting electives before
  selection would let elective credits change which mandatory strategy wins. Post-pass keeps
  mandatory placement + makespan **byte-identical** to a zero-demand run.
- Reuses `checkPrerequisites`, the night filter, and the `schedule-conflict` cell math — no
  forked conflict logic. Prereqs re-checked per semester (a placed elective can gate a later one).
- **Verified invariants:** zero demand → mandatory-only (parity test); credit cap respected;
  conflicting optativa not placed; demand>pool → shortfall reported, never dropped.
- **v1 limit (documented):** fills only already-generated semesters — a student with no
  remaining mandatory courses (makespan 0) sees demand reported, not scheduled. Noted in
  `electives.ts` header; honest via US-2.

### US-2 — Honest scenario reporting (#24, #8)
- `PlanScenario.optativasPlacedHours` added; `graduationReminder.optativasHours` now means the
  shortfall remaining **after** placement.
- Modal shows a positive "já agenda Xh de optativas" line plus the still-remaining
  optativas/complementares as an outstanding requirement — visible whenever anything remains, so
  no scenario is framed as complete while electives are unplaced.

### US-3 — Re-tag Atividades Complementares (#11)
- Pure `retagNonDisciplineRequirements` (compact-array + object forms, idempotent, non-mutating);
  wired into both ingestion paths (`ingest_curriculums.ts`, `orchestrate.ts`); dry-run/`--apply`
  migration `scripts/migrate-retag-complementares.ts` for existing rows.
- **Correctness interaction found + fixed:** re-tagging AC to `optional` would trip
  `isRealElective`. Hardened `graduation.ts` (check `isNonDisciplineRequirement` first) and
  `buildElectivePool` (exclude it), so AC still buckets as complementares and is never scheduled.
  The generator-side name filter is kept as defense-in-depth.
- **Verification gate (as flagged at Gate 1):** prod Neon re-ingest is a maintainer follow-up —
  this ships the function + migration + tests, not the DB write.

### T7 — Docs (#40)
- CLAUDE.md directory-map row + stale flow lines in `architecture.md` / `professor-rating.md`
  corrected (optimistic patches, no `WriteReviewDialog`). RESOLVED-marked history left as-is.

## Commits (Conventional, one per task)
`feat(plan-generator): schedule real optativas…` · `test(plan-generator): cover optativa pool…` ·
`fix(schedule): show optativas placed vs remaining…` · `feat(data): re-tag atividades…` ·
`docs: refresh stale … references (#40)`.

## Gate 1 decisions applied (defaults, maintainer approved "faça sprint cycle")
1. "Already earned" identity → **equivalence** (via `resolveTerminalStatus`).
2. Optativa selection when pool > demand → **deterministic by phase then id**; rating-aware
   deferred (#13).
3. US-3 prod re-ingestion → **maintainer follow-up**.

## Deferred / not blockers
- Elective-only extra semesters when mandatory makespan is 0 (v1 limit above).
- Totals stay hardcoded 288/360 (curriculum-derived is a larger change — as in Sprint 08).
- #22 real-case regression fixture still needs maintainer data.

**Verdict: all green, all AC met.**
