# Sprint 07 — Decisions

## Gate 1 (approved 2026-07-25)
- **Horizontal drag for multi-day events:** LOCK day-change when `days.length > 1` — drag
  only adjusts the shared time range (vertical); the weekday set is edited via the modal.
  Rejected the shift-whole-set alternative (disproportionate clamp/collision edge cases).
- **T5 (custom event shares width with an overlapping class section):** KEEP in scope —
  US-2 ships complete (custom-vs-custom AND custom-vs-class side-by-side), closing #33 fully.

## Data-model
- `CustomScheduleEntry.day: number` → `days: number[]` (canonical replacement, not additive).
- Legacy entries migrated in `student-store.ts` merge() on hydration.
