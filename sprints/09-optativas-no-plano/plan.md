# Sprint 09 — "Optativas no Plano" — Implementation Plan

Grounded against the actual engine (`lib/plan-generator/*`), not the stale docs. The packer is
mandatory-only today; `candidates.ts:8-9` names electives as the deferred "Phase 2", and the
`electives.ts` file reserved for it does not yet exist.

## Premise checks (verified in code)
- `buildRemainingCandidates` filters `type === "mandatory"` and drops non-discipline
  requirements — electives never enter the working set (`candidates.ts:106-111`).
- `computeGraduationReminder` (Sprint 08, `graduation.ts`) already returns remaining
  `optativasHours` / `complementaresHours` from COMPLETED/EXEMPTED history — US-1 reads demand
  straight off it; US-2 keeps its "remaining" meaning.
- `isRealElective` is exported from `lib/curriculum-status.ts` (Sprint 08) — the pool predicate
  reuses it; no regex duplication.
- `PlanScenario.graduationReminder` is threaded through `GenerationContext` →
  `packForward` → `withCardIdentity` spread (`generate.ts`); US-2's new "placed" field rides the
  same path.
- Conflict/turno/slot logic lives in `packing.ts` + `night.ts` + `checkPrerequisites`; US-1
  must call these, not fork them.

---

## US-1 — Elective post-pass

**New file:** `lib/plan-generator/electives.ts` (+ `electives.test.ts`).
**Touches:** `generate.ts` (invoke the post-pass per generated semester), `candidates.ts`
(export a `buildElectivePool` sibling, or add here reusing its helpers), `types.ts`
(scenario fields for US-2), `packing.ts` (only if a "fill free slots" entry point is needed —
prefer reusing the existing solver with an augmented candidate set).

**Design — post-pass, not joint optimization (PO scope decision):**
1. `buildElectivePool(courses, sections, plan, equivMap, snapshotSemester)` → real optativas
   (`isRealElective`), offered in the snapshot (`sections[courseId]` non-empty), not resolved to
   a terminal status via `resolveTerminalStatus`. Ordered deterministically (phase asc, then
   `id`).
2. `remainingOptativaDemandHours` = `computeGraduationReminder(studentInfo, courses).optativasHours`.
3. In `packForward`, **after** the mandatory solver fixes a semester, run
   `fillElectives(semester, pool, demandLeft, ctx)`: greedily take the next pool course whose
   sections have a slot that fits the semester's free grid (turno filter + pairwise conflict via
   the same helper `packing.ts` uses) and stays under `creditCap`; subtract its hours from
   `demandLeft`; stop when `demandLeft <= 0` or the semester is full.
4. Electives obey prerequisites (`checkPrerequisites` against courses already fixed in earlier
   generated semesters) — a placed elective can itself gate later electives, so recompute the
   available pool each semester.
5. If, after all generated semesters, `demandLeft > 0` and the pool is exhausted, record the
   shortfall (an added scenario field, surfaced by US-2) — never silently dropped.

**Parity guard (headline risk):** when `remainingOptativaDemandHours === 0`, the post-pass is a
no-op — `packForward` output must be identical to `main`. Assert with a golden-master style test
(reuse the `generate.test.ts` fixtures; dump scenario `plan` + counts before/after → empty diff).

**Determinism:** all ordering by explicit `id` tiebreaks (matches `buildRemainingCandidates`), so
scenarios stay reproducible.

**Tests (`electives.test.ts`, node:test):** zero-demand parity · partial demand fills free slots ·
demand > pool → shortfall reported · optativa conflicting with every free slot not placed ·
completed optativa excluded from pool · elective respects `creditCap`.

---

## US-2 — Honest scenario reporting

**Touches:** `types.ts` (`PlanScenario`), `generate.ts` (populate the new field),
`components/schedule/plan-generator-modal.tsx` (copy).

