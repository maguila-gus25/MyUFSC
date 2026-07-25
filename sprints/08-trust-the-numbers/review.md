# Sprint 08 — "Trust the Numbers" — Review

**Branch:** `sprint/08-trust-the-numbers` (off `main`, fork). **PR:** not yet opened (Gate 2).

## Automated checks
| Check | Result |
|---|---|
| `pnpm run lint` (eslint .) | ✅ clean, no warnings |
| `pnpm test` (node:test) | ✅ 49/49 pass (incl. 7 new `graduation.test.ts`) |
| `pnpm run build` (next build) | ✅ success |

## Code review (inline, all diffs)
- **US-1 endpoint** (`details/route.ts`): ✅ cache split into `getCachedStats` + `getCachedReviewPage`;
  **offset/limit are explicit key-array parts** (`[prof-reviews-${id}, String(offset), String(limit)]`) —
  the headline trap is avoided. Same `professor-${id}` tag on every page → existing mutation
  `revalidateTag` invalidates all pages together. `hasMore` via `LIMIT limit+1`; stable
  `ORDER BY "createdAt" DESC, id DESC`; stats only on `offset===0`; votes fresh per page. Added
  `MAX_LIMIT=50` clamp + NaN-safe param parse — sensible hardening.
- **US-1 client** (`professor-details-dialog.tsx`, `professors-client.ts`): ✅ `fetchProfessorDetails`
  gains `offset`/`limit` (in dedupe key + URL). `handleLoadMore` is a pure local-patch append —
  dedupe reviews/replies by id (keeps local edits/optimistic votes), merges voteState only for
  *new* ids, re-runs `cleanupOrphanedSoftDeleted`, advances offset. No stats refetch, no remount.
  "Carregar mais" button with spinner, gated on `hasMore`.
- **US-2** (`curriculum-status.ts`, `graduation.ts`, `generate.ts`, `plan-generator-modal.tsx`):
  ✅ elective predicate exported (`isRealElective`/`isDefOptional`/`isGenericPlaceholder`) and
  reused — no regex duplication (also removed a dead `hasPhase` var in the extraction). New pure
  `computeGraduationReminder` counts only COMPLETED/EXEMPTED, floors at 0, `workload||credits*18`.
  Wired via `GenerationContext` in `prepareGeneration`; `packForward` returns `ctx.graduationReminder`;
  static `GRADUATION_REMINDER` deleted. Modal hides the line when both 0, grammatical part-join.
- **US-3** (`professor-details-dialog.tsx`): ✅ shared `replyText` replaced by `replyDrafts` map;
  every call site (top-level + recursive `ReplyThread`) reads/writes per-id; submit clears just that
  id; **reset-on-`replyingTo` effect deleted** (removes debt-#31 set-state-in-effect). `replyingTo`
  single-open UX preserved.
- **T7 docs**: ✅ `docs/professor-rating-architecture-issues.md` + CLAUDE.md "Known architecture
  issues" mark full-reload / createdAt / myVote / orphaned WriteReviewDialog / normalizeId×3 as
  FIXED; pagination noted as ADDRESSED by US-1. `VoteSidebar disabled` untouched (confirmed not a bug).

## Acceptance criteria
- **US-1** ✅ offset param, no dup (dedupe by id), "Carregar mais" append (no reload), myVote/replies
  intact after load, cache keyed by page + shared tag, stats whole-dataset.
- **US-2** ✅ computed from studentInfo, 0 when satisfied / line hidden, 7 unit tests (zero/partial/
  clamp/EXEMPTED/PLANNED-INPROGRESS-FAILED/mandatory/placeholder), scope = reminder number only,
  predicate reused.
- **US-3** ✅ B box empty after typing in A; switching back to A no leak from B; single-open preserved;
  draft cleared on submit; debt-#31 effect removed.

## Notes / deferred (not blockers)
- `StudentCourse` has no partial-hours field → complementares is effectively binary (full workload
  when the pseudo-course is completed/exempted, else 0). Documented in `graduation.ts`.
- Totals stay hardcoded 360/288 (curriculum-derived is a larger, separate change).
- Pre-existing: a user's own review on a later page won't surface until loaded (already true under
  the old `LIMIT 20`) — out of scope.
- CLAUDE.md **directory-map** row still calls `ProfessorDetailsDialog` "refreshKey full-reload" and
  lists `WriteReviewDialog` — now stale but outside T7's stated scope (the "Known issues" list).
  → follow-up.

**Verdict: all green, all AC met. Ready for Gate 2.**
