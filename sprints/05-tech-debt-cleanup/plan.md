# Sprint 05 — Tech-Debt Cleanup — Technical Plan

**Planning only. No production code in this document.**
**Branch target:** one feature branch per story (`chore/…`, `refactor/…`), each a Conventional Commit, merged via PR into `main` on the fork.

---

## ⚠️ Ground-truth correction (read first)

Reconnaissance in the issues, `CLAUDE.md`, and `backlog.md` is **stale for 4 of the 5 items**. Verified against current `main` (branch `feat/plan-gen-optimality-disclaimer`):

| Issue | Claimed state | Actual verified state |
|---|---|---|
| #20 lint | `next lint` deprecated, lints nothing | Worse: **ESLint is not installed at all** — no `eslint` in `node_modules`, no config file, no lockfile entry. `pnpm run lint` → `Invalid project directory ... /lint`. |
| #18 normalize | 3 copies to dedupe | The **3 named sites already import** `normalizeProfessorId` from `@/lib/professors`. `normalizeProfName` no longer exists. Two *other* byte-identical copies remain (`timetable.tsx`, `scripts/update-professors.ts`). |
| #16 caches | Two parallel caches, no coordination | **Already unified.** `curriculumCache` is `Record<string, Curriculum>` (`student-store.ts:148`); `curriculumsCache` exists nowhere in the repo; `useCurriculum` and all consumers read the one Zustand cache. |
| #17 status logic | Full engine duplicated in `GridVisualizer` | **Partly false.** The `optionalPools` credit-accounting engine lives **only** in `CurriculumVisualizer`. `GridVisualizer` does exact-ID status lookup, no equivalence, no pools. What overlaps (placeholder/optional predicates) has **drifted** to different regexes. |
| #19 dead fields | Dead, no consumers | **Fully live.** Rendered chain `Timetable → CourseStats → CourseList`; `selectSchedule` dispatched at `course-list.tsx:46` and `course-stats.tsx:88`. |

Net effect: this sprint is mostly **doc corrections + two small extractions + one real tooling install**, not five refactors. That is a *good* outcome — but the maintainer should decide on the two judgment calls flagged in Risks (§US-1 default ruleset, §US-4 regex reconciliation).

---

## US-1 — Fix the broken lint script (#20) · `tooling` · **P0** · owner: `backend-engineer`

**Affected files**
- `package.json` (`scripts.lint`, `devDependencies`)
- **new** `eslint.config.mjs` (flat config)
- `pnpm-lock.yaml` (install)
- possibly `.gitignore` (no change expected)

**Ground truth.** `next lint` was removed in Next 16; `next` now reads `lint` as a directory arg and dies with `Invalid project directory provided, no such directory: <repo>/lint`. There is **no** `.eslintrc*`, no `eslint.config.*`, and ESLint is not a dependency. So "keep the same rules" has no prior config to preserve — the effective prior ruleset is *nothing*.

**Mechanical change**
1. Install dev deps: `eslint` (v9, flat-config native), `eslint-config-next@16.2.6` (matches `next`), `@eslint/eslintrc` (only if `FlatCompat` is needed to consume `eslint-config-next`). Prefer running Next's own codemod to pin the exact versions Next 16 expects: `npx @next/codemod@latest next-lint-to-eslint-cli .` — then review its output rather than trusting it blind.
2. Create `eslint.config.mjs` extending Next's recommended flat presets (`next/core-web-vitals`, and `next/typescript` if TS rules are wanted). This is the same default `next lint` applied when a project had no config, so it is the closest thing to "the existing rules."
3. Change `scripts.lint` from `"next lint"` to `"eslint ."`. Add a matching `"lint:fix": "eslint . --fix"` (optional, no rule change).
4. Add an `ignores` block in the flat config for generated/vendored dirs: `.next`, `node_modules`, `scrapers/**` (Rust), `.dev-db`, `data`, `curriculums`, `components/ui/**` (shadcn-generated — CLAUDE.md says don't hand-edit; lint noise there is not this sprint's job).