- Add `optativasPlacedHours: number` (and, if US-1 records it, `optativasShortfallHours`) to
  `PlanScenario`. `graduationReminder.optativasHours` keeps meaning **remaining after placement**
  — recompute it post-fill so the two numbers are consistent (placed + remaining ≈ demand).
- Modal (`plan-generator-modal.tsx:576-581` region, already reads `graduationReminder`): render
  "Optativas: Xh agendadas · Yh restantes" and "Atividades complementares: Zh restantes"; hide a
  line when its remaining value is 0. Gate any "conclui o curso"/optimal-completion phrasing on
  `optativasRemaining === 0 && complementaresRemaining === 0`.
- Complementares stay reported-only (no sections to schedule) — US-2 just reframes them beside the
  now-populated optativa numbers.

---

## US-3 — Data-layer re-tag (enabler, contained)

**Touches:** a shared tagging helper (extend `candidates.ts`'s `isNonDisciplineRequirement`
consumers — do NOT add a second predicate), the ingestion normalization in
`scripts/ingest_curriculums.ts` / `orchestrate.ts` Step 4, a new `scripts/migrate-*.ts`,
and a unit test.

- `retagNonDisciplineRequirements(courses)`: for each course where
  `isNonDisciplineRequirement(course)` is true, set `type` to a non-`mandatory` value (align with
  how curriculum JSON encodes non-mandatory — verify `parseCourses` round-trips it). Pure,
  idempotent, changes only `type`.
- Wire into ingestion so new/updated curricula are correct at rest; add the migration script for
  existing rows. **Do not remove** `candidates.ts`'s runtime filter (defense in depth).
- **Verification limit:** prod Neon re-ingest needs creds → maintainer follow-up. Ship the
  function + script + fixture-diff test; assert on a sample curriculum JSON, not the live DB.

---

## T7 — Docs (cheap)
Fix the `components/professors/` directory-map row in `CLAUDE.md` (drop "refreshKey full-reload
pattern" + `WriteReviewDialog`); grep for stray references. Doc-only.

---

## Task breakdown (one Conventional Commit each)

| # | Task | Agent | Story |
|---|---|---|---|
| T1 | `feat(plan-generator): build offered-optativa candidate pool` (electives.ts pool + tests) | backend | US-1 |
| T2 | `feat(plan-generator): fill electives into free slots after mandatory packing` (+ generate.ts wiring, shortfall reporting) | backend | US-1 |
| T3 | `test(plan-generator): zero-demand mandatory-parity + elective placement cases` | backend | US-1 |
| T4 | `feat(plan-generator): expose optativa placed/remaining on PlanScenario` (types + generate.ts) | backend | US-2 |
| T5 | `fix(schedule): modal shows optativas placed vs remaining; gate completion copy` | frontend | US-2 |
| T6 | `feat(data): re-tag Atividades Complementares as non-mandatory at ingestion` (+ migration + test) | backend | US-3 |
| T7 | `docs: refresh CLAUDE.md professors directory-map row` | backend | #40 |

**Sequencing:** T1→T2→T3 (US-1 chain, T2 depends on T1's pool, T3 asserts both). T4→T5 (US-2,
T5 renders T4's field). T4 depends on US-1 being wired (needs real placed-hours). T6 (US-3) and
T7 are independent — run any time. No two tasks edit the same file concurrently: US-1 owns
`electives.ts`/`generate.ts`, US-2's T5 owns the modal, US-3 owns scripts.

**Risk register:**
- *Headline:* the zero-demand parity guard (T3) — if it fails, the post-pass is leaking into
  mandatory output; block the sprint until the diff is empty.
- Elective prereq recompute per semester (T2) — an elective placed in semester N can gate one in
  N+1; don't compute the pool once up front.
- US-3 `type` encoding — confirm `parseCourses` round-trips the non-mandatory value before wiring
  ingestion; otherwise fixture-diff test catches it.
