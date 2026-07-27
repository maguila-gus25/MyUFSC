/**
 * Tests for the elective (optativas) post-pass (issue #7).
 *
 * Two layers: `buildElectivePool` is unit-tested directly; the fill is tested
 * through the public `generatePlanScenarios` so the real scenario shape drives
 * it. Pure-function tests via `node:test` + `tsx` (`pnpm run test`). Fixtures are
 * plain `Course[]` / `StudentInfo` / `sections` matching the real shapes.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import type { Course } from "@/types/curriculum";
import type { StudentInfo, StudentPlan } from "@/types/student-plan";
import { CourseStatus } from "@/types/student-plan";
import type { Professor } from "@/parsers/class-parser";
import type { TurnoFilter } from "@/lib/schedule-conflict";
import { buildElectivePool } from "@/lib/plan-generator/electives";
import { generatePlanScenarios } from "@/lib/plan-generator/generate";
import type { GeneratorInput, PlanScenario } from "@/lib/plan-generator/types";

// --- fixture builders --------------------------------------------------------

function mandatory(
  partial: Partial<Course> & { id: string; name: string },
): Course {
  return {
    credits: 4,
    type: "mandatory",
    phase: 1,
    equivalents: [],
    prerequisites: [],
    ...partial,
  };
}

/** A genuine (non-placeholder) elective — real id, no "OPT"/"optativa" tell. */
function optativa(
  partial: Partial<Course> & { id: string; name: string },
): Course {
  return {
    credits: 4,
    type: "optional",
    phase: 1,
    equivalents: [],
    prerequisites: [],
    ...partial,
  };
}

function prof(
  courseId: string,
  classNumber: string,
  day: number,
  startTime: string,
  endTime: string,
): Professor {
  return {
    professorId: `${courseId}_${classNumber}`,
    name: "Fulano",
    classNumber,
    schedule: `${startTime}-${endTime}`,
    slots: [{ day, startTime, endTime, location: "" }],
    enrolledStudents: 0,
    maxStudents: 40,
  };
}

const NO_PREF: TurnoFilter = { morning: true, afternoon: true, night: true };
const noEquiv = new Map<string, Set<string>>();

/**
 * Build an input. `history` seeds `plans[0]` (e.g. a completed optativa that
 * lowers the remaining 288h demand); default is an empty plan.
 */
function makeInput(
  courses: Course[],
  sections: Record<string, Professor[]>,
  opts: { creditCap?: number; history?: StudentPlan } = {},
): GeneratorInput {
  const studentInfo: StudentInfo = {
    currentDegree: "TEST",
    interestedDegrees: [],
    name: "Test",
    currentPlan: 0,
    currentSemester: "20251",
    plans: [opts.history ?? { semesters: [] }],
  };
  return {
    studentInfo,
    courses,
    sections,
    config: { turno: NO_PREF, creditCap: opts.creditCap ?? 30 },
  };
}

/** A completed optativa in semester 1 that earned `workload` hours of demand. */
function completedOptativaHistory(id: string, workload: number): StudentPlan {
  return {
    semesters: [
      {
        number: 1,
        totalCredits: 4,
        courses: [
          {
            courseId: id,
            instanceId: `hist-${id}`,
            credits: 4,
            status: CourseStatus.COMPLETED,
            phase: 1,
          },
        ],
      },
    ],
  };
}

const primary = (r: { scenarios: PlanScenario[] }): PlanScenario => r.scenarios[0];

/** Ids of every course placed anywhere in the generated plan. */
function placedIds(scenario: PlanScenario): Set<string> {
  const ids = new Set<string>();
  for (const sem of scenario.plan.semesters) {
    for (const c of sem.courses) ids.add(c.courseId);
  }
  return ids;
}

// --- buildElectivePool -------------------------------------------------------

test("buildElectivePool: keeps offered real optativas, drops placeholders/unoffered", () => {
  const real = optativa({ id: "INE5453", name: "Computação Gráfica" });
  const placeholder = optativa({ id: "OPT0001", name: "Optativa" }); // generic slot
  const unoffered = optativa({ id: "INE5460", name: "Sem Oferta" });
  const sections: Record<string, Professor[]> = {
    INE5453: [prof("INE5453", "01", 0, "18:30", "20:10")],
    OPT0001: [prof("OPT0001", "01", 1, "18:30", "20:10")],
    // INE5460 has no sections
  };

  const pool = buildElectivePool(
    [real, placeholder, unoffered],
    sections,
    { semesters: [] },
    noEquiv,
    NO_PREF,
  );

  assert.deepEqual(pool.map((c) => c.id), ["INE5453"]);
});

test("buildElectivePool: excludes an optativa already completed in the plan; orders by phase then id", () => {
  const a = optativa({ id: "INE5455", name: "B", phase: 5 });
  const b = optativa({ id: "INE5410", name: "A", phase: 2 });
  const done = optativa({ id: "INE5430", name: "Done", phase: 2 });
  const sections: Record<string, Professor[]> = {
    INE5455: [prof("INE5455", "01", 0, "18:30", "20:10")],
    INE5410: [prof("INE5410", "01", 1, "18:30", "20:10")],
    INE5430: [prof("INE5430", "01", 2, "18:30", "20:10")],
  };
  const history = completedOptativaHistory("INE5430", 72);

  const pool = buildElectivePool(
    [a, b, done],
    sections,
    history,
    noEquiv,
    NO_PREF,
  );

  // Done excluded; remaining ordered phase asc (INE5410 phase 2 before INE5455 phase 5).
  assert.deepEqual(pool.map((c) => c.id), ["INE5410", "INE5455"]);
});