**Data-flow / type / API / DB impact:** none.

**Verification:** `pnpm run lint` exits and prints ESLint output (not the Next directory error). Because this is the *first* lint the repo has ever run, expect **pre-existing findings**. Per AC, do **not** fix them this sprint — capture the count in `review.md` and open a follow-up issue. If findings block a clean exit and the review gate needs green, downgrade newly-surfaced rules to `warn` (documented) rather than editing feature code.

**Risk: LOW-MEDIUM.** Regression to watch: (a) the codemod picking ESLint/plugin versions incompatible with Next 16.2.6 → pin explicitly; (b) a flood of pre-existing errors making the gate unusable → mitigate with the `warn`/ignore strategy above. **Maintainer decision:** confirm adopting `next/core-web-vitals` as the baseline is acceptable (there is no prior ruleset to match).

---

## US-2 — Dedupe professor-name normalization (#18) · `good first issue` · **P1** · owner: `backend-engineer` (+ frontend touch)

**Affected files**
- `components/schedule/timetable.tsx` (inline `norm`, lines 235-241) — **client**
- `scripts/update-professors.ts` (`normalizeProfessorName`, lines 12-19 + call site line 48) — **node script**
- `lib/professors.ts` (canonical `normalizeProfessorId`, already exported, lines 3-10) — **imports node `crypto`**
- (no change) `app/api/professors/[id]/reviews/route.ts`, `.../details/route.ts`, `components/schedule/professor-selector.tsx`, `components/details-panel.tsx` — already import the canonical export.

**Ground truth.** The three sites the issue names are already deduped. The remaining **true byte-identical copies** of the professor normalizer (`NFD → strip diacritics → toUpperCase → collapse ws → trim`) are exactly two: `timetable.tsx:235-241` and `scripts/update-professors.ts:12-19`. Do **not** touch the *other* NFD strings found in `degree-selector.tsx`, `lib/plan-generator/candidates.ts`, `timetable.tsx` (degree search) — they `toLowerCase` for a different purpose and are not this normalizer.

**Mechanical change**
1. `timetable.tsx`: delete the local `norm` closure; import `normalizeProfessorId` from `@/lib/professors` (already how `professor-selector.tsx`, a sibling client component, consumes it — so the `crypto` import does not break the client bundle; Turbopack tree-shakes `generatePseudonym`/`crypto` since only the named string fn is imported). Replace `norm(...)` calls with `normalizeProfessorId(...)`.
2. `scripts/update-professors.ts`: replace the local `normalizeProfessorName` body with a re-export/import of `normalizeProfessorId` from `@/lib/professors`. `normalizeProfessorName` is referenced only at line 48 in the same file — either keep the name as a thin alias (`const normalizeProfessorName = normalizeProfessorId`) or rename the call site. Node context, so `crypto` import is fine.

**Server/client boundary:** already proven safe (`professor-selector.tsx` is `"use client"` and imports from `lib/professors.ts` today). No new boundary crossing. Do **not** relocate the canonical fn into `professors-client.ts`; leave it in `lib/professors.ts`.

**Data-flow / type / API / DB impact:** none. Output must be byte-identical (it is — the copies are character-for-character the same).

**Verification:** `pnpm run build` green; grep shows zero remaining inline professor NFD normalizers outside `lib/professors.ts`; spot-check that `normalizeProfessorId("José  DA Silva")` === old `norm` output.

**Risk: LOW.** Regression to watch: `timetable.tsx`'s `knownTaughtCourses` matching must stay identical (same string in → same string out); the pipeline script's `professor_courses` keys must not shift (identical fn → identical keys, but note **re-running the script is a maintainer action**, not part of this PR).

---

## US-3 — Curriculum caches (#16) · `tech-debt` · **P1** · owner: `frontend-engineer`

**Affected files**
- `CLAUDE.md` (State-management section + tech-debt list bullet)
- `docs/state-management.md` (lines ~48, ~52, ~104-110)
- (no production code)

