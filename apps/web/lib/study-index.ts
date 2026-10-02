import "server-only";

import type { Syllabus } from "@/lib/contracts";
import { notesFor, questionsFor, topicsInOrder } from "@/lib/data";
import { localDigits, tr } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

/**
 * What the client-side cards need to turn stored progress into words: topic
 * titles in the page's language, and which topic each question belongs to.
 * Small on purpose: no study content is sent to the browser this way.
 */
export type StudyIndex = {
  syllabusId: string;
  base: string;
  topics: Record<
    string,
    { title: string; code: string; subjectId: string; subjectTitle: string; hasNote: boolean }
  >;
  questionTopic: Record<string, string>;
};

export function buildIndex(syllabus: Syllabus, base: string, lang: Lang): StudyIndex {
  const notes = notesFor(syllabus);
  const topics: StudyIndex["topics"] = {};
  for (const { subject, topic } of topicsInOrder(syllabus)) {
    topics[topic.id] = {
      title: tr(topic.title, lang),
      code: localDigits(topic.code, lang),
      subjectId: subject.id,
      subjectTitle: tr(subject.title, lang),
      hasNote: notes.has(topic.id),
    };
  }
  const questionTopic: Record<string, string> = {};
  for (const q of questionsFor(syllabus)) questionTopic[q.id] = q.topicId;
  return { syllabusId: syllabus.id, base, topics, questionTopic };
}

/** The pages to store for studying one exam offline. */
export function examOfflineUrls(syllabus: Syllabus, base: string): string[] {
  const notes = notesFor(syllabus);
  return [
    base,
    `${base}/syllabus`,
    `${base}/guide`,
    `${base}/practice`,
    `${base}/practice/session?mode=quick`,
    `${base}/practice/session?mode=mock`,
    `${base}/practice/review`,
    ...topicsInOrder(syllabus)
      .filter(({ topic }) => notes.has(topic.id))
      .map(({ topic }) => `${base}/syllabus/${encodeURIComponent(topic.id)}`),
  ];
}
