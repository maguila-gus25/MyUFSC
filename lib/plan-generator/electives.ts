/**
 * Elective (optativas) post-pass for the plan generator.
 *
 * The core packer schedules **mandatory** disciplines only (see `generate.ts`,
 * `candidates.ts`). This module fills the leftover free night slots of an
 * already-generated scenario with real optativas, up to the student's remaining
 * elective credit-hour demand — so a generated plan reflects the real remaining
 * load toward graduation instead of a mandatory-only skeleton (issue #7).
 *
 * ## Why a post-pass on the winning scenario, not inside `packForward`
 * `packForward` runs several priority {@link Strategy}s and the search keeps the
 * best by makespan / peak credit load. Injecting electives *before* that choice
 * would let elective credits perturb which mandatory strategy wins. Running the
 * fill on the already-selected scenario keeps the mandatory placement and
 * makespan **byte-identical** to a run with no elective demand, and the elective
 * credits only ever change the preview totals — never the number of semesters.
 *
 * ## What it does, per generated semester (earliest first)
 * Greedily takes the next pool optativa whose prerequisites are met by the plan
 * strictly before this semester, that has a night-turno-valid section whose grid
 * cells don't clash with anything already placed that semester, and that keeps
 * the semester under the credit cap. Placement stops once the accumulated hours
 * reach the demand or the offered pool can fit nothing more; any remaining demand
 * is reported (as the still-remaining `graduationReminder.optativasHours`), never
 * silently dropped.
 *
 * ## Deliberate v1 limits (scope — Sprint 09)
 * - Fills only the semesters the mandatory packer already generated; it does not
 *   append elective-only semesters, so a student with no remaining mandatory
 *   courses (makespan 0) sees the demand reported, not scheduled.
 * - Reuses `checkPrerequisites` / the night filter / the cell math — no forked
 *   conflict logic. Selection among fitting optativas is deterministic (phase
 *   then id); professor-rating-aware preference stays deferred (#13).
 */

import type { Course } from "@/types/curriculum";
import type {
  StudentInfo,
  StudentPlan,
  StudentSemester,
} from "@/types/student-plan";
import { CourseStatus } from "@/types/student-plan";
import type { Professor } from "@/parsers/class-parser";
import { checkPrerequisites } from "@/lib/prerequisites";
import { isRealElective } from "@/lib/curriculum-status";
import {
  isNonDisciplineRequirement,
  resolveTerminalStatus,
} from "@/lib/plan-generator/candidates";
import { courseHours } from "@/lib/plan-generator/graduation";
import { isNightTurnoValid } from "@/lib/plan-generator/night";
import {
  expandToCells,
  sectionsConflict,
  stripNeutralDays,
} from "@/lib/schedule-conflict";
import type { GeneratorInput, PlanScenario } from "@/lib/plan-generator/types";

/**
 * Safety cap on how many elective-only semesters may be appended when demand
 * remains after the mandatory semesters are filled. A backstop against a
 * pathological pool; a real 288h target settles in a handful of semesters.
 */
const MAX_ELECTIVE_SPAN = 16;

/**
 * Ordered pool of real optativas eligible to be scheduled: a genuine elective
 * (not a generic placeholder), offered in the snapshot with at least one
 * night-turno-valid section, and not already earned/placed in the plan (by id or
 * equivalence — a completed/exempted/in-progress equivalent excludes it).
 * Deterministic order: phase ascending, then id.
 */
