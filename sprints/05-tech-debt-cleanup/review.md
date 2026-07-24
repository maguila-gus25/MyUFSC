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
