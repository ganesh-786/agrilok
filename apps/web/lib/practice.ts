// Practice rules as pure functions: how a session is chosen, how a mock test
// is scored, and when a mistake comes back for review. No storage, no DOM, so
// every rule here is tested (lib/study.test.ts).

import type { OptionId, Paper, Syllabus } from "@/lib/contracts";
import { addDays } from "@/lib/dates";

// --- Progress, as stored on the device (lib/client/progress.ts) --------------------

export type AnswerRecord = {
  attempts: number;
  correct: number;
  lastChoice: OptionId | null;
  lastCorrect: boolean;
  lastAt: string;
  /** 0: never wrong. 1 to 4: in review. 5: learned. */
  stage: number;
  /** ISO day the question comes back for review, or null. */
  due: string | null;
};

export type SyllabusProgress = {
  answers: Record<string, AnswerRecord>;
  /** Topic id to the ISO time the study note was last opened. */
  studied: Record<string, string>;
  lastTopicId: string | null;
  saved: string[];
};

export const EMPTY_PROGRESS: SyllabusProgress = {
  answers: {},
  studied: {},
  lastTopicId: null,
  saved: [],
};

// --- Spaced review ------------------------------------------------------------------

/**
 * Days until a mistake comes back, by review stage. A wrong answer returns the
 * next day; each right answer after that waits longer. Practice testing and
 * spacing it out are the two study techniques with the strongest evidence
 * (Dunlosky et al., 2013), which is why mistakes are scheduled, not listed.
 */
export const REVIEW_INTERVALS = [1, 3, 7, 14] as const;
export const LEARNED_STAGE = REVIEW_INTERVALS.length + 1;

export function recordAnswer(
  previous: AnswerRecord | undefined,
  choice: OptionId | null,
  correct: boolean,
  today: string,
  now: string,
): AnswerRecord {
  const base: AnswerRecord = previous ?? {
    attempts: 0,
    correct: 0,
    lastChoice: null,
    lastCorrect: false,
    lastAt: now,
    stage: 0,
    due: null,
  };
  let stage = base.stage;
  let due: string | null;
  if (!correct) {
    stage = 1;
    due = addDays(today, REVIEW_INTERVALS[0]);
  } else if (stage === 0) {
    // Right the first time: nothing to review.
    due = null;
  } else {
    stage = Math.min(stage + 1, LEARNED_STAGE);
    const interval = REVIEW_INTERVALS[stage - 1];
    due = stage >= LEARNED_STAGE || interval === undefined ? null : addDays(today, interval);
  }
  return {
    attempts: base.attempts + 1,
    correct: base.correct + (correct ? 1 : 0),
    lastChoice: choice,
    lastCorrect: correct,
    lastAt: now,
    stage,
    due,
  };
}

export function isDue(record: AnswerRecord | undefined, today: string): boolean {
  return !!record?.due && record.due <= today;
}

export function dueQuestionIds(progress: SyllabusProgress, today: string): string[] {
  return Object.entries(progress.answers)
    .filter(([, record]) => isDue(record, today))
    .sort(([, a], [, b]) => (a.due ?? "").localeCompare(b.due ?? ""))
    .map(([id]) => id);
}

// --- Scoring ------------------------------------------------------------------------

export type Score = {
  correct: number;
  wrong: number;
  skipped: number;
  /** Marks gained, deductions, and the net, in the paper's own marks. */
  gained: number;
  deducted: number;
  net: number;
  outOf: number;
};

/**
 * Score answers the way the syllabus does: full marks for a right answer, a
 * deduction of `negativePercent` of the question's marks for a wrong one,
 * nothing either way for a skipped one.
 */
