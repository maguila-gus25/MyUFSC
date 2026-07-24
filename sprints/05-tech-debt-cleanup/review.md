# Sprint 05 — Tech-Debt Cleanup — Review

## T2/T3 — doc-only corrections (issues #16, #19)

Both issues carried **stale premises**: the code was already in the desired state, so the
work was purely correcting the docs (`CLAUDE.md`, `docs/state-management.md`) so the
already-resolved debt isn't reintroduced. No production code was touched.

### (a) #16 — `curriculumsCache` is absent from the codebase

The tech-debt claim was "two parallel curriculum caches with no coordination." Verified the
second cache no longer exists:

```
$ grep -rn "curriculumsCache" . --include="*.ts" --include="*.tsx"
(no matches — exit code 1)
```

The single cache lives in the Zustand store:

```
$ grep -n "curriculumCache" lib/student-store.ts
148:  curriculumCache: Record<string, Curriculum>;   # full Curriculum objects, not Course[]
182:      curriculumCache: {},
186:            state.curriculumCache[degreeId] = curriculum;   # cacheCurriculum stores full Curriculum
194:              for (const key of Object.keys(state.curriculumCache)) {   # degree-set eviction
195:                if (!active.has(key)) delete state.curriculumCache[key];
```

`hooks/setup/UseCurriculum.ts` and all consumers (`available-courses-modal`,
`plan-generator-modal`, `search-popup`, `use-add-course-prereq`, `professor-details-dialog`,
`useCourseMap`) read `.courses` off this one store cache. There is no hook-local parallel
cache. **Conclusion: the cache is already unified as `Record<degreeId, Curriculum>`.**

### (b) #19 — reachability trace: `selectedSchedule` / `selectedStudentSchedule` are LIVE

The tech-debt claim was these fields "appear to have no consumers." Traced end to end:

- **Declared / init / reset:** `student-store.ts:83-84` (decl), `:169-170` (init),
  `:323-324` and `:808-809` (reset).
- **Setters:** `selectSchedule` (`student-store.ts:675-683`, writes both fields via Immer),
  `clearSchedule` (`:686-692`).
- **Setter dispatch sites:**
  - `components/schedule/course-list.tsx:46` — course row `onClick` → `selectSchedule(course, resolved ?? null)`.
  - `components/schedule/course-stats.tsx:88` — `selectSchedule(course as StudentCourse, null)`.
  - `components/schedule/course-stats.tsx:66` — `clearSchedule` bound for the panel.
- **Read sites:** `course-stats.tsx` reads the selection to render the professor-stats panel;
  `course-list.tsx` reads it to highlight the active row.
- **Mount chain:** `Timetable` (live schedule view) → `CourseStats` (`timetable.tsx:611`) →
  `CourseList` (`course-stats.tsx:185`). `CourseList`'s row `onClick` fires the setter;
  `CourseStats` reads the field to drive the live professor-selection stats panel.

**Conclusion: the fields power the timetable's professor-selection panel. The "dead fields"
premise is false — nothing was removed.**

### (c) Determination

- **#16 (curriculum caches):** close as **already-resolved**. The merge already happened;
  `curriculumsCache` no longer exists. Docs corrected so no future contributor re-splits.
- **#19 (dead selection fields):** close as **invalid**. The fields are fully reachable and
  drive live UI. Docs corrected to describe their timetable role.

### Doc changes made (doc-only, no code)

- `CLAUDE.md` — State-management section: `curriculumCache` note rewritten to
  `Record<degreeId, Curriculum>` unified single cache.
- `CLAUDE.md` — tech-debt list: replaced the "two parallel curriculum caches" bullet with a
  "cache is unified, don't reintroduce a parallel cache" note; replaced the
  "`selectedSchedule`/`selectedStudentSchedule` … no consumers" bullet with a "these are
  live, don't remove" note.
- `docs/state-management.md` — transient-fields table: `selectedSchedule`/
  `selectedStudentSchedule` row now describes the timetable professor-selection role;
  `curriculumCache` row type corrected `Course[]` → `Curriculum`.
- `docs/state-management.md` — Curriculum Cache section: type and `cacheCurriculum` signature
  corrected to `Curriculum`; closing paragraph rewritten to state there is no parallel cache.

