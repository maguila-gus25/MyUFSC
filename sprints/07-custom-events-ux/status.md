# Sprint 07 — Custom-events UX — Status

**Theme:** #34 recurring weekdays + #33 side-by-side overlapping custom events.
**Branch target:** `sprint/07-custom-events-ux` off `main` (fork). Conventional Commits, PR into main.

| Phase | State |
|---|---|
| Plan (backlog + architect plan) | ✅ done — `backlog.md`, `plan.md` |
| Gate 1 (approval to build) | ⏳ awaiting maintainer |
| Run (engineers implement) | ⬜ not started |
| Review (lint / build / test / acceptance) | ⬜ not started |
| Gate 2 (approval to open PR) | ⬜ not started |

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