// --- fill via generatePlanScenarios -----------------------------------------

test("zero remaining demand → no optativa scheduled, plan is mandatory-only", () => {
  const m = mandatory({ id: "M", name: "Mand" });
  const o1 = optativa({ id: "OA", name: "Opt A" });
  const sections: Record<string, Professor[]> = {
    M: [prof("M", "01", 0, "18:30", "20:10")],
    OA: [prof("OA", "01", 1, "18:30", "20:10")],
  };
  // 288h already earned → demand 0.
  const input = makeInput([m, o1], sections, {
    history: completedOptativaHistory("ODONE", 288),
  });
  // ODONE isn't in the curriculum courses, so add it so the reminder counts it.
  input.courses.push(optativa({ id: "ODONE", name: "Done", workload: 288 }));

  const scenario = primary(generatePlanScenarios(input));

  assert.equal(scenario.optativasPlacedHours, 0);
  assert.equal(scenario.graduationReminder.optativasHours, 0);
  assert.ok(!placedIds(scenario).has("OA"), "OA must not be scheduled");
});

test("partial demand → fills free slots and stops once demand is met", () => {
  const m = mandatory({ id: "M", name: "Mand" });
  const oa = optativa({ id: "OA", name: "Opt A", workload: 72 });
  const ob = optativa({ id: "OB", name: "Opt B", workload: 72 });
  const done = optativa({ id: "ODONE", name: "Done", workload: 216 });
  const sections: Record<string, Professor[]> = {
    M: [prof("M", "01", 0, "18:30", "20:10")],
    OA: [prof("OA", "01", 1, "18:30", "20:10")], // distinct cells → no conflict
    OB: [prof("OB", "01", 2, "18:30", "20:10")],
    ODONE: [prof("ODONE", "01", 3, "18:30", "20:10")],
  };
  // 216 earned → demand 72 → exactly one 72h optativa placed.
  const input = makeInput([m, oa, ob, done], sections, {
    history: completedOptativaHistory("ODONE", 216),
  });

  const scenario = primary(generatePlanScenarios(input));
  const ids = placedIds(scenario);

  assert.equal(scenario.optativasPlacedHours, 72);
  assert.equal(scenario.graduationReminder.optativasHours, 0);
  assert.ok(ids.has("OA"), "first pool optativa placed");
  assert.ok(!ids.has("OB"), "second optativa not placed once demand met");
});

test("demand exceeds offered pool → places all it can, reports the shortfall", () => {
  const m = mandatory({ id: "M", name: "Mand" });
  const oa = optativa({ id: "OA", name: "Opt A", workload: 72 });
  const ob = optativa({ id: "OB", name: "Opt B", workload: 72 });
  const sections: Record<string, Professor[]> = {
    M: [prof("M", "01", 0, "18:30", "20:10")],
    OA: [prof("OA", "01", 1, "18:30", "20:10")],
    OB: [prof("OB", "01", 2, "18:30", "20:10")],
  };
  // No completed electives → full 288h demand, pool only covers 144h.
  const input = makeInput([m, oa, ob], sections);

  const scenario = primary(generatePlanScenarios(input));
  const ids = placedIds(scenario);

  assert.equal(scenario.optativasPlacedHours, 144);
  assert.equal(scenario.graduationReminder.optativasHours, 288 - 144);
  assert.ok(ids.has("OA") && ids.has("OB"), "both offered optativas placed");
});

test("an optativa clashing with the mandatory course in every free slot is not placed", () => {
  const m = mandatory({ id: "M", name: "Mand" });
  // OA's only section occupies the exact cell M sits in → never fits.
  const oa = optativa({ id: "OA", name: "Opt A", workload: 72 });
  const sections: Record<string, Professor[]> = {
    M: [prof("M", "01", 0, "18:30", "20:10")],
    OA: [prof("OA", "01", 0, "18:30", "20:10")],
  };
  const input = makeInput([m, oa], sections);

  const scenario = primary(generatePlanScenarios(input));

  assert.equal(scenario.optativasPlacedHours, 0);
  assert.ok(!placedIds(scenario).has("OA"), "conflicting optativa not placed");
});

test("elective fill respects the credit cap", () => {
  const m = mandatory({ id: "M", name: "Mand" }); // 4 credits
  const oa = optativa({ id: "OA", name: "Opt A", workload: 72 }); // 4 credits
  const ob = optativa({ id: "OB", name: "Opt B", workload: 72 }); // 4 credits
  const sections: Record<string, Professor[]> = {
    M: [prof("M", "01", 0, "18:30", "20:10")],
    OA: [prof("OA", "01", 1, "18:30", "20:10")],
    OB: [prof("OB", "01", 2, "18:30", "20:10")],
  };
  // Cap 8 → M(4)+one optativa(4) fills the only generated semester.
  const input = makeInput([m, oa, ob], sections, { creditCap: 8 });

  const scenario = primary(generatePlanScenarios(input));

  assert.equal(scenario.optativasPlacedHours, 72, "only one optativa fits the cap");
  for (const sem of scenario.plan.semesters) {
    assert.ok(sem.totalCredits <= 8, `semester ${sem.number} within cap`);
  }
});
