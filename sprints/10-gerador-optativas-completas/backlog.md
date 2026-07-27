# Sprint 10 — "Gerador: optativas completas + turnos gerais" — Backlog

**Theme:** finish the elective story Sprint 09 started and harden the packer's flagged edge cases
— all in pure, unit-tested `lib/plan-generator`.

**Why now:** Sprint 09 scheduled optativas into the *already-generated* mandatory semesters but
stopped there (documented v1 limit): a near-done student with no remaining mandatory courses saw
the 288h reported, not scheduled. Two flagged generator gaps (#10 mixed-turno capacity, #23
greedy B=2) also remain. This sprint stays in the repo's highest-confidence surface (pure lib +
`node:test`).

**Backlog issues:** closes the Sprint-09 elective gap (US-1); #10 (US-2); #23 (US-3, stretch).

---

## US-1 — Elective-only semesters so the plan reaches 288h

> As a student near graduation, I want the generator to add semesters that schedule only
> optativas when I still owe elective hours, so the plan actually reaches the 288h target instead
> of just telling me how much is missing.

**Acceptance criteria**
- [ ] After filling the generated mandatory semesters, if optativa demand remains and the offered
      pool can still fit courses, append **elective-only** night semesters (respecting `creditCap`,
      per-semester conflicts, and prerequisites) until demand is met or the pool is exhausted.
- [ ] The mandatory makespan (`totalFutureSemesters`) and the daytime-card comparison are
      **unchanged**; elective-only tail semesters are surfaced separately via a new
      `electiveOnlySemesters` count.
- [ ] Honest shortfall preserved: when the offered pool truly can't cover the demand, the
      remaining `graduationReminder.optativasHours` stays > 0 (never a false 0).
- [ ] Deterministic (phase→id ordering, stable section pick). Bounded by a safety cap.
- [ ] Modal notes the elective-only semesters ("+N semestre(s) só de optativas").
- [ ] Unit tests: demand met purely in existing free slots → no extra semester; demand needing
      tail semesters → N appended and demand hits 0; pool exhausted → shortfall reported with the
      semesters it could add; makespan headline unchanged; empty-mandatory plan (makespan 0) with
      demand → elective-only semesters appended from the next free semester.

## US-2 — Mixed / arbitrary turno slot-capacity  (ref #10)

> As a student who isn't night-only, I want the packer's per-semester capacity to be correct for
> morning/afternoon/mixed offerings, so a daytime or no-preference plan packs as many
> conflict-free courses as the grid really allows.

**Acceptance criteria**
- [ ] Add fixtures/tests exercising morning-only, afternoon-only, and mixed (no-preference) turno
      packing; assert conflict-free courses across different turnos co-schedule and same-cell
      clashes still defer.
- [ ] If a gap is found, generalize the slot-capacity/eligibility accounting for any turno
      combination; if the cell-based math already generalizes, the deliverable is the coverage +
      a short note in the packer/night docs.
- [ ] Night-only behavior (incl. the `INE5638` Saturday whitelist) is unchanged.

## US-3 (stretch) — Exhaustive B=2 daytime-promotion pair search  (ref #23)

> As a maintainer, I want the "2 de manhã" card to consider all promotion pairs, so it never
> under-reports the achievable makespan by missing a non-greedy optimal pair.

**Acceptance criteria**
- [ ] `searchWithDaytimeExceptions` B=2 evaluates all pairs over the capped candidate set (≤66
      for `MAX_PROMOTION_CANDIDATES=12`) instead of greedy-then-verify; result is chosen by the
      existing `comparePromotion`.
- [ ] A synthetic fixture where the greedy pair (best single + X) is beaten by a disjoint pair
      proves exhaustive finds the better one; existing B=1/B=2 tests still pass.
- [ ] Determinism preserved. **Deferred if US-1/US-2 consume the sprint** — it is low-impact per
      the issue.

---

## Deferred (kept as issues)
#12 per-course accept/reject · #13 rating-aware section tie-break · #14 full-repack variant ·
#22 real-case regression fixture (needs maintainer data) · #25/#9 AND-of-OR prerequisites ·
#17/#30 GridVisualizer status dedupe · #31 set-state-in-effect refactor.
