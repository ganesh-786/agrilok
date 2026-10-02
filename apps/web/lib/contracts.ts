// The typed contracts the student experience is built on.
//
// The screens read these shapes only, never a backend's own types, so the UI
// can run on demo data today and on the real API later without a rewrite
// (docs/student-experience.md). Every field here is something a screen shows
// or a rule depends on; anything the backend will have to provide is visible
// in this one file.

import type { LevelCode, ReviewStateValue } from "@/lib/types";

export type { LevelCode, ReviewStateValue };

/** Text in both languages. Nepali is the default; neither may be empty. */
export type Text = { ne: string; en: string };

export const PROVINCES = [
  "federal",
  "koshi",
  "madhesh",
  "bagmati",
  "gandaki",
  "lumbini",
  "karnali",
  "sudurpaschim",
] as const;
export type ProvinceCode = (typeof PROVINCES)[number];

// The service groups in infra/seed/reference_data.sql, in the same order.
export const GROUPS = [
  "agri_extension",
  "agronomy",
  "horticulture",
  "plant_protection",
  "crop_protection",
  "soil_science",
  "agri_economics_marketing",
  "agriculture",
  "veterinary",
  "livestock",
  "livestock_poultry_dairy",
  "fisheries",
  "food_nutrition_quality_control",
] as const;
export type GroupCode = (typeof GROUPS)[number];

export const LEVELS: readonly LevelCode[] = ["level_4", "level_7"];

/** One exam: the level, the commission, and the service group. */
export type ExamContext = { level: LevelCode; province: ProvinceCode; group: GroupCode };

/** What the student chose in setup. Kept in one cookie; no account. */
export type ExamProfile = ExamContext & { examDate: string | null };

/**
 * Where a piece of content comes from.
 * - `official`: taken from a real official document, and cites it.
 * - `demo`: written for the prototype; always labelled, never a real passage.
 */
export type Provenance = "official" | "demo";

export type DocumentKind = "syllabus" | "statute" | "manual" | "statistics" | "notice" | "policy";

/** An official document as published, with the evidence a citation needs. */
export type OfficialDocument = {
  id: string;
  kind: DocumentKind;
  title: Text;
  publisher: Text;
  /** The file as published. Linked only when it passes the official-address check. */
  url: string;
  /** The authority's page that vouches for a file stored on another host (ADR-0007). */
  referringPage: string | null;
  /** ISO date we fetched it. */
  fetchedOn: string;
  /** Approval or publication date exactly as printed on the document (Bikram Sambat). */
  printedDate: Text | null;
};

/** A citation as stored on content. */
export type CitationRef =
  | {
      kind: "official";
      documentId: string;
      /** Where in the document: "Note 4", "Topic 5.3". */
      locator: Text;
      /** Exact words from the document, in the document's own language. */
      quote: { text: string; lang: "ne" | "en"; translation: Text | null } | null;
    }
  | {
      kind: "placeholder";
      /** The kind of official source this will cite once written from one. */
      publisher: Text;
      /**
       * The publisher's official site, or null when no verified official site
       * exists yet. Never a deep link to a passage that was not checked.
       */
      homepage: string | null;
    };

/** A citation ready to show: the document is resolved. */
export type Citation =
  | {
      kind: "official";
      document: OfficialDocument;
      locator: Text;
      quote: { text: string; lang: "ne" | "en"; translation: Text | null } | null;
    }
  | { kind: "placeholder"; publisher: Text; homepage: string | null };

// --- The syllabus -----------------------------------------------------------

export type Topic = {
  id: string;
  /** The topic's number exactly as printed in the syllabus, for example "5.3". */
  code: string;
  title: Text;
  /** Extra words students type when searching, including romanised Nepali. */
  keywords: string[];
};

export type Subject = {
  id: string;
  /** The unit number as printed. */
  number: string;
  title: Text;
  area: "general" | "technical" | "reasoning";
  topics: Topic[];
};

/**
 * How much of a paper section one subject carries. Null where the syllabus
 * gives only the section's total (Level 7 Paper II sections share 25 marks
 * between two subjects without splitting them).
 */
export type SubjectWeight = { subjectId: string; questions: number | null; marks: number | null };

