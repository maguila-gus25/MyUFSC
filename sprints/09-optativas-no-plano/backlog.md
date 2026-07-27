# Sprint 09 — "Optativas no Plano" — Backlog

**Theme:** make the plan generator model **electives (optativas)**, not just mandatory
disciplines — so a generated scenario reflects the real remaining load and stops claiming a
degree is finished while 288h of optativas are unscheduled.

**Why now:** Sprints 01–04 shipped the mandatory-only packer and explicitly deferred
electives to "Phase 2" (`candidates.ts:8-9`, the reserved-but-empty `electives.ts`). Sprint 08
laid the last piece of groundwork: `computeGraduationReminder` already computes *remaining*
optativa/complementares hours and `isRealElective` is now an exported predicate. The generator
still packs `type === "mandatory"` only, which is the single biggest user-facing gap in the
feature and the root of #24 (a plan reports "done" while electives remain unsatisfied). The
enabling pieces exist; this sprint spends them.

**Backlog issues addressed:** #7 (headline), #24 + #8 (honest reporting), #11 (data enabler).

**Deliberately deferred (out of scope, keep as issues):** #12 per-course accept/reject, #13
professor-aware section tie-break, #14 full-repack variant, #23 exhaustive B=2 promotion, #25/#9
AND-of-OR prerequisites, #17/#30 GridVisualizer dedupe, #31 set-state-in-effect refactor.

---

## US-1 — Pack real optativas into generated scenarios  (ref #7)

> As a UFSC student generating a plan, I want the generator to actually schedule elective
> (optativa) courses into my future semesters — not just mandatory ones — so the plan I see is
> the real remaining load toward graduation, not a mandatory-only skeleton.

**Scope decision (PO):** electives are placed as a **greedy post-pass after mandatory
packing**, filling free weekly slots up to the remaining optativa demand — *not* a joint
re-optimization of mandatory + elective packing (that stays deferred). Mandatory makespan and
placement must be **byte-identical** to today when no elective demand remains.

**Acceptance criteria**
- [ ] A new `lib/plan-generator/electives.ts` derives the remaining optativa **demand** (in
      credit-hours) from `computeGraduationReminder(...).optativasHours` and builds a candidate
      pool of real optativas (`isRealElective`, `type === "optional"`, not a generic
      placeholder) that are **offered in the schedule snapshot** and not already
      completed/exempted/planned.
- [ ] After the mandatory packer places a semester, remaining free slots (respecting
      `creditCap`, turno filter, and pairwise time-conflict detection) are filled from the
      elective pool until the semester is full or demand is met — deterministic ordering.
- [ ] Placement stops once accumulated elective hours ≥ remaining demand; leftover demand that
      the offered pool cannot cover is reported, not silently dropped (reuse the existing
      `unplaceable` / `placedWithoutSection` reporting shape).
- [ ] When remaining optativa demand is 0, generator output is **unchanged** vs `main` (guard
      with a parity assertion in tests).
- [ ] Prerequisites, night-turno rules, and slot-capacity accounting apply to electives exactly
      as to mandatory courses (reuse `checkPrerequisites`, `night.ts`, `packing.ts` — no forked
      conflict logic).
- [ ] Unit tests: zero demand → mandatory parity; partial demand filled into free slots;
      demand exceeds offered pool → remainder reported; an offered optativa that conflicts with
      every free slot is not placed; a completed optativa is not re-placed.

## US-2 — Scenario reporting reflects electives honestly  (ref #24, #8)

> As a student comparing scenarios, I want each scenario to show how many optativa/complementares
> hours it actually schedules vs how many still remain, and to NOT label itself "conclui o curso"
> while electives are unplaced — so I don't trust a plan that's secretly incomplete.

**Acceptance criteria**
- [ ] Each `PlanScenario` exposes optativa hours *placed by this scenario* alongside the existing
      `graduationReminder` remaining hours (extend the type; keep `graduationReminder` meaning
      "remaining after placement").
- [ ] `plan-generator-modal.tsx` shows, per scenario, optativas placed vs still-needed and
      complementares still-needed; the copy reads sensibly at 0 (line hidden when nothing remains).
- [ ] No scenario is presented as a complete path to graduation while optativa OR complementares
      hours remain > 0 — the "não inclui" reminder stays visible and is worded as an
      *outstanding requirement*, not a footnote.
- [ ] Complementares remain reported-only (no scheduling — they have no sections); US-2 only
      corrects how the modal frames the two buckets now that optativas are placed.

## US-3 — Re-tag Atividades Complementares as non-mandatory at ingestion  (ref #11)

> As a maintainer, I want Atividades Complementares tagged as a non-`mandatory` requirement in
> the curriculum data itself, so every consumer sees correct data and the generator's name-match
> filter becomes a safety net, not the source of truth.

**Acceptance criteria**
- [ ] The ingestion path (`scripts/ingest_curriculums.ts` / `orchestrate.ts` normalization, or a
      one-off `scripts/migrate-*.ts`) re-tags non-discipline requirements off `mandatory` using
      the existing `isNonDisciplineRequirement` predicate — one shared predicate, no new copy.
- [ ] A pure, unit-tested tagging function; the generator-side `isNonDisciplineRequirement`
      filter in `candidates.ts` is **kept** as a defense-in-depth fallback (not removed).
- [ ] Applying the tagging to a sample curriculum JSON is idempotent and changes only the
      pseudo-course `type`, nothing else (fixture diff test).
- [ ] **Verification gate:** re-ingesting against prod Neon is a **maintainer follow-up** (needs
      DB creds); this sprint ships the tagging function + migration script + tests only. Flag at
      Gate 1.

---

## T7 (docs, cheap carry-over) — CLAUDE.md directory-map cleanup  (ref #40)

- [ ] Drop the stale "refreshKey full-reload pattern" description and the `WriteReviewDialog`
      entry from the `components/professors/` directory-map row in `CLAUDE.md`; grep for other
      stale `WriteReviewDialog` / `refreshKey` references. Doc-only. Surfaced in Sprint 08 review.

---

## Open questions for Gate 1 (maintainer)
1. **Elective identity for "already earned":** count a completed optativa toward demand by its
   own id only, or also via equivalence map? (Proposed: equivalence, matching mandatory.)
2. **Which optativas to prefer** when the pool exceeds demand: deterministic by id/phase
   (proposed, simplest) — professor-rating-aware tie-break stays deferred (#13).
3. **US-3 prod re-ingestion**: confirm it's an accepted maintainer follow-up (this sprint ships
   code + migration + tests, not the DB write).