## T5 — #17 Step 4a extraction

Extracted `CurriculumVisualizer`'s inline `mappedCurriculumCourses` memo (the status
engine: named-course equivalence resolution + generic-elective `optionalPools` greedy
credit-accounting) **verbatim** into a pure, tested function. **Step 4b (unifying the
placeholder predicate/regex across `GridVisualizer` + `course-box.tsx`) is DEFERRED by
maintainer decision — not done here.** `GridVisualizer` and `course-box.tsx` were not
touched.

### Files changed

- **new** `lib/curriculum-status.ts` — exports `computeCurriculumStatusMap(courses,
  semesters, equivalenceMap): Map<string, { status, grade?, studentCourse? }>` and the
  `CurriculumStatusEntry` type. The body is a byte-for-byte move of the memo: same
  `isDefOptional` (`type === "optional"` plus the `false`/`"false"` coercion), same
  `isGenericPlaceholder` (`/OPT/i.test(id) || /optativa/i.test(name)`, unused `hasPhase`
  kept), same pool-draining order (courses sorted by phase; COMPLETED → IN_PROGRESS →
  PLANNED), same equivalence-set lookup for named courses.
- **new** `lib/curriculum-status.test.ts` — golden-master + targeted unit tests under the
  existing `node --import tsx --test` runner (node:test `assert`, matching
  `lib/plan-generator/*.test.ts` style). Fixture: mandatory courses, a real (non-placeholder)
  elective pair feeding the pool, three generic `OPT` placeholders exercising the drain
  order (COMPLETED → IN_PROGRESS → empty/DEFAULT), and a declared equivalence pair
  (`MAT1002 ≡ MAT1002B`) crediting a renamed course.
- `components/visualizers/curriculum-visualizer.tsx` — memo body replaced with a call to
  `computeCurriculumStatusMap(curriculum.courses, studentPlan.semesters, equivalenceMap)`;
  **memo deps unchanged** (`[curriculum.courses, studentPlan.semesters, equivalenceMap]`).
  Now-unused `Course` / `StudentCourse` type imports dropped. The function takes `courses`
  (not the whole `Curriculum`) precisely so the memo deps stay identical and no new
  `exhaustive-deps` finding is introduced.
- `package.json` — `test` glob widened from `lib/plan-generator/*.test.ts` to
  `lib/*.test.ts lib/plan-generator/*.test.ts` (explicit second glob rather than `**`,
  which is not reliably globstar-enabled under `sh`).

### Parity proof (acceptance criterion for #17)

**Structural argument:** a verbatim move. Same three inputs flow into the same pure logic
and out the same `Map` shape; the calling memo and its dependency array are unchanged, so
React recompute timing is identical too. Nothing about the algorithm, regex, coercion, or
pool order was altered.

**Empirical golden-master + real-curriculum diff:** a throwaway parity script loaded real
seeded curricula from the local PGlite dev DB, ran the **pre-extraction inline logic**
(pasted verbatim) against the **new extracted function** over a synthetic student plan that
exercises every `CourseStatus` kind and equivalence-id substitution, and diffed the resolved
`{ status, grade, matchedCourseId }` per course. Result — **empty diff** on all:

| programId | courses | diffs |
|---|---|---|
| `208_20071` (Ciências da Computação) | 91 | 0 |
| `208_19961` (Ciências da Computação) | 100 | 0 |
| `205_20211` | 77 | 0 |
| `101_20221` | 50 | 0 |

(`208_20191` is not in the local seed; `208_20071`/`208_19961` are the same CS program's
other versions and cover the same engine paths.) The script was not committed.

### Verification

- `pnpm run test` — **42 passed / 0 failed** (38 pre-existing plan-generator across
  `generate`/`search`/`packing`/`bottleneck`/`candidates` + **4 new**
  `computeCurriculumStatusMap` tests). New suite confirmed picked up by the widened glob.
- `pnpm run build` — passes (Next 16 production build).
- `pnpm run lint` — **63 problems (50 errors, 13 warnings)**, equal to the documented
  pre-existing baseline (no delta). `lib/curriculum-status.ts` and its test file produce
  **zero** findings; `curriculum-visualizer.tsx`'s remaining findings are the pre-existing
  rules-of-hooks/exhaustive-deps ones, unchanged in count.
