/**
 * Remaining graduation-requirement hours (complementares + optativas).
 *
 * Beyond the mandatory disciplines the packer schedules, a UFSC degree also
 * requires a fixed budget of elective (optativas) hours and non-discipline
 * activity (atividades complementares) hours. This module computes how many of
 * each still remain, given what the student has already completed/exempted in
 * their current plan. Pure, side-effect-free — plain `StudentInfo` / `Course[]`
 * in, a {@link GraduationReminder} out.
 *
 * Bucketing reuses the existing predicates rather than re-deriving them:
 *  - a real (non-placeholder) elective → optativas bucket
 *    ({@link isRealElective} from `lib/curriculum-status`);
 *  - a non-discipline graduation requirement → complementares bucket
 *    ({@link isNonDisciplineRequirement} from `./candidates`).
 * Mandatory disciplines and generic elective placeholders count toward neither.
 *
 * Only COMPLETED / EXEMPTED count (fixed academic history). PLANNED /
 * IN_PROGRESS / FAILED are explicitly excluded — nothing tentative reduces the
 * remaining requirement. Hours per course = `def.workload || def.credits * 18`
 * (18h/credit, matching `curriculum-status.ts`).
 */

import type { Course } from "@/types/curriculum";
import type { StudentInfo } from "@/types/student-plan";
import { CourseStatus } from "@/types/student-plan";
import { isRealElective } from "@/lib/curriculum-status";
import { isNonDisciplineRequirement } from "@/lib/plan-generator/candidates";
import type { GraduationReminder } from "@/lib/plan-generator/types";

/** Total non-discipline (atividades complementares) hours a degree requires. */
const COMPLEMENTARES_TOTAL_HOURS = 360;

/** Total elective (optativas) hours a degree requires. */
const OPTATIVAS_TOTAL_HOURS = 288;

/** Hours credited for a course (18h/credit fallback, matching curriculum-status). */
function courseHours(def: Course): number {
  return def.workload || def.credits * 18;
}

/**
 * Compute the remaining complementares/optativas hours for a student's current
 * plan. Iterates the plan's semesters, and for each COMPLETED/EXEMPTED course
 * that resolves (by exact id) to a curriculum definition, adds its hours to the
 * matching bucket. Returns the remaining hours clamped at a floor of 0, so
 * over-earning reports 0 (never negative).
 */
export function computeGraduationReminder(
  studentInfo: StudentInfo,
  courses: Course[],
): GraduationReminder {
  const courseById = new Map(courses.map((c) => [c.id, c] as const));

  let complementaresEarned = 0;
  let optativasEarned = 0;

  const plan = studentInfo.plans[studentInfo.currentPlan];
  const semesters = plan?.semesters ?? [];

  for (const semester of semesters) {
    for (const sc of semester.courses) {
      if (
        sc.status !== CourseStatus.COMPLETED &&
        sc.status !== CourseStatus.EXEMPTED
      ) {
        continue;
      }

      const def = courseById.get(sc.courseId);
      if (!def) continue;

      if (isRealElective(def)) {
        optativasEarned += courseHours(def);
      } else if (isNonDisciplineRequirement(def)) {
        complementaresEarned += courseHours(def);
      }
      // Mandatory disciplines and generic elective placeholders count toward
      // neither bucket.
    }
  }

  return {
    complementaresHours: Math.max(
      0,
      COMPLEMENTARES_TOTAL_HOURS - complementaresEarned,
    ),
    optativasHours: Math.max(0, OPTATIVAS_TOTAL_HOURS - optativasEarned),
  };
}