**Ground truth.** Already unified. `student-store.ts:148` declares `curriculumCache: Record<string, Curriculum>`; `cacheCurriculum(degreeId, curriculum: Curriculum)` (`:183`) stores full objects with degree-set eviction (`:194`); `useCourseMap` reads `curriculum.courses` off it; `useCurriculum` (`hooks/setup/UseCurriculum.ts`) reads/writes the same store cache (lines 174-198, 83-90). Every consumer (`available-courses-modal`, `plan-generator-modal`, `search-popup`, `use-add-course-prereq`, `professor-details-dialog`, `useCourseMap`) accesses `.courses` — i.e. all treat it as `Curriculum`. **No `curriculumsCache` exists anywhere.**

**Mechanical change**
- **No code.** Close #16 as already-resolved. Correct the two stale docs so the debt isn't re-introduced:
  - `CLAUDE.md`: rewrite the "second, parallel cache (`curriculumsCache …`)" note and the tech-debt bullet "Two parallel curriculum caches" to state the cache is unified as `Record<degreeId, Curriculum>` in the store.
  - `docs/state-management.md`: fix the `curriculumCache` type row (says `Record<string, Course[]>` — now `Curriculum`) and the closing "`useCurriculum` maintains a parallel cache" paragraph.

**Data-flow / type / API / DB impact:** none.

**Verification:** grep for `curriculumsCache` returns only historical docs/sprint files (now corrected); `pnpm run build` unaffected (no code touched).

**Risk: NONE (code).** The "full merge" risk the backlog flagged does not apply — the merge already happened. The only risk is leaving the stale note in place and a future contributor "re-splitting." No time-box concern.

---

## US-4 — Course-status / equivalence dedup (#17) · `tech-debt` · **P2, time-box-droppable** · owner: `frontend-engineer`

**Affected files**
- `components/visualizers/curriculum-visualizer.tsx` (`mappedCurriculumCourses` memo, lines 54-164)
- `components/visualizers/grid-visualizer.tsx` (elective classification + status, lines 50-92, 195-221)
- `components/visualizers/course-box.tsx` (placeholder check, lines 275-276)
- **new** `lib/curriculum-status.ts` (extracted pure helpers) + a colocated `*.test.ts`

**MANDATORY parity/diff step BEFORE any extraction (this is the whole risk).** The two implementations have already **drifted**; extraction that "unifies" them silently would change rendered output. Documented diff:

| Concern | `CurriculumVisualizer` | `GridVisualizer` | `course-box.tsx` |
|---|---|---|---|
| Placeholder regex | `/OPT/i.test(id) \|\| /optativa/i.test(name)` (L74-75) | `/^OPT\d{4}$/.test(id) \|\| /^[-.]+$/.test(id)` (L72) | `/OPT/i.test(id) \|\| /optativa/i.test(name)` (L275-276) |
| Optional classification | `type==="optional"` + `false`/`"false"` coercion (L64-67) | `type==="optional"` only (L81) | — |
| `optionalPools` greedy credit-accounting | **yes** (L55-144) | **no** — not present | — |
| Named-course status | equivalence-set match (L146-157) | exact `courseId` match only (L191) | — |

**Conclusion:** the `optionalPools` status engine is **not** duplicated — it lives only in `CurriculumVisualizer`. The only genuinely shared concept is *placeholder / optional detection*, and its regex has diverged. So AC "one shared helper consumed by both" is achievable **only** for the predicate, and only if the regex divergence is reconciled — which is a **behavior decision** (it changes which courses appear/are-dimmed in the electives grid).

**Recommended scope (two independent, separately-committable steps):**

