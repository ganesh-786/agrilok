// Small builders that keep the demo dataset readable. Pure functions only, so
// the dataset can be imported by tests as well as by the server.

import type { CitationRef, OptionId, Question, Text } from "@/lib/contracts";

import { publishers } from "./documents";

export const t = (ne: string, en: string): Text => ({ ne, en });

/** A citation to a real passage of an official document. */
export function official(
  documentId: string,
  locator: Text,
  quote?: { text: string; lang?: "ne" | "en"; translation?: Text },
): CitationRef {
  return {
    kind: "official",
    documentId,
    locator,
    quote: quote
      ? { text: quote.text, lang: quote.lang ?? "ne", translation: quote.translation ?? null }
      : null,
  };
}

/**
 * The kind of official source a demo item will cite once it is written from
 * one. It names the publisher and links only the publisher's own site.
 */
export function placeholder(key: keyof typeof publishers): CitationRef {
  const p = publishers[key];
  return { kind: "placeholder", publisher: p.publisher, homepage: p.homepage };
}

const LETTERS: OptionId[] = ["a", "b", "c", "d"];

/** A stable small hash, so the same id always gives the same option order. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type QuestionInput = Omit<Question, "options" | "answer" | "review"> & {
  /** Correct option, written first. */
  correct: Text;
  /** Three wrong options, each with why it is wrong. */
  wrong: [Text, Text][];
};

/**
 * Build a question from its correct option and three wrong ones.
 *
 * Every question is written with the correct option first, which a student
 * would spot within a few questions. The options are rotated by a hash of the
 * question id instead, so the answer's position varies but never changes
 * between visits.
 */
export function question(input: QuestionInput): Question {
  if (input.wrong.length !== 3) throw new Error(`${input.id}: needs exactly three wrong options`);
  const written = [
    { text: input.correct, whyWrong: null as Text | null, correct: true },
    ...input.wrong.map(([text, why]) => ({ text, whyWrong: why, correct: false })),
  ];
  const shift = hash(input.id) % written.length;
  const ordered = [...written.slice(shift), ...written.slice(0, shift)];
  const options = ordered.map((option, i) => ({
    id: LETTERS[i] as OptionId,
    text: option.text,
    whyWrong: option.whyWrong,
  }));
  const answerIndex = ordered.findIndex((option) => option.correct);
  const { correct, wrong, ...rest } = input;
  void correct;
  void wrong;
  return {
    ...rest,
    options,
    answer: LETTERS[answerIndex] as OptionId,
    // Every drafted question starts pending review (ADR decision 2).
    review: "ai_assisted_pending_review",
  };
}
