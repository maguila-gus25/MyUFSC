# Sprint 08 — "Trust the Numbers" — Implementation Plan

Architect-verified against the actual code (docs are stale). Full rationale below.

## Premise checks
- Curriculum status engine already extracted to `lib/curriculum-status.ts`
  (`computeCurriculumStatusMap`); only `CurriculumVisualizer` consumes it. US-2 reuses its
  elective predicate.
- US-3 "bleeding" is real but subtle: a reset-on-`replyingTo` effect already exists
  (`professor-details-dialog.tsx:1166-1169`, tech-debt #31) that *destroys* the draft on
  switch instead of scoping it. Fix replaces it with a per-id draft map.

---

## US-1 — Paginate professor reviews

**Files:** `app/api/professors/[id]/details/route.ts`, `lib/professors-client.ts`
(`fetchProfessorDetails`), `components/professors/professor-details-dialog.tsx`
(`ProfessorDetailsSection`).

**Approach — page-keyed cache under the same tag (do NOT bypass cache):**
1. Split `fetchProfessorCore` into `getCachedStats(id)` (aggregates + taught courses,
   page-independent, key `prof-stats-${id}`) and `getCachedReviewPage(id, offset, limit)`
   (top-level reviews + reply CTE for that page's ids, key **includes offset+limit**).
2. **The offset MUST be in the `unstable_cache` key array**, not just the SQL — otherwise
   page 0's memoized result is served for every page. (Headline risk.)
3. Keep the `professor-${id}` tag on every page → existing mutation-route `revalidateTag`
   already invalidates all pages together. No mutation-route changes.
4. `hasMore` via `LIMIT limit+1` (drop extra if present); reply CTE runs over returned ids only.
5. Stable ordering: `ORDER BY "createdAt" DESC, id DESC` (tiebreak prevents cross-page shift).
6. `GET` parses `?offset=` (default 0), `?limit=` (default 20). Stats returned only when
   `offset===0`; later pages return `{ reviews, replies, hasMore }`. Votes stay fresh per page.

**Client:** extend `fetchProfessorDetails(id, voterHash, offset?, limit?)` (offset in dedupe
key + URL). `ProfessorDetailsSection` gains `nextOffset`/`hasMore`/`loadingMore`; "Carregar
mais" button; on click local-patch append (dedupe reviews/replies by id, merge voteState,
re-run `cleanupOrphanedSoftDeleted`, advance offset). No stats refetch, no full reload.

**Risks:** cache-key omission (headline); stats must stay whole-dataset; pre-existing
"own review on later page not surfaced" — out of scope.

---

## US-2 — Plan-generator remaining hours

**Files:** `lib/plan-generator/generate.ts` (drop const, wire from context),
`lib/plan-generator/graduation.ts` **(new)**, `lib/plan-generator/graduation.test.ts`
**(new)**, `lib/curriculum-status.ts` (export elective predicate),
`components/schedule/plan-generator-modal.tsx` (copy tweak).

**Bucket predicates (reuse, no duplication):**
- Optativas = `type === "optional"` AND not a generic placeholder — export combined
  `isRealElective(course)` (or `isDefOptional`+`isGenericPlaceholder`) from
  `curriculum-status.ts` (currently module-private).
- Complementares = `isNonDisciplineRequirement(course)` from `lib/plan-generator/candidates.ts`.
- Hours: `def.workload || def.credits * 18` (18h/credit, matches curriculum-status).

**Computation** — new pure `computeGraduationReminder(studentInfo, courses)`: iterate the
current plan's semesters; for each `StudentCourse` COMPLETED/EXEMPTED, resolve def by exact id;
real elective → optativasEarned, non-discipline requirement → complementaresEarned. Return
`{ complementaresHours: max(0,360-earned), optativasHours: max(0,288-earned) }`.

**Wiring:** compute in `prepareGeneration` (generate.ts:390), add `graduationReminder` to
`GenerationContext`, have `packForward` (generate.ts:655) return `ctx.graduationReminder`
instead of the module const. Flows through `searchMinSemesters`/`searchWithDaytimeExceptions`
and survives `withCardIdentity` spread. Modal (plan-generator-modal.tsx:576-581) already reads
the fields — values now mean "remaining"; adjust copy so 0h reads sensibly / hide when both 0.

**Caveats (record, not blockers):** complementares is effectively binary (no partial-hours
field on StudentCourse); totals stay hardcoded 360/288 (curriculum-derived is a larger change).

**Tests** (`graduation.test.ts`, node:test): zero→{360,288}; partial subtract; over-earn clamp
0; EXEMPTED counts; PLANNED/IN_PROGRESS/FAILED don't; mandatory doesn't; generic placeholder
doesn't.

---

## US-3 — Reply draft scoping

**File:** `components/professors/professor-details-dialog.tsx`.

Replace shared `replyText: string` (line 724) with `replyDrafts: Record<string,string>`.
`CommentCard` prop surface unchanged (`replyText`/`onReplyTextChange`) — only top-level
plumbing changes: pass `replyDrafts[id] ?? ""` and `setReplyDrafts(d=>({...d,[id]:v}))`.
`ReplyThread` takes `replyDrafts` + `setDraft(id,v)`. `handleReplySubmit(parentId)` reads
`replyDrafts[parentId]`, clears that id on success. **Delete the reset-on-`replyingTo` effect
(lines 1166-1169)** — removes debt-#31 set-state-in-effect. `replyingTo` keeps single-open UX.

**Why per-id over reset-on-open:** more correct (drafts survive switching), preserves
one-open UX, removes the flagged effect, minimal (CommentCard untouched).

---

## Flag confirmations
1. Docs stale — FIXED already: full-reload, createdAt threading, myVote, orphaned
   WriteReviewDialog, normalizeId ×3. Only `LIMIT 20` (US-1) still OPEN. → doc cleanup (T7).
2. `VoteSidebar disabled={false}` (line 240) — NOT a bug, guest mode gives everyone an
   authorHash. Out of scope; dead plumbing only.

---

## Task breakdown (one Conventional Commit each)

| # | Task | Agent | Story |
|---|---|---|---|
| T1 | `refactor(curriculum): export isRealElective predicate from curriculum-status` | backend | US-2 |
| T2 | `feat(plan-generator): compute remaining complementares/optativas hours` (+graduation.ts +tests +wiring) | backend | US-2 |
| T3 | `fix(plan-generator): modal reminder copy for remaining hours` | frontend | US-2 |
| T4 | `fix(professors): scope reply drafts per target to stop text bleeding` | frontend | US-3 |
| T5 | `feat(professors): paginate professor-details reviews endpoint` | backend | US-1 |
| T6 | `feat(professors): "carregar mais" load-more in professor details dialog` | frontend | US-1 |
| T7 | `docs(professors): mark already-fixed rating issues resolved; keep pagination open` | backend | — |

**Sequencing:** T1→T2→T3 (US-2 chain, independent). T4 (US-3) before T6 (US-1 client) —
both edit `professor-details-dialog.tsx`, sequence to avoid conflict. T5 (US-1 backend) before
T6 so client builds on stable response shape. T7 last.