- **Step 4a (low risk, do first).** Extract `CurriculumVisualizer`'s engine into a pure function `computeCurriculumStatusMap(curriculum, semesters, equivalenceMap): Map<string, {status, grade, studentCourse}>` in `lib/curriculum-status.ts`. `CurriculumVisualizer` imports it; behavior byte-identical (pure move). Add a golden-master unit test: snapshot the returned map for a representative curriculum (mandatory + optative pools + a declared equivalence) so any future edit is caught. **This alone pays down the "engine drifts" debt** by making it a single tested unit, without touching `GridVisualizer`.
- **Step 4b (droppable, needs maintainer sign-off).** Extract `isGenericPlaceholder`/`isDefOptional` predicates into `lib/curriculum-status.ts` and point `CurriculumVisualizer`, `GridVisualizer`, and `course-box.tsx` at them. **This requires choosing one canonical regex.** The two `/OPT/i`+`/optativa/i` sites agree; `GridVisualizer`'s `/^OPT\d{4}$/`+`/^[-.]+$/` disagrees. Adopting the `/OPT/i` variant everywhere would change the electives grid's filter (e.g. an id like `OPTX` or a name-only "Optativa" would newly be filtered out). **Do not ship 4b without the maintainer confirming the grid's course set is allowed to change,** or without proving via the parity harness below that the rendered elective set is unchanged for real curricula.

**Parity harness (proof of "identical rendered status").** Before/after each step, render both visualizers for 2-3 real curricula (e.g. `208_20191` CS, plus one with rich optatives) and dump, per courseId, the resolved `{status, isDimmed, isHighlighted}`. Diff must be empty. Cheapest implementation: a throwaway node script importing `computeCurriculumStatusMap` + replicating `GridVisualizer`'s classify, run against seeded curriculum JSON — attach the diff to `review.md`.

**Data-flow / type / API / DB impact:** none (pure client refactor).

**Risk: HIGH (4b), LOW (4a).** Regression to watch: any course whose rendered status/dim/highlight changes in either visualizer — the status color is the core UX of the dashboard. **If time-boxed out, ship 4a only and defer 4b with the regex-reconciliation decision written up.**

---

## US-5 — `selectedSchedule` / `selectedStudentSchedule` (#19, RE-SCOPED) · **P2** · owner: `frontend-engineer`

**Affected files**
- `CLAUDE.md` (tech-debt bullet: "`selectedSchedule`/`selectedStudentSchedule` … appear to have no consumers")
- `docs/state-management.md` (line 48: "Parallel selection state — currently unused")
- (no production code)

**Ground truth — setter path IS reachable.** Traced end to end:
- Fields declared `student-store.ts:83-84`, init `:169-170`, reset `:323-324`/`:808-809`.
- Setter `selectSchedule` (`:675-683`) and `clearSchedule` (`:686-692`).
- **Dispatched:** `course-list.tsx:46` (`onClick` → `selectSchedule(course, resolved)`), `course-stats.tsx:88` (`selectSchedule(course, null)`), `clearSchedule` at `course-stats.tsx:66`, `timetable.tsx:130,142`.
- **Read:** `course-stats.tsx:63-64,135,138,146-157,209,219,224`, `course-list.tsx:21,30-34`.
- **Mounted:** `Timetable` (live schedule view) renders `CourseStats` (`timetable.tsx:611`) which renders `CourseList` (`course-stats.tsx:185`). `CourseList`'s row `onClick` fires the setter; `CourseStats` reads it to drive the professor-stats panel.

The fields power live professor-selection in the timetable. The issue premise ("dead") is **false**.

**Decision → (b): close #19 as invalid + correct the stale notes.** No removal.

**Mechanical change**
- Update `CLAUDE.md` tech-debt bullet to remove the "no consumers" claim (or delete the bullet).
- Update `docs/state-management.md:48` from "currently unused" to a one-line description of the timetable professor-selection role.
- Write the reachability determination into `review.md` (the AC artifact).

**Data-flow / type / API / DB impact:** none.

**Risk: NONE.** The only failure mode was the one the backlog already caught — a blind removal breaking the professor-stats panel. We are explicitly not doing that.

---

## Task breakdown (owner · dependency · sequence)

