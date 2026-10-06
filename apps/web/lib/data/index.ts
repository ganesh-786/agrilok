import "server-only";

// The one door between the screens and their data. Today it serves the typed
// demo dataset; connecting the real API means implementing these same
// functions against apps/api, with no screen changing
// (docs/student-experience.md, section 8). It runs on the server only, so
// neither the demo data nor, later, the API address reaches the browser.

import { cookies } from "next/headers";

import type {
  AskResult,
  Availability,
  Citation,
  CitationRef,
  ExamContext,
  Notice,
  OfficialDocument,
  PracticeQuestion,
  Question,
  StudyNote,
  Subject,
  Syllabus,
  Topic,
} from "@/lib/contracts";
import { answerFromLibrary } from "@/lib/data/demo/ask";
import {
  demoNotices,
  documents,
  notesBySyllabus,
  questionsBySyllabus,
  syllabi,
} from "@/lib/data/demo";
import { addDays, nepalToday } from "@/lib/dates";
import {
  deadlineStatus,
  relevance,
  sortNotices,
  type DeadlineStatus,
  type Relevance,
} from "@/lib/notices";

/** The prototype runs on demo data. The API source is not built yet. */
export const DATA_MODE = "demo" as const;

// --- Prototype simulations (docs/usability-testing.md) ------------------------------

export const SIMULATION_COOKIE = "agrilok_sim";
export type Simulation = { aiUnavailable: boolean; sourcesUnavailable: boolean };

export async function getSimulation(): Promise<Simulation> {
  const value = (await cookies()).get(SIMULATION_COOKIE)?.value ?? "";
  const flags = new Set(value.split(","));
  return { aiUnavailable: flags.has("ai"), sourcesUnavailable: flags.has("sources") };
}

// --- Syllabi -----------------------------------------------------------------------------

export function availability(): Availability {
  return syllabi.flatMap((s) =>
    s.groups.map((group) => ({ level: s.level, province: s.province, group })),
  );
}

export function syllabusFor(ctx: ExamContext): Syllabus | null {
  return (
    syllabi.find(
      (s) => s.level === ctx.level && s.province === ctx.province && s.groups.includes(ctx.group),
    ) ?? null
  );
}

/** The nearest exams that do have a syllabus: same level first. */
export function nearestAvailable(ctx: ExamContext): ExamContext[] {
  return availability()
    .filter((a) => a.level === ctx.level)
    .sort((a, b) => Number(b.group === ctx.group) - Number(a.group === ctx.group))
    .slice(0, 3);
}

export function document(id: string): OfficialDocument | null {
  return documents[id] ?? null;
}

export function resolveCitation(ref: CitationRef): Citation | null {
  if (ref.kind === "placeholder") return ref;
  const doc = document(ref.documentId);
  if (!doc) return null;
  return { kind: "official", document: doc, locator: ref.locator, quote: ref.quote };
}

export function resolveCitations(refs: CitationRef[]): Citation[] {
  return refs.map(resolveCitation).filter((c): c is Citation => c !== null);
}

export type TopicPlace = { subject: Subject; topic: Topic; index: number };

export function topicsInOrder(syllabus: Syllabus): TopicPlace[] {
  let index = 0;
  return syllabus.subjects.flatMap((subject) =>
    subject.topics.map((topic) => ({ subject, topic, index: index++ })),
  );
}

export function findTopic(syllabus: Syllabus, topicId: string): TopicPlace | null {
  return topicsInOrder(syllabus).find((p) => p.topic.id === topicId) ?? null;
}

export function notesFor(syllabus: Syllabus): Map<string, StudyNote> {
  return new Map((notesBySyllabus[syllabus.id] ?? []).map((note) => [note.topicId, note]));
}

export function questionsFor(syllabus: Syllabus): Question[] {
  return questionsBySyllabus[syllabus.id] ?? [];
}

/** Questions resolved for a session: titles and a ready citation. */
export function practiceQuestions(
  syllabus: Syllabus,
  filter?: (q: Question) => boolean,
): PracticeQuestion[] {
  const places = new Map(topicsInOrder(syllabus).map((p) => [p.topic.id, p]));
  return questionsFor(syllabus)
    .filter((q) => (filter ? filter(q) : true))
    .flatMap((q) => {
      const place = places.get(q.topicId);
      const citation = resolveCitation(q.citation);
      if (!place || !citation) return [];
      return [
        {
          ...q,
          citation,
          topicTitle: place.topic.title,
          topicCode: place.topic.code,
          subjectTitle: place.subject.title,
        },
      ];
    });
}

// --- Updates ---------------------------------------------------------------------------------

export type NoticeView = { notice: Notice; relevance: Relevance; deadline: DeadlineStatus };

export function noticesFor(ctx: ExamContext, today = nepalToday()): NoticeView[] {
  return sortNotices(demoNotices(today)).flatMap((notice) => {
    const r = relevance(notice, ctx);
    return r ? [{ notice, relevance: r, deadline: deadlineStatus(notice, today) }] : [];
  });
}

export function noticeFor(ctx: ExamContext, id: string, today = nepalToday()): NoticeView | null {
  return noticesFor(ctx, today).find((view) => view.notice.id === id) ?? null;
}

// --- Ask ------------------------------------------------------------------------------------------

/**
 * Answer a written question. The library tools (notes, explanations, syllabus
 * search) never come through here: they cost nothing and keep working when
 * live answers are paused.
 */
export async function ask(
  syllabus: Syllabus,
  question: string,
  scopeTopicId: string | null,
): Promise<AskResult> {
  const simulation = await getSimulation();
  const draft = answerFromLibrary(syllabus, notesFor(syllabus), question, scopeTopicId);
  if (draft.status === "invalid") return { status: "invalid", question, reason: draft.reason };
  if (simulation.aiUnavailable) {
    // Live answers reset with the provider's quota day; the prototype shows tomorrow.
    return {
      status: "unavailable",
      question,
      reason: "quota",
      resumesAt: addDays(nepalToday(), 1),
    };
  }
  if (draft.status === "unsupported") {
    return { status: "unsupported", question, relatedTopicIds: draft.relatedTopicIds };
  }
  return {
    status: "answered",
    provenance: draft.provenance,
    question,
    answer: draft.answer,
    points: draft.points,
    citations: resolveCitations(draft.citations),
    review: "ai_assisted_pending_review",
    relatedTopicIds: draft.relatedTopicIds,
  };
}
