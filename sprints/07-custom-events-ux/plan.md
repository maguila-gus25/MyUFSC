# Sprint 07 — Custom-events UX — Architect Plan

**Branch:** `sprint/07-custom-events-ux` off `main` (fork). Conventional Commits, PR into main.
**Surface:** 100% client-side. `customScheduleEntries` live only in the persisted/encrypted
`studentInfo` blob — no DB column, no API, no server transform. E2E-crypto invariant untouched.

## Premise verification (all confirmed against current code)
- `CustomScheduleEntry.day: number` — `types/student-plan.ts:77`.
- Modal single-day `<Select>` — `custom-event-modal.tsx:209-227`, save `:105`.
- Overlay full-width unconditional — `custom-events-overlay.tsx:252` (`left`), `:269` (`width`).
- Class-vs-class already side-by-side (don't touch) — `timetable-grid.tsx:119-122` flex row.
- Custom events free-positioned to the minute via `lib/timetable-time.ts` (not cell-quantized).
- `merge()` migration pattern to mirror — `student-store.ts:765-812` (customScheduleEntries not
  touched there today).
- `.ics` one VEVENT per event keyed on single `day` — `timetable.tsx:474-505`, `:528-538`.
- #31 lint-disables to preserve — `custom-event-modal.tsx:67`, `custom-events-overlay.tsx:125`.

**Two ripples flagged (silent breakages if missed):**
1. `onEntryMove` callback is `(entry, day, startTime, endTime)` (`custom-events-overlay.tsx:63-68`,
   consumed `timetable.tsx:189-199`) → signature must become `days`.
2. Optimistic `pending` clear compares `e.day` (`custom-events-overlay.tsx:118-124`) → under
   `days[]` never matches, drop-flash prevention breaks → must be days-aware.

## Data-model decision
Replace `day: number` with `days: number[]` (canonical, not additive — avoids dual-source
debt). Migration in `student-store.ts` merge(): map legacy entries to
`{ ...e, days: typeof e.day === "number" ? [e.day] : [] }` when `e.days` absent; leave
`recurring`/`scopedToPhase` untouched.

## Overlap-layout algorithm (per-day interval greedy column packing)
For each day column, over that day's boxes:
1. Sort by `startMin` asc, then `endMin` desc (via `toMinutes`).
2. Cluster: track running `maxEnd`; new cluster when next `startMin >= maxEnd`.
3. Columns within a cluster: place each box in first column whose last `endMin <= startMin`,
   else open a new column. `cols` = columns used.
4. Geometry: `width = colWidth/cols`, `left = TIME_COL_WIDTH + day*colWidth + subCol*width`
   (keep ±1px insets). Equal width = colWidth/maxConcurrent. Memoize by `[entries, geo]`.

Class-section sharing (T5, droppable): derive `classIntervalsByDay` from `professorOverrides`
(`timetable.tsx:508-526`), pass overlay a prop, seed each day's packing columns with class
intervals first so overlapping custom events get pushed to narrower right-hand columns. Class
table cell stays full-width underneath (not shrunk — that coupling is a non-goal).

## Tasks
| Task | Story | Scope | Depends | Drop |
|---|---|---|---|---|
| T1 | US-1 | Widen model `day`→`days:number[]` (`types/student-plan.ts`); merge() migration | — | No |
| T2 | US-1 | Multi-select weekday picker in modal; require ≥1; prefill `initialEntry?.days`; update `openNewEntry` in `timetable.tsx:171`. Keep #31 disable `:67` | T1 | No |
| T3 | US-1 | Overlay: expand map into (entry×day) boxes; shared time on drag/resize; day-move only when `days.length===1`; `onEntryMove`→`days`; days-aware `pending`. Keep #31 disable `:125` | T1 | No |
| T4 | US-2 | Custom-vs-custom greedy column packing + memoize; apply width/left | T3 | No |
| T5 | US-2 | Class-occupancy reserved columns (`classIntervalsByDay` prop chain) | T4 | **Yes** |
| T6 | US-1 | ICS: loop `entry.days`, one `addEvent` per day (`timetable.tsx:528-538`) | T1 | No |
| T7 | US-1/2 | `handleCustomEntryMove` → `(entry, days, start, end)` (`timetable.tsx:189-199`) | T3 | No |
| T8 | US-3 | Docs `docs/schedule-timetable.md`: model, migration, layout, ICS | T1-T7 | Low |
| T9 | US-3 | Regression: lint + build; single-day unaffected; drag in narrowed cols; #31 present | T1-T8 | No |

Commit grouping: T1+T2+T3+T6+T7 (US-1 feat), T4(+T5) (US-2 feat), T8+T9 (US-3). Scope
`schedule`/`timetable`. Owner: frontend-engineer (all). design consulted on T2 picker only.

## Risks / non-goals
- The two ripples above are the main correctness risk — T3 must handle both.
- **Decision needed:** horizontal drag for multi-day events. Recommend **lock day-move when
  `days.length>1`** (time-drag only; weekday set edited via modal). Shift-whole-set is nicer
  but adds clamp/collision edge cases disproportionate to a hobby project.
- O(n²) is a non-issue (handful of events per user; memoize per drag frame).
- `recurring`/`scopedToPhase` orthogonal to `days[]` — don't couple.
- Non-goals: shrinking the actual class table cell (only overlay side narrows); other
  timetable debt; per-day distinct time ranges (start/end stay shared).