| # | Task | Owner | Depends on | Droppable |
|---|---|---|---|---|
| T1 | US-1 install ESLint + flat config + `eslint .` script (#20) | backend-engineer | — | no (**P0**, unblocks review gate) |
| T2 | US-5 verify reachability, close #19, fix 2 stale notes (#19) | frontend-engineer | — (parallel with T1) | no |
| T3 | US-3 close #16, fix `CLAUDE.md` + `state-management.md` cache notes (#16) | frontend-engineer | — (parallel) | no |
| T4 | US-2 point `timetable.tsx` + `update-professors.ts` at canonical normalizer (#18) | backend-engineer (API/script) + frontend touch on `timetable.tsx` | T1 (so lint runs on the change) | no |
| T5 | US-4 **Step 4a**: extract `computeCurriculumStatusMap` + golden-master test (#17) | frontend-engineer | T1 | **yes (time-box)** |
| T6 | US-4 **Step 4b**: unify placeholder predicate across both visualizers + `course-box` (#17) | frontend-engineer | T5 + maintainer regex decision | **yes (drop first)** |

**Sequencing:** P0 `T1` first (everything else benefits from a working linter). `T2`/`T3` are doc-only, run any time in parallel. `T4` after `T1`. `T5` then `T6` last; drop `T6`, then `T5`, if the sprint runs short.

---

## Verification strategy

Run at the sprint gate, all must be green (or explicitly-documented pre-existing):

1. **`pnpm run build`** (Next 16 production build) — must pass after every code task (T4, T5, T6). This is the primary safety net for the client-boundary change in T4 and the extraction in T5.
2. **`pnpm run test`** — note: this is `node --import tsx --test lib/plan-generator/*.test.ts` (node:test + tsx, **not** vitest). Five existing suites: `generate`, `search`, `packing`, `bottleneck`, `candidates`. They must stay green; none touch the files in this sprint, so they act as an untouched-baseline regression check. **T5 adds** `lib/curriculum-status.test.ts` under the same runner (update the `test` glob to `lib/**/*.test.ts` or add a second glob so the new suite is picked up).
3. **`pnpm run lint`** (newly fixed in T1) — must execute ESLint (not the directory error). Pre-existing findings are recorded, not fixed; gate passes on exit-with-findings-documented or a clean run after `warn`-downgrades.
4. **Parity check #17 (T5/T6):** before/after diff of per-course `{status, isDimmed, isHighlighted}` for ≥2 real curricula must be empty. Attach to `review.md`. This is the acceptance proof for "rendered status identical."
5. **Byte-identical check #18 (T4):** confirm `normalizeProfessorId` output equals the deleted `norm`/`normalizeProfessorName` output for accented/multi-space inputs.
6. **Doc grep (#16/#19):** `curriculumsCache` and the "no consumers" phrasing no longer present as live claims.

---

## Deferred (and why)

- **#16 full "merge" and #17 "make both visualizers consume one engine" (Step 4b)** — 4b is deferred-by-default because it requires a placeholder-regex behavior decision that can change the electives grid; ship only with maintainer sign-off or an empty parity diff.
- **#15 sequential hook waterfall** — perf refactor, larger blast radius (`app/page.tsx` + all four `hooks/setup` hooks); out of a clean-up sprint's scope.
- **#21 professor-rating architecture umbrella** — feature/behavior work (local-patch vs `refreshKey` reload, `myVote` threading, pagination), not tech-debt cleanup.
- **All plan-generator issues (#12,#13,#14,#22,#23,#24,#7–#11,#25)** — feature backlog, explicitly a non-goal.
- **Fixing the pre-existing ESLint findings surfaced by T1** — this sprint delivers a *working* linter; triaging its first-ever output is a follow-up issue to avoid scope-creep into feature files.
- **Re-running `scripts/update-professors.ts` after T4** — a maintainer/pipeline action against Neon, not part of a PR; the fn output is byte-identical so no data change is expected regardless.