export function buildElectivePool(
  courses: Course[],
  sections: Record<string, Professor[]>,
  plan: StudentPlan,
  equivMap: Map<string, Set<string>>,
  turno: GeneratorInput["config"]["turno"],
): Course[] {
  const pool = courses.filter((course) => {
    if (!isRealElective(course)) return false;
    // Guard the #11 re-tag: an Atividades Complementares row re-tagged off
    // `mandatory` reads as a real elective but is not a schedulable discipline.
    if (isNonDisciplineRequirement(course)) return false;
    // Must be offered with a section this student's turno filter accepts.
    const profs = sections[course.id];
    if (!profs || profs.length === 0) return false;
    if (!profs.some((p) => isNightTurnoValid(course, p, turno))) return false;
    // Not already earned or fixed in the plan (matches mandatory identity rule).
    if (resolveTerminalStatus(course, plan, equivMap) !== null) return false;
    return true;
  });

  pool.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    return a.id.localeCompare(b.id);
  });

  return pool;
}

/** Night-turno-valid sections of `course`, ordered deterministically by turma. */
function validSections(
  course: Course,
  sections: Record<string, Professor[]>,
  turno: GeneratorInput["config"]["turno"],
): Professor[] {
  return (sections[course.id] ?? [])
    .filter((p) => isNightTurnoValid(course, p, turno))
    .sort((a, b) => (a.classNumber ?? "").localeCompare(b.classNumber ?? ""));
}

/** Saturday-stripped occupied cells of every course already in a semester. */
function occupiedCells(
  semester: StudentSemester,
  sections: Record<string, Professor[]>,
): Set<string> {
  const occupied = new Set<string>();
  for (const sc of semester.courses) {
    if (!sc.class) continue; // placed "sem turma" → occupies no grid cells
    const prof = (sections[sc.courseId] ?? []).find(
      (p) => p.classNumber === sc.class,
    );
    if (!prof) continue;
    for (const cell of stripNeutralDays(expandToCells(prof.slots))) {
      occupied.add(cell);
    }
  }
  return occupied;
}

/** Deep-clone a plan's semesters so the fill never mutates the input scenario. */
function clonePlan(plan: StudentPlan): StudentPlan {
  return {
    ...plan,
    semesters: plan.semesters.map((s) => ({
      ...s,
      courses: s.courses.map((c) => ({ ...c })),
    })),
  };
}

/**
 * Fill an already-generated scenario's free night slots with real optativas up
 * to its remaining elective demand (`scenario.graduationReminder.optativasHours`).
 *
 * Two phases: (1) fill the free slots of the already-generated mandatory
 * semesters; (2) if elective demand still remains, append elective-only
 * semesters (bounded by {@link MAX_ELECTIVE_SPAN}) until demand is met or the
 * offered pool can place nothing more — so the plan reaches the 288h target
 * instead of merely reporting the gap. Appended semesters are counted in
 * `electiveOnlySemesters`; they do NOT change `totalFutureSemesters` (the
 * mandatory makespan), keeping the daytime-card comparison stable.
 *
 * Returns a new scenario (inputs never mutated) with the placed electives added
 * to the plan, `optativasPlacedHours` / `electiveOnlySemesters` set,
 * `perSemesterCredits` extended, and `graduationReminder.optativasHours` reduced
 * to the leftover shortfall. A no-op (only the two fields zeroed) when demand is
 * already 0 — the mandatory plan is then untouched (parity).
 */
