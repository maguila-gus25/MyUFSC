# Sprint 10 — Review

**Branch:** `claude/sprint-planning-i25yap` (restarted from `main` after #41 merged). **PR:** new.

## Automated checks
| Check | Result |
|---|---|
| `pnpm run lint` (eslint .) | ✅ exit 0 |
| `pnpm test` (node:test) | ✅ 69/69 (was 61; +8 net: elective tail + turno capacity) |
| `pnpm run build` (next build) | ✅ success |
| `npx tsc --noEmit` | ✅ clean |

## What shipped

### US-1 — Elective-only tail semesters (closes the Sprint-09 v1 gap)
- `fillElectivesIntoScenario` is now two-phase: fill the mandatory semesters' free slots, then
  append elective-only night semesters (bounded by `MAX_ELECTIVE_SPAN=16`) until optativa demand
  is met or the offered pool can place nothing more.
- New `PlanScenario.electiveOnlySemesters`; **`totalFutureSemesters` (mandatory makespan) is
  unchanged**, so the daytime-card comparison and the makespan label stay stable — the tail
  semesters are surfaced separately (modal: "incluindo N semestre(s) só de optativas").
- Honest shortfall preserved: when the pool truly can't cover demand,
  `graduationReminder.optativasHours` stays > 0. Zero-demand is still a no-op (mandatory parity).
- Tests: demand met in free slots → no tail; remaining demand → N tail semesters, demand 0; pool
  exhausted → shortfall + the semesters it could add; makespan headline excludes tail; empty-
  mandatory plan with demand → tail semesters appended.

### US-2 — Mixed/arbitrary turno capacity (#10)
- The packer's conflict math is cell-based and turno-agnostic; verification (not code) was the
  gap. Added tests: two conflict-free morning courses share a semester; morning+afternoon+night
  co-schedule in one semester (capacity not capped at the ten night cells); same-cell courses
  defer across turnos. No engine change required — the cell grid already generalizes.

## Deferred
- **US-3 (#23) exhaustive B=2 promotion — deferred (stretch).** The change is low-risk, but a
  test that *demonstrates* greedy missing the optimal disjoint pair needs fragile conflict-
  topology engineering; shipping a `search.ts` change without a test that truly exercises the
  improvement is below the repo's bar. Left open, low-impact per the issue.

## Gate 1 decisions applied
- Elective-only semesters count separately from the makespan headline (comparison-stable).
- Deterministic ordering (phase→id), bounded by `MAX_ELECTIVE_SPAN`.

**Verdict: all green, US-1/US-2 AC met, US-3 deferred with rationale.**
