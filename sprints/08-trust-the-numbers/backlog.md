# Sprint 08 — "Trust the Numbers" — Backlog

**Theme:** Correctness/completeness fixes for what the UI shows the student — professor
reviews + plan-generator graduation reminder.

**Why now:** Sprints 06–07 covered plan-generator perf and custom-events UX. A backlog
audit against the *actual code* (not the stale docs) found most of the professor-rating
umbrella (#21) is already fixed. What remains are a few concrete "the UI shows something
inaccurate/incomplete" bugs — a coherent, low-risk theme.

**Approved scope (Gate 1, 2026-07-25):** US-1, US-2, US-3. Stretch US-4 (scheduler
regression test) **deferred**.

---

## US-1 — Paginate professor reviews  (ref #21 §3.4)

> As a UFSC student browsing a professor's page, I want to see reviews beyond the first 20,
> so older feedback isn't silently hidden from me.

**Acceptance criteria**
- [ ] `GET /api/professors/[id]/details` accepts an `offset` (and optional `limit`) param
      and returns top-level reviews beyond the first 20, without duplicating already-returned
      reviews.
- [ ] `ProfessorDetailsDialog` shows a "Carregar mais" affordance when more reviews exist,
      and clicking it **appends** the next page via local patch (no full-mural reload).
- [ ] `myVote` and reply threads for already-loaded reviews keep working after loading more.
- [ ] The `unstable_cache`-wrapped fetch is adjusted so paginated pages aren't served
      stale/duplicated — **offset/limit are part of the cache key array**, all pages keep the
      same `professor-${id}` tag so existing mutation `revalidateTag` invalidates them together.
- [ ] Stats/aggregates remain whole-dataset (not limited to page 0's reviews).

## US-2 — Plan-generator reminder reflects real remaining hours  (ref #24)

> As a UFSC student using the plan generator, I want the "not included" reminder to subtract
> credit hours I've already earned, so it doesn't tell me I still need the full 288h/360h when
> I'm close to done.

**Acceptance criteria**
- [ ] `graduationReminder.optativasHours` / `.complementaresHours` are computed from
      `studentInfo` (completed/exempted non-mandatory course hours subtracted from 288h/360h),
      floored at 0, replacing the hardcoded `GRADUATION_REMINDER` constant.
- [ ] A student who already satisfied optativas/complementares sees 0h (line may be hidden).
- [ ] Unit tests cover: zero earned (unchanged), partial earned, fully-satisfied (clamp to 0),
      EXEMPTED counts, PLANNED/IN_PROGRESS/FAILED don't count, mandatory doesn't count,
      generic-placeholder optativa doesn't count (only real electives do).
- [ ] Scope limited to the *reminder number* — not scheduling optativas into the plan.
- [ ] Reuse the existing placeholder/elective predicate — no regex duplication.

## US-3 — Fix reply-box text bleeding across threads  (ref #21 §4.2)

> As a UFSC student replying to reviews, I want my draft reply scoped to the thread I'm typing
> in, so I don't risk posting text meant for a different review/reply.

**Acceptance criteria**
- [ ] Typing (without submitting) in reply box A, then opening reply box B, shows an empty
      textarea for B.
- [ ] Switching back to A does not show leaked text from B — draft state is per reply-target.
- [ ] The existing "only one reply box open at a time" (`replyingTo`) UX is preserved.
- [ ] Draft cleared on successful submit; the debt-#31 reset-on-`replyingTo` effect is removed.

---

## Deferred / follow-up (track as issues, do not build this sprint)
- US-4 stretch: scheduler real-case regression test (#22).
- Doc cleanup: `docs/professor-rating-architecture-issues.md` + CLAUDE.md tech-debt list are
  stale (full-reload / createdAt / myVote / WriteReviewDialog / normalizeId all already fixed).
  → handled as a docs task this sprint (T7) since it's cheap and reduces confusion.
- `VoteSidebar disabled={false}` dead plumbing — confirmed **not a bug**, out of scope.
- #17/#30 GridVisualizer status-logic dedupe (curriculum-status.ts migration) — untouched.