export type PaperSection = {
  id: string;
  title: Text;
  /** The section's own totals, as printed. */
  questions: number | null;
  marks: number | null;
  weights: SubjectWeight[];
};

export type Paper = {
  id: string;
  number: 1 | 2;
  title: Text;
  format: "objective" | "subjective";
  fullMarks: number;
  passMarks: number;
  minutes: number;
  /** As the scheme prints it: "50 MCQs × 2 marks". */
  pattern: Text;
  /** Objective papers only. */
  questionCount: number | null;
  marksPerQuestion: number | null;
  sections: PaperSection[];
};

export type ExamStage = {
  id: string;
  kind: "written" | "group_test" | "interview";
  title: Text;
  marks: number;
  detail: Text;
};

/** A rule the syllabus states, with where it states it. */
export type SyllabusRule = { text: Text; citation: CitationRef };

export type Syllabus = {
  id: string;
  level: LevelCode;
  province: ProvinceCode;
  groups: GroupCode[];
  documentId: string;
  title: Text;
  review: ReviewStateValue;
  stages: ExamStage[];
  papers: Paper[];
  subjects: Subject[];
  negativeMarkingPercent: number;
  rules: {
    negativeMarking: SyllabusRule;
    laws: SyllabusRule;
    devices: SyllabusRule;
    medium: SyllabusRule;
    progression: SyllabusRule;
  };
  /** True when only some of the syllabus's topics are shown. */
  partial: boolean;
};

// --- Study material ------------------------------------------------------------

export type StudyNote = {
  topicId: string;
  provenance: Provenance;
  review: ReviewStateValue;
  summary: Text;
  explanation: Text[];
  keyPoints: Text[];
  citations: CitationRef[];
  /** ISO date the note was last written. */
  updatedOn: string;
};

// --- Practice --------------------------------------------------------------------

export type OptionId = "a" | "b" | "c" | "d";

export type Question = {
  id: string;
  syllabusId: string;
  subjectId: string;
  topicId: string;
  /**
   * `drafted`: written from official material, pending review (ADR decision 2).
   * `reasoning`: an original reasoning item that proves itself (decision 3).
   * `previous_paper`: from an official past paper; none exist yet.
   */
  origin: "drafted" | "reasoning" | "previous_paper";
  provenance: Provenance;
  review: ReviewStateValue;
  stem: Text;
  options: { id: OptionId; text: Text; whyWrong: Text | null }[];
  answer: OptionId;
  explanation: Text;
  citation: CitationRef;
};

/** A question as a session needs it: its topic and subject resolved, citation ready. */
export type PracticeQuestion = Omit<Question, "citation"> & {
  citation: Citation;
  topicTitle: Text;
  topicCode: string;
  subjectTitle: Text;
};

// --- Updates ----------------------------------------------------------------------

export type NoticeKind = "vacancy" | "exam" | "syllabus" | "policy" | "result";

export type Notice = {
  id: string;
  kind: NoticeKind;
  provenance: Provenance;
  /** False until a person has checked it against the official notice (decision 7). */
  checked: boolean;
  publisher: Text;
  title: Text;
  summary: Text;
  /** ISO dates. */
  publishedOn: string;
  deadline: string | null;
  eventOn: string | null;
  appliesTo: { levels: LevelCode[]; provinces: ProvinceCode[]; groups: GroupCode[] | "all" };
  /** Linked only when it passes the official-address check. */
  officialUrl: string;
};

// --- Ask ------------------------------------------------------------------------------

export type AskAnswer = {
  status: "answered";
  provenance: Provenance;
  question: string;
  answer: Text;
  points: Text[];
  citations: Citation[];
  review: ReviewStateValue;
  relatedTopicIds: string[];
};

export type AskResult =
  | AskAnswer
  | {
      status: "unsupported";
      question: string;
      /** Syllabus topics whose words match, so the student has somewhere to go. */
      relatedTopicIds: string[];
    }
  | { status: "unavailable"; question: string; reason: "quota" | "error"; resumesAt: string | null }
  | { status: "invalid"; question: string; reason: "too_short" | "too_long" | "personal_data" };

// --- Availability ------------------------------------------------------------------------

/** Which exams have a syllabus in the library, for setup and empty states. */
export type Availability = { level: LevelCode; province: ProvinceCode; group: GroupCode }[];
