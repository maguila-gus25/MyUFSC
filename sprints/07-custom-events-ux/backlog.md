# Sprint 07 — Custom-events UX — Backlog

**Theme:** Timetable custom events — recurring weekdays (#34) + side-by-side overlapping
events (#33). First user-value sprint after two tech-debt sprints (05, 06). Both issues
are maintainer-filed user requests, share the same two files, and pivot on one data-model
change (`CustomScheduleEntry.day: number` → `days: number[]`).

## Stories

### US-1 — Recurring weekday custom events (closes #34)
**As a** UFSC student, **I want** to pick multiple weekdays when creating/editing a custom
event (e.g. gym Mon/Wed/Fri), **so that** I don't create three identical events.

Acceptance criteria:
- [ ] Modal's single "Dia" select replaced by a Seg–Sáb multi-select; ≥1 day required to save.
- [ ] `CustomScheduleEntry` carries a weekday set; legacy single-`day` entries migrate in
  place on hydration, no data loss (mirrors `student-store.ts` `merge()` pattern).
- [ ] Saving with N weekdays renders on all N days, same start/end/color.
- [ ] Editing pre-fills all currently-selected weekdays.
- [ ] Drag (time) / resize updates the shared time range for all the event's days; changing
  *which* weekdays only via the modal.
- [ ] `.ics` export emits one VEVENT per selected weekday.
- [ ] `recurring`/`scopedToPhase` semantics unchanged.
- [ ] Lint + build pass; no new set-state-in-effect/exhaustive-deps findings (don't regress
  Sprint 06's clean baseline); #31 lint-disables preserved.

### US-2 — Overlapping custom events render side-by-side (closes #33)
**As a** UFSC student, **I want** overlapping custom events (with each other or with a class
section) side-by-side like Google Calendar, **so that** I can see/click every event.

Acceptance criteria:
- [ ] 2+ custom events overlapping in day+time interval each get their own column, equal
  width = colWidth/maxConcurrent, from real interval overlap (not cell-quantized).
- [ ] A custom event overlapping a class section shares width; both visible/clickable
  (droppable half — T5).
- [ ] Partial overlaps both narrow; no event fully hidden.
- [ ] Existing class-vs-class side-by-side rendering (`timetable-grid.tsx`) untouched.
- [ ] Drag/resize still picks up the whole event when it's in a narrowed column.
- [ ] Manual check at 2/3/4 simultaneous overlaps (custom + class).

### US-3 — Regression net + docs
- [ ] Single-day, non-overlapping event occupies full width exactly as before.
- [ ] Drag-across-days / resize on a single-day event unchanged.
- [ ] `.ics` export correct for multi-weekday entries.
- [ ] `docs/schedule-timetable.md` updated: `days[]` model, migration, overlap-layout, ICS.

## Issue mapping
| Story | Issues |
|---|---|
| US-1 | #34 |
| US-2 | #33 |
| US-3 | regression net for #33/#34 (no standalone issue) |

## Deferred (with reasons)
- **#17 / #30** — visualizer status/placeholder-regex dedupe → candidate Sprint 08; #30 needs
  a parity-harness diff before touching behavior.
- **#22 / #23 / #24** — plan-generator correctness cluster → dedicated future sprint.
- **#7 / #8 / #11 / #24** — curriculum credit-accounting cluster (optativas 288h, Atividades
  Complementares) → future sprint; #11 is a small standalone ingestion fix.
- **#9 / #25** — AND-of-OR prerequisite data model → own sprint, architect designs model first.
- **#10, #12, #13, #14** — backlog-labeled plan-generator enhancements, no user demand yet.
- **#21** — professor-rating umbrella; needs grooming into concrete stories first.
- **#31** — set-state-in-effect refactor; touches the same two files → fast-follow after this
  sprint lands to avoid in-flight merge conflicts.
