# Sprint 05 — Tech-Debt Cleanup — Backlog

**Theme:** Pay down cross-cutting tech debt. Low-risk health work, no new features.
**Source:** GitHub issues on the fork (`maguila-gus25/MyUFSC`): #20, #18, #16, #17, #19.
**Non-goal:** plan-generator features, professor-rating features, UX changes.

> ⚠️ **Ground-truth correction (post-architect verification).** The stories below were
> written from the issue text, which is **stale for 4 of 5 items**. See `plan.md` §Ground-truth
> for the verified table. In short: #16 is **already unified** (doc-only fix); #18 is **already
> mostly deduped** (only 2 real copies left); #17's engine is **not** duplicated (only a drifted
> predicate is shared); #19's fields are **fully live** (close-as-invalid). Only #20 (lint) is
> real work — and it's *bigger* than stated (ESLint isn't installed at all). `plan.md` is the
> authoritative scope; these stories are kept for the acceptance criteria.

Ordered by value ÷ risk (highest first).

---

## US-1 — Fix the broken lint script (#20) · `tooling`

**As a** contributor / CI, **I want** `pnpm run lint` to actually lint the codebase,
**so that** style/correctness regressions are caught in review.

Today `lint` runs `next lint`, deprecated in Next.js 16 — it errors
(`Invalid project directory ... no such directory: .../lint`) and lints nothing.

**Acceptance criteria**
- `pnpm run lint` runs ESLint directly (`eslint .`) against the existing config.
- Command exits 0 on a clean tree (or reports only pre-existing findings, documented).
- No change to lint rules — this is a runner migration only.
- If ESLint flat-config migration is required by the installed ESLint major, it is done
  minimally and the old `.eslintrc`/config still governs the same rules.

**Priority:** P0 — unblocks the review gate for this and every future sprint.

---

## US-2 — Dedupe professor-name normalization (#18) · `good first issue`

**As a** maintainer, **I want** one canonical `normalizeProfessorId` in `lib/professors.ts`,
**so that** name-matching can never drift between the write path and the read paths.

Normalization (NFD → strip diacritics → uppercase → collapse whitespace → trim) is
copy-pasted in: `app/api/professors/[id]/reviews/route.ts`,
`app/api/professors/[id]/details/route.ts`, and
`components/schedule/professor-selector.tsx` (`normalizeProfName`).

**Acceptance criteria**
- A single exported normalizer in `lib/professors.ts` (reuse the existing one if present).
- All three call sites import it; local copies deleted.
- Output is byte-identical to today's for the same input (no behavior change).
- `professors-client.ts` boundary respected (no server-only import leaking to client).

**Priority:** P1.

---

## US-3 — Unify the two uncoordinated curriculum caches (#16) · `tech-debt`

**As a** developer, **I want** one source of truth for cached curricula,
**so that** the Zustand `curriculumCache: Record<id, Course[]>` and the `useCurriculum`
hook's local `curriculumsCache: Record<id, Curriculum>` can't diverge.

**Acceptance criteria**
- One cache owns the data; the other becomes a derived view or is removed.
- No redundant refetch introduced; eviction stays keyed to `studentInfo` degrees.
- Consumers of both shapes (`Course[]` vs full `Curriculum`) still get what they need.
- Cold-load behavior on `/` unchanged (no new round-trips).

**Priority:** P1 — but see plan for risk; may land as a documented seam rather than a full merge.

---

## US-4 — Dedupe course-status / equivalence logic (#17) · `tech-debt`

**As a** developer, **I want** the status engine (named-course equivalence resolution +
generic-elective `optionalPools` credit-accounting) extracted to one shared helper,
**so that** `CurriculumVisualizer.mappedCurriculumCourses` and `GridVisualizer` stop
drifting.

**Acceptance criteria**
- One shared helper consumed by both visualizers.
- Rendered status for every course is identical to today across a representative
  curriculum (mandatory, optative pools, equivalents).
- No visual/interaction regression in either visualizer.

**Priority:** P2 — highest-risk item; gated on US-1..US-3 or deferred if time-boxed out.

---

## US-5 — Investigate `selectedSchedule` / `selectedStudentSchedule` (#19) · RE-SCOPED

**⚠️ Issue premise is outdated.** CLAUDE.md / #19 call these "dead fields with no
consumers." Verification during planning shows they **are** read in
`components/schedule/course-stats.tsx` and `components/schedule/course-list.tsx`, and set
by store actions at `lib/student-store.ts:681-682`. Blind removal would break the
professor-stats panel selection.

**Re-scoped goal:** determine whether the *setter path* is ever reached (is the selection
feature live or wired-but-unreachable?). Then either (a) remove the fields **and** their
now-confirmed-dead readers together, or (b) close #19 as invalid and correct the CLAUDE.md
tech-debt note.

**Acceptance criteria**
- A written determination (in `review.md`) of whether the selection feature is reachable.
- Either a safe, complete removal (field + setters + all readers) with build+tests green,
  **or** #19 closed as invalid with the CLAUDE.md line corrected.

**Priority:** P2 — investigation-gated; do not remove blindly.

---

## Deferred (not this sprint)
- #15 sequential hook waterfall (perf, larger) · #21 professor-rating umbrella (features)
- All plan-generator issues (#12, #13, #14, #22, #23, #24, #7–#11, #25)
