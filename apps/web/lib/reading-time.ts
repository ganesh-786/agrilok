// How long a passing message stays on screen before it leaves by itself.
//
// Two seconds to notice it and about a third of a second for each word, never
// under four seconds or over ten: the range Material Design gives for a
// message that carries no action. A separator, such as the dot between the
// parts of an exam's name, is not a word. The same rule serves Nepali and
// English, because it counts words and not characters.

const NOTICE_MS = 2_000;
const PER_WORD_MS = 350;
export const SHORTEST_MS = 4_000;
export const LONGEST_MS = 10_000;

export function readingTime(text: string): number {
  const words = text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.min(LONGEST_MS, Math.max(SHORTEST_MS, NOTICE_MS + words * PER_WORD_MS));
}
