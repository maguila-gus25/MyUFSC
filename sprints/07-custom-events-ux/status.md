# Sprint 07 — Custom-events UX — Status

**Theme:** #34 recurring weekdays + #33 side-by-side overlapping custom events.
**Branch target:** `sprint/07-custom-events-ux` off `main` (fork). Conventional Commits, PR into main.

| Phase | State |
|---|---|
| Plan (backlog + architect plan) | ✅ done — `backlog.md`, `plan.md` |
| Gate 1 (approval to build) | ✅ approved (2026-07-25) — day-lock multi-day, keep T5 |
| Run (engineers implement) | ✅ done — US-1/US-2/US-3 landed (3 feat/docs commits) |
| Review (lint / build / test / acceptance) | ✅ done — all green (see `review.md`) |
| Gate 2 (approval to open PR) | ✅ approved — **PR [#38](https://github.com/maguila-gus25/MyUFSC/pull/38)** opened into fork `main` |

## Gate 1 — decisions requested
1. **Horizontal drag for multi-day events** — recommend **lock day-move when `days.length>1`**
   (time-drag only; weekday set edited via modal). Alt: shift the whole set by column delta
   (nicer, more edge cases).
2. **T5 (class-occupancy sharing)** — droppable half of US-2. Keep in scope or defer? Cutting
   it still ships the headline custom-vs-custom fix.

## Tasks (planned, not dispatched)
T1 model+migration · T2 weekday picker · T3 overlay multi-day+gesture · T4 custom-vs-custom
packing · T5 class-occupancy columns (droppable) · T6 ICS per-weekday · T7 drag callback
signature · T8 docs · T9 regression.
