// Study plans built by rule, not by a model: from the syllabus's own weights
// and the days left before the exam. The same inputs always give the same
// plan, it costs nothing to make, and it works offline. AI-written plans are
// deferred until the core loop is validated (docs/student-experience.md).

import type { Syllabus } from "@/lib/contracts";
import { daysBetween } from "@/lib/dates";

export type PlanLength = 7 | 30 | 90;
export const PLAN_LENGTHS: PlanLength[] = [7, 30, 90];

export type Priority = {
  subjectId: string;
  /** Questions in the multiple-choice paper, and marks in the written one. */
  questions: number;
  marks: number;
};

/**
 * Subjects in the order to study them: most multiple-choice questions first,
 * then most written-paper marks. That is where a day of study buys the most
 * marks.
 */
export function priorities(syllabus: Syllabus): Priority[] {
  const bySubject = new Map<string, Priority>();
  for (const subject of syllabus.subjects) {
    bySubject.set(subject.id, { subjectId: subject.id, questions: 0, marks: 0 });
  }
  for (const paper of syllabus.papers) {
    for (const section of paper.sections) {
      for (const weight of section.weights) {
        const entry = bySubject.get(weight.subjectId);
        if (!entry) continue;
        if (paper.format === "objective") entry.questions += weight.questions ?? 0;
        else entry.marks += weight.marks ?? 0;
      }
    }
  }
  return [...bySubject.values()]
    .filter((p) => p.questions > 0 || p.marks > 0)
    .sort((a, b) => b.questions - a.questions || b.marks - a.marks);
}

export type PlanBlock = {
  unit: "day" | "week";
  from: number;
  to: number;
  focus: "study" | "second_pass" | "practice" | "mock" | "revise";
  subjectIds: string[];
};

/** Split subjects, heaviest first, into `bins` groups of roughly equal weight. */
function spread(items: Priority[], bins: number): string[][] {
  const groups: { ids: string[]; weight: number }[] = Array.from({ length: bins }, () => ({
    ids: [],
    weight: 0,
  }));
  for (const item of items) {
    const weight = item.questions * 2 + item.marks || 1;
    const lightest = groups.reduce((min, g) => (g.weight < min.weight ? g : min));
    lightest.ids.push(item.subjectId);
    lightest.weight += weight;
  }
  // Heaviest groups first, so the plan opens with the subjects that carry most.
  return groups
    .filter((g) => g.ids.length)
    .sort((a, b) => b.weight - a.weight)
    .map((g) => g.ids);
}

export function buildPlan(syllabus: Syllabus, length: PlanLength): PlanBlock[] {
  const order = priorities(syllabus);
  if (!order.length) return [];
  if (length === 7) {
    const days = spread(order, 5).map((ids, i) => ({
      unit: "day" as const,
      from: i + 1,
      to: i + 1,
      focus: "study" as const,
      subjectIds: ids,
    }));
    return [
      ...days,
      { unit: "day", from: 6, to: 6, focus: "practice", subjectIds: [] },
      { unit: "day", from: 7, to: 7, focus: "mock", subjectIds: [] },
    ];
  }
  if (length === 30) {
    const weeks = spread(order, 3).map((ids, i) => ({
      unit: "week" as const,
      from: i + 1,
      to: i + 1,
      focus: "study" as const,
      subjectIds: ids,
    }));
    return [...weeks, { unit: "week", from: 4, to: 4, focus: "mock", subjectIds: [] }];
  }
  const firstPass = spread(order, 4).map((ids, i) => ({
    unit: "week" as const,
    from: i + 1,
    to: i + 1,
    focus: "study" as const,
    subjectIds: ids,
  }));
  const secondPass = firstPass.map((block, i) => ({
    ...block,
    from: i + 5,
    to: i + 5,
    focus: "second_pass" as const,
  }));
  return [
    ...firstPass,
    ...secondPass,
    { unit: "week", from: 9, to: 11, focus: "practice", subjectIds: [] },
    { unit: "week", from: 12, to: 12, focus: "revise", subjectIds: [] },
  ];
}

/** The plan that fits the time left: shorter plans for closer exams. */
export function recommendedLength(daysLeft: number | null): PlanLength {
  if (daysLeft === null) return 30;
  if (daysLeft <= 10) return 7;
  if (daysLeft <= 45) return 30;
  return 90;
}

export function daysLeft(examDate: string | null, today: string): number | null {
  if (!examDate) return null;
  return daysBetween(today, examDate);
}

/**
 * Which block the student should be in now. With an exam date, the plan is
 * laid so it ends on exam day; without one, it starts today.
 */
export function currentBlockIndex(
  plan: PlanBlock[],
  length: PlanLength,
  left: number | null,
): number {
  if (!plan.length) return -1;
  const elapsedDays = left === null ? 0 : Math.max(0, length - left);
  const position = plan[0]?.unit === "day" ? elapsedDays + 1 : Math.floor(elapsedDays / 7) + 1;
  const index = plan.findIndex((b) => position >= b.from && position <= b.to);
  return index === -1 ? plan.length - 1 : index;
}