export function scoreAnswers(
  results: ("correct" | "wrong" | "skipped")[],
  marksPerQuestion: number,
  negativePercent: number,
): Score {
  const correct = results.filter((r) => r === "correct").length;
  const wrong = results.filter((r) => r === "wrong").length;
  const skipped = results.length - correct - wrong;
  const gained = correct * marksPerQuestion;
  const deducted = round2((wrong * marksPerQuestion * negativePercent) / 100);
  return {
    correct,
    wrong,
    skipped,
    gained,
    deducted,
    net: round2(gained - deducted),
    outOf: results.length * marksPerQuestion,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The average score of a blind guess on one question with `options` choices:
 * positive means guessing pays on average. With four options and a 20
 * percent deduction it is 1/4 - 3/4 × 0.2 = +0.10 of the question's marks,
 * and ruling out one option raises it to +0.20.
 */
export function guessValue(options: number, negativePercent: number): number {
  const p = 1 / options;
  return round2(p - (1 - p) * (negativePercent / 100));
}

// --- Choosing a session ----------------------------------------------------------------

/** A small seeded random generator, so a day's set stays the same on reload. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

type PoolItem = { id: string; subjectId: string };

/** The objective paper, the one practised with multiple-choice questions. */
export function objectivePaper(syllabus: Syllabus): Paper | null {
  return syllabus.papers.find((paper) => paper.format === "objective") ?? null;
}

/** Subject weights in the objective paper, in the paper's own order. */
export function objectiveBlueprint(syllabus: Syllabus): { subjectId: string; questions: number }[] {
  const paper = objectivePaper(syllabus);
  if (!paper) return [];
  return paper.sections.flatMap((section) =>
    section.weights
      .filter((w) => (w.questions ?? 0) > 0)
      .map((w) => ({ subjectId: w.subjectId, questions: w.questions ?? 0 })),
  );
}

/**
 * Quick practice: mistakes that are due come first, then questions not yet
 * answered, drawn in proportion to how many questions each subject carries
 * in the real paper, then the rest.
 */
export function pickQuick<T extends PoolItem>(
  pool: readonly T[],
  weights: { subjectId: string; questions: number }[],
  progress: SyllabusProgress,
  today: string,
  seed: string,
  size = 10,
): T[] {
  const random = seededRandom(seed);
  const due = new Set(dueQuestionIds(progress, today));
  const byId = new Map(pool.map((q) => [q.id, q]));
  const chosen: T[] = [];
  for (const id of due) {
    const q = byId.get(id);
    if (q && chosen.length < size) chosen.push(q);
  }
  const taken = new Set(chosen.map((q) => q.id));
  const unseen = shuffle(
    pool.filter((q) => !taken.has(q.id) && !progress.answers[q.id]),
    random,
  );
  const weightOf = new Map(weights.map((w) => [w.subjectId, w.questions]));
  // Weighted draw without replacement: heavier subjects come up more often.
  const remaining = [...unseen];
  while (chosen.length < size && remaining.length) {
    const total = remaining.reduce((sum, q) => sum + (weightOf.get(q.subjectId) ?? 1), 0);
    let roll = random() * total;
    let index = 0;
    for (; index < remaining.length - 1; index += 1) {
      roll -= weightOf.get(remaining[index]?.subjectId ?? "") ?? 1;
      if (roll < 0) break;
    }
    const [next] = remaining.splice(index, 1);
    if (next) {
      chosen.push(next);
      taken.add(next.id);
    }
  }
  const rest = shuffle(
    pool.filter((q) => !taken.has(q.id)),
    random,
  );
  for (const q of rest) {
    if (chosen.length >= size) break;
    chosen.push(q);
  }
  return chosen;
}

/** Up to `size` questions from one subject or topic, unseen ones first. */
export function pickFrom<T extends PoolItem>(
  pool: readonly T[],
  progress: SyllabusProgress,
  seed: string,
  size = 10,
): T[] {
  const random = seededRandom(seed);
  const unseen = shuffle(
    pool.filter((q) => !progress.answers[q.id]),
    random,
  );
  const seen = shuffle(
    pool.filter((q) => progress.answers[q.id]),
    random,
  );
  return [...unseen, ...seen].slice(0, size);
}

/** Mistakes to review: those due first, then other questions last answered wrong. */
export function pickMistakes<T extends PoolItem>(
  pool: readonly T[],
  progress: SyllabusProgress,
  today: string,
  size = 10,
): T[] {
  const due = dueQuestionIds(progress, today);
  const byId = new Map(pool.map((q) => [q.id, q]));
  const others = Object.entries(progress.answers)
    .filter(([id, record]) => !record.lastCorrect && !due.includes(id))
    .map(([id]) => id);
  return [...due, ...others]
    .map((id) => byId.get(id))
    .filter((q): q is T => !!q)
    .slice(0, size);
}

export type MockPlan<T> = {
  questions: T[];
  /** Questions the real paper has, and time scaled to the questions taken. */
  realQuestions: number;
  minutes: number;
  scaled: boolean;
};

/**
 * A mock test in the paper's real format: each subject gets the number of
 * questions the syllabus gives it, in the paper's order. When the bank holds
 * fewer, the mock takes what exists and scales the time in proportion, and
 * says so.
 */
export type MockSpec = {
  blueprint: { subjectId: string; questions: number }[];
  questionCount: number;
  minutes: number;
  marksPerQuestion: number;
  negativePercent: number;
};

/** What a mock test needs to know about the paper, taken from the syllabus. */
export function mockSpec(syllabus: Syllabus): MockSpec | null {
  const paper = objectivePaper(syllabus);
  if (!paper?.questionCount || !paper.marksPerQuestion) return null;
  return {
    blueprint: objectiveBlueprint(syllabus),
    questionCount: paper.questionCount,
    minutes: paper.minutes,
    marksPerQuestion: paper.marksPerQuestion,
    negativePercent: syllabus.negativeMarkingPercent,
  };
}

export function planMock<T extends PoolItem>(
  pool: readonly T[],
  spec: MockSpec,
  seed: string,
): MockPlan<T> | null {
  const random = seededRandom(seed);
  const chosen: T[] = [];
  for (const { subjectId, questions } of spec.blueprint) {
    const inSubject = shuffle(
      pool.filter((q) => q.subjectId === subjectId),
      random,
    );
    chosen.push(...inSubject.slice(0, questions));
  }
  if (!chosen.length) return null;
  const scaled = chosen.length < spec.questionCount;
  const minutes = scaled
    ? Math.max(1, Math.ceil((spec.minutes * chosen.length) / spec.questionCount))
    : spec.minutes;
  return { questions: chosen, realQuestions: spec.questionCount, minutes, scaled };
}

// --- Progress summaries --------------------------------------------------------------

export type TopicStat = { topicId: string; attempts: number; correct: number };

export function topicStats(
  progress: SyllabusProgress,
  questionTopic: Record<string, string>,
): Map<string, TopicStat> {
  const stats = new Map<string, TopicStat>();
  for (const [questionId, record] of Object.entries(progress.answers)) {
    const topicId = questionTopic[questionId];
    if (!topicId) continue;
    const stat = stats.get(topicId) ?? { topicId, attempts: 0, correct: 0 };
    stat.attempts += record.attempts;
    stat.correct += record.correct;
    stats.set(topicId, stat);
  }
  return stats;
}

/**
 * Weak topics: at least `minAttempts` answers and under `threshold` right.
 * Below that many answers a percentage means nothing, so none is shown.
 */
export function weakTopics(
  stats: Map<string, TopicStat>,
  minAttempts = 3,
  threshold = 0.6,
): TopicStat[] {
  return [...stats.values()]
    .filter((s) => s.attempts >= minAttempts && s.correct / s.attempts < threshold)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts);
}
