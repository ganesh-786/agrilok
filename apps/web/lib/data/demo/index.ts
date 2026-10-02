// Everything in the demo dataset, in one place. Pure data: importable by the
// server and by tests, never by a client component (lib/data/index.ts is the
// only door, and it is server-only).

import type { Question, StudyNote, Syllabus } from "@/lib/contracts";

import * as level4 from "./lumbini-level-4";
import * as level7 from "./lumbini-level-7";

export { documents } from "./documents";
export { demoNotices } from "./notices";

export const syllabi: Syllabus[] = [level4.syllabus, level7.syllabus];

export const notesBySyllabus: Record<string, StudyNote[]> = {
  [level4.syllabus.id]: level4.notes,
  [level7.syllabus.id]: level7.notes,
};

export const questionsBySyllabus: Record<string, Question[]> = {
  [level4.syllabus.id]: level4.questions,
  [level7.syllabus.id]: level7.questions,
};
