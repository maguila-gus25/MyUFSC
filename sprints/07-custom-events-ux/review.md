# Sprint 07 — Review

## Automated checks
| Check | Result |
|---|---|
| `pnpm run lint` (eslint .) | ✅ clean — 0 findings, no new set-state-in-effect/exhaustive-deps |
| `pnpm run build` | ✅ success — all routes compiled, 20 static pages |
| `pnpm run test` (node --test) | ✅ 42/42 pass |
| #31 eslint-disables preserved | ✅ `custom-event-modal.tsx:60`, `custom-events-overlay.tsx:156` |

## Code review (manual, diffs read in full)
- **Migration (`student-store.ts` merge()):** correct — legacy `day:number` → `days:[day]`,
  `days:[]` guard for malformed blobs, strips legacy `day`, leaves `recurring`/`scopedToPhase`
  untouched.
- **Packing (`custom-events-overlay.tsx` `boxSlots` memo):** correct interval-graph greedy
  coloring. Half-open `[start,end)` overlap (`end <= start` = free); per-day clustering on
  running `maxEnd`; first-free-column assignment yields exactly max-concurrency columns
  (optimal equal widths). Class intervals seeded first with a class-before-custom tiebreak →
  clashing custom event pushed to a narrower right column. Memo keyed on
  `[entries, classIntervalsByDay, dayCount]`, excludes live gesture/pending → no per-frame
  repack.
- **Gesture rework:** day-move locked when `days.length > 1` (Gate-1 decision); single-day
  drag still moves across days; `pending` compare made days-aware (fixes the silent
  drop-flash break the architect flagged); pointer-capture on pointerdown → hit-testing
  independent of narrowed width.
- **ICS (`timetable.tsx`):** one `addEvent` (→ VEVENT) per `entry.days` weekday.
- **Class intervals (`timetable.tsx`):** derived from existing `professorOverrides` memo,
  guards `!entry.endTime`, passed through `timetable-grid.tsx` (pure pass-through, memo
  bail-out intact). Class-vs-class flex row (`timetable-grid.tsx:124`) untouched.

## Acceptance criteria
### US-1 (#34) recurring weekdays
- [x] Modal Seg–Sáb multi-select; ≥1 day required (guard in `handleSave` + Button disabled).
- [x] `days:number[]` model; legacy entries migrated in place on hydration.
- [x] Renders on all N weekdays (flatMap entry×day); edit pre-fills all days.
- [x] Drag/resize updates shared time for all days; day-set change only via modal.
- [x] `.ics` one VEVENT per weekday.
- [x] `recurring`/`scopedToPhase` unchanged.
- [x] Lint/build clean, no regressions, #31 disables preserved.

### US-2 (#33) side-by-side overlap
- [x] Overlapping custom events → own columns, width = colWidth/cols, interval-based.
- [x] Custom-over-class shares width (class seeded columns); both visible/clickable
  (overlay `pointer-events-none` container, only boxes `-auto`; class left portion shows
  through). *(visual confirmation at 2/3/4 overlaps recommended when running the app.)*
- [x] Partial overlaps both narrow; no event fully hidden.
- [x] Class-vs-class rendering untouched.
- [x] Drag/resize works in narrowed column (pointer-capture, not geometry).

### US-3 regression + docs
- [x] Single-day non-overlap → full width (cols=1 + explicit fallback).
- [x] Drag/resize on single-day unchanged.
- [x] ICS correct for multi-weekday.
- [x] `docs/schedule-timetable.md` updated (model, migration, layout, ICS).

## Verdict
All acceptance criteria met; all automated checks green. One item benefits from a visual
smoke test in the running app (2/3/4 simultaneous overlaps rendering side-by-side) — logic
verified by construction. **Ready for Gate 2.**

## Commits
- `14587d5` feat(schedule): recurring weekday custom events (#34)
- `594dbf8` feat(schedule): side-by-side overlapping custom events (#33)
- `2ab7327` docs(schedule): document custom-event weekdays + overlap layout (#33, #34)
- `7f1aa64` docs(sprint): plan Sprint 07 custom-events UX (#33, #34)