export function fillElectivesIntoScenario(
  scenario: PlanScenario,
  input: GeneratorInput,
  equivMap: Map<string, Set<string>>,
  cardId: string,
): PlanScenario {
  const demand = scenario.graduationReminder.optativasHours;
  if (demand <= 0) {
    return { ...scenario, optativasPlacedHours: 0, electiveOnlySemesters: 0 };
  }

  const { studentInfo, courses, sections, config } = input;
  const workingPlan = clonePlan(scenario.plan);
  const workingInfo: StudentInfo = {
    ...studentInfo,
    plans: studentInfo.plans.map((p, i) =>
      i === studentInfo.currentPlan ? workingPlan : p,
    ),
  };

  const pool = buildElectivePool(
    courses,
    sections,
    workingPlan,
    equivMap,
    config.turno,
  );

  const placed = new Set<string>();
  let placedHours = 0;
  let counter = 0;

  /**
   * Greedily place fitting pool optativas into `semester` (mutating it and the
   * shared `placed`/`placedHours`/`counter` state). Rescans the pool each round:
   * a later course may fit where an earlier one didn't, and a just-placed
   * elective can gate a later one. Returns how many it placed.
   */
  const fillSemester = (semester: StudentSemester): number => {
    const occupied = occupiedCells(semester, sections);
    let count = 0;
    let progressed = true;
    while (progressed && placedHours < demand) {
      progressed = false;
      for (const course of pool) {
        if (placed.has(course.id)) continue;
        const credits = course.credits || 0;
        if (semester.totalCredits + credits > config.creditCap) continue;
        if (
          !checkPrerequisites(course, semester.number, workingInfo, equivMap)
            .satisfied
        ) {
          continue;
        }
        const section = validSections(course, sections, config.turno).find(
          (p) => !sectionsConflict(
            stripNeutralDays(expandToCells(p.slots)),
            occupied,
          ),
        );
        if (!section) continue;

        for (const cell of stripNeutralDays(expandToCells(section.slots))) {
          occupied.add(cell);
        }
        semester.courses.push({
          courseId: course.id,
          instanceId: `gen-${cardId}-opt-${counter++}`,
          credits,
          status: CourseStatus.PLANNED,
          class: section.classNumber,
          phase: semester.number,
        });
        semester.totalCredits += credits;
        placed.add(course.id);
        placedHours += courseHours(course);
        count++;
        progressed = true;
        break;
      }
    }
    return count;
  };

  // Phase 1: fill the free slots of the already-generated mandatory semesters.
  const genNumbers = workingPlan.semesters
    .filter((s) => s.courses.some((c) => c.instanceId?.startsWith("gen-")))
    .map((s) => s.number);
  const firstGen = genNumbers.length ? Math.min(...genNumbers) : undefined;
  const lastGen = genNumbers.length ? Math.max(...genNumbers) : undefined;

  if (firstGen !== undefined && lastGen !== undefined) {
    for (let n = firstGen; n <= lastGen && placedHours < demand; n++) {
      const semester = workingPlan.semesters.find((s) => s.number === n);
      if (semester) fillSemester(semester);
    }
  }

  // Phase 2: if demand still remains, append elective-only semesters until it is
  // met or the offered pool can place nothing more (honest shortfall). Bounded.
  let electiveOnlySemesters = 0;
  let appendNumber =
    Math.max(0, ...workingPlan.semesters.map((s) => s.number)) + 1;
  while (placedHours < demand && electiveOnlySemesters < MAX_ELECTIVE_SPAN) {
    const semester: StudentSemester = {
      number: appendNumber,
      courses: [],
      totalCredits: 0,
    };
    const count = fillSemester(semester);
    if (count === 0) break; // pool exhausted / prereqs block → stop
    workingPlan.semesters.push(semester); // visible to later appended semesters
    electiveOnlySemesters++;
    appendNumber++;
  }

  // Preview credits over every future semester we touched (mandatory + elective).
  const rangeStart = firstGen ?? (electiveOnlySemesters > 0 ? appendNumber - electiveOnlySemesters : undefined);
  const rangeEnd = appendNumber - 1;
  const perSemesterCredits: number[] = [];
  if (rangeStart !== undefined) {
    for (let n = rangeStart; n <= rangeEnd; n++) {
      const sem = workingPlan.semesters.find((s) => s.number === n);
      perSemesterCredits.push(sem?.totalCredits ?? 0);
    }
  }

  return {
    ...scenario,
    plan: workingPlan,
    perSemesterCredits: perSemesterCredits.length
      ? perSemesterCredits
      : scenario.perSemesterCredits,
    optativasPlacedHours: placedHours,
    electiveOnlySemesters,
    graduationReminder: {
      ...scenario.graduationReminder,
      optativasHours: Math.max(0, demand - placedHours),
    },
  };
}
