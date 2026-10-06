// "Find it in my syllabus": match a student's words against topic titles in
// both languages, the topic number, and the words students actually type,
// including romanised Nepali. Plain word matching on the server, so it is
// free, instant and works for the syllabus shown offline too.

import type { Syllabus, Topic } from "@/lib/contracts";

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)))
    .replace(/[^\p{L}\p{M}\p{N}.]+/gu, " ")
    .trim();
}

// Words that carry no meaning for finding a topic.
const STOP = new Set([
  "what",
  "is",
  "the",
  "a",
  "an",
  "of",
  "and",
  "in",
  "on",
  "for",
  "to",
  "how",
  "why",
  "which",
  "does",
  "do",
  "about",
  "explain",
  "define",
  "के",
  "हो",
  "को",
  "का",
  "की",
  "मा",
  "र",
  "भनेको",
  "कसरी",
  "किन",
  "कुन",
  "बारे",
  "व्याख्या",
]);

export type TopicHit = { topicId: string; subjectId: string; score: number };

export function searchSyllabus(syllabus: Syllabus, query: string, limit = 8): TopicHit[] {
  const words = normalizeSearch(query)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP.has(w));
  if (!words.length) return [];
  const hits: TopicHit[] = [];
  for (const subject of syllabus.subjects) {
    const subjectText = normalizeSearch(`${subject.title.ne} ${subject.title.en}`);
    for (const topic of subject.topics) {
      const score = scoreTopic(topic, subjectText, words);
      if (score > 0) hits.push({ topicId: topic.id, subjectId: subject.id, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

function scoreTopic(topic: Topic, subjectText: string, words: string[]): number {
  const title = normalizeSearch(`${topic.title.ne} ${topic.title.en}`);
  const keywords = topic.keywords.map(normalizeSearch);
  let score = 0;
  for (const word of words) {
    if (word === topic.code) score += 5;
    if (keywords.some((k) => k === word || k.includes(word))) score += 3;
    if (title.includes(word)) score += 2;
    if (subjectText.includes(word)) score += 1;
  }
  return score;
}
