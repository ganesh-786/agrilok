// The prototype's Ask engine. It never answers from a model's memory
// (ADR-0003, and the owner's decision 1): every answer is built from the
// syllabus data and the study notes, and anything else is refused with what
// was searched and where to look instead.
//
// Exam-structure questions (negative marking, which laws count, devices,
// language, the exam pattern, how much a subject carries) are answered from
// the official syllabus and cite it. Topic questions are answered from the
// topic's study note, which is demo content and labelled so. The real live
// pipeline (packages/core) replaces the topic path when the API is connected.

import type { CitationRef, Provenance, StudyNote, Syllabus, Text } from "@/lib/contracts";
import { localDigits } from "@/lib/format";
import { looksPersonal } from "@/lib/pii";
import { normalizeSearch, searchSyllabus } from "@/lib/search";

import { official, t } from "./build";

export const MIN_QUESTION = 3;
export const MAX_QUESTION = 1000;

export type AskDraft =
  | {
      status: "answered";
      provenance: Provenance;
      answer: Text;
      points: Text[];
      citations: CitationRef[];
      relatedTopicIds: string[];
    }
  | { status: "unsupported"; relatedTopicIds: string[] }
  | { status: "invalid"; reason: "too_short" | "too_long" | "personal_data" };

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

const WORDS = {
  devices: [
    "calculator",
    "mobile",
    "phone",
    "watch",
    "device",
    "क्याल्कुलेटर",
    "मोबाइल",
    "घडी",
    "उपकरण",
  ],
  medium: ["language", "english", "medium", "भाषा", "अंग्रेजी"],
  negative: [
    "negative",
    "minus",
    "deduct",
    "penalty",
    "कट्टा",
    "नकारात्मक",
    "गलत उत्तर",
    "wrong answer",
  ],
  law: ["law", "act", "rule", "policy", "ऐन", "कानुन", "कानून", "नियम", "नीति"],
  lawVersion: [
    "amend",
    "version",
    "current",
    "latest",
    "in force",
    "count",
    "valid",
    "संशोधन",
    "कायम",
    "हालको",
    "अद्यावधिक",
    "मान्य",
  ],
  weight: ["how many", "question", "marks", "weight", "कति", "प्रश्न", "अङ्क", "अंक"],
  pattern: [
    "pattern",
    "stage",
    "paper",
    "full mark",
    "pass mark",
    "interview",
    "scheme",
    "structure",
    "time",
    "पूर्णाङ्क",
    "उत्तीर्णाङ्क",
    "चरण",
    "अन्तर्वार्ता",
    "परीक्षा योजना",
    "समय",
    "पत्र",
  ],
};

function n(value: number, lang: "ne" | "en"): string {
  return localDigits(value, lang);
}

function ruleAnswer(rule: { text: Text; citation: CitationRef }): AskDraft {
  return {
    status: "answered",
    provenance: "official",
    answer: { ne: `${rule.text.ne} [1]`, en: `${rule.text.en} [1]` },
    points: [],
    citations: [rule.citation],
    relatedTopicIds: [],
  };
}

function schemeCitation(syllabus: Syllabus): CitationRef {
  return official(syllabus.documentId, t("परीक्षा योजना", "Examination scheme"));
}

function patternAnswer(syllabus: Syllabus): AskDraft {
  const total = syllabus.stages.reduce((sum, s) => sum + s.marks, 0);
  const points: Text[] = [
    ...syllabus.stages.map((s) => ({
      ne: `${s.title.ne}: ${n(s.marks, "ne")} अङ्क, ${s.detail.ne}`,
      en: `${s.title.en}: ${s.marks} marks, ${s.detail.en}`,
    })),
    ...syllabus.papers.map((p) => ({
      ne: `${p.title.ne}: ${p.pattern.ne}; पूर्णाङ्क ${n(p.fullMarks, "ne")}, उत्तीर्णाङ्क ${n(p.passMarks, "ne")}`,
      en: `${p.title.en}: ${p.pattern.en}; full marks ${p.fullMarks}, pass marks ${p.passMarks}`,
    })),
  ];
  return {
    status: "answered",
    provenance: "official",
    answer: {
      ne: `यो परीक्षा ${n(syllabus.stages.length, "ne")} चरणमा हुन्छ र कुल ${n(total, "ne")} अङ्कको हुन्छ [1]।`,
      en: `This exam has ${syllabus.stages.length} stages worth ${total} marks in all [1].`,
    },
    points,
    citations: [schemeCitation(syllabus)],
    relatedTopicIds: [],
  };
}

function negativeAnswer(syllabus: Syllabus): AskDraft {
  const paper = syllabus.papers.find((p) => p.format === "objective");
  const perQuestion = paper?.marksPerQuestion ?? null;
  const loss = perQuestion ? (perQuestion * syllabus.negativeMarkingPercent) / 100 : null;
  const extra: Text | null =
    perQuestion && loss !== null
      ? {
          ne: ` यस पत्रमा हरेक प्रश्न ${n(perQuestion, "ne")} अङ्कको भएकाले एउटा गलत उत्तरले ${n(loss, "ne")} अङ्क घटाउँछ [2]।`,
          en: ` Each question in this paper carries ${perQuestion} marks, so one wrong answer costs ${loss} marks [2].`,
        }
      : null;
  return {
    status: "answered",
    provenance: "official",
    answer: {
      ne: `${syllabus.rules.negativeMarking.text.ne} [1]${extra?.ne ?? ""}`,
      en: `${syllabus.rules.negativeMarking.text.en} [1]${extra?.en ?? ""}`,
    },
    points: [],
    citations: extra
      ? [syllabus.rules.negativeMarking.citation, schemeCitation(syllabus)]
      : [syllabus.rules.negativeMarking.citation],
    relatedTopicIds: [],
  };
}

function weightAnswer(syllabus: Syllabus, subjectId: string): AskDraft | null {
  const subject = syllabus.subjects.find((s) => s.id === subjectId);
  if (!subject) return null;
  const lines: Text[] = [];
  for (const paper of syllabus.papers) {
    for (const section of paper.sections) {
      const weight = section.weights.find((w) => w.subjectId === subjectId);
      if (!weight) continue;
      if (weight.questions) {
        const marks = weight.questions * (paper.marksPerQuestion ?? 1);
        lines.push({
          ne: `${paper.title.ne}, ${section.title.ne}: ${n(weight.questions, "ne")} प्रश्न (${n(marks, "ne")} अङ्क)`,
          en: `${paper.title.en}, ${section.title.en}: ${weight.questions} questions (${marks} marks)`,
        });
      } else if (weight.marks) {
        lines.push({
          ne: `${paper.title.ne}, ${section.title.ne}: ${n(weight.marks, "ne")} अङ्क`,
          en: `${paper.title.en}, ${section.title.en}: ${weight.marks} marks`,
        });
      } else if (section.marks) {
        lines.push({
          ne: `${paper.title.ne}, ${section.title.ne}: खण्डको ${n(section.marks, "ne")} अङ्क अरू विषयसँग साझा`,
          en: `${paper.title.en}, ${section.title.en}: shares the section's ${section.marks} marks with another subject`,
        });
      }
    }
  }
  if (!lines.length) return null;
  return {
    status: "answered",
    provenance: "official",
    answer: {
      ne: `पाठ्यक्रमअनुसार "${subject.title.ne}" को भार यस्तो छ [1]।`,
      en: `This is how much "${subject.title.en}" carries in the syllabus [1].`,
    },
    points: lines,
    citations: [schemeCitation(syllabus)],
    relatedTopicIds: subject.topics.map((tp) => tp.id).slice(0, 4),
  };
}

function mentionedSubject(syllabus: Syllabus, text: string): string | null {
  for (const subject of syllabus.subjects) {
    const names = [subject.title.ne, subject.title.en].map(normalizeSearch);
    if (names.some((name) => name.length >= 4 && text.includes(name))) return subject.id;
  }
  return null;
}

function noteAnswer(note: StudyNote): AskDraft {
  return {
    status: "answered",
    provenance: note.provenance,
    answer: {
      ne: `${note.summary.ne} ${note.explanation[0]?.ne ?? ""} [1]`,
      en: `${note.summary.en} ${note.explanation[0]?.en ?? ""} [1]`,
    },
    points: note.keyPoints,
    citations: note.citations,
    relatedTopicIds: [note.topicId],
  };
}

export function validateQuestion(raw: string): AskDraft | null {
  const question = raw.trim();
  if (question.replace(/\s+/g, "").length < MIN_QUESTION)
    return { status: "invalid", reason: "too_short" };
  if (question.length > MAX_QUESTION) return { status: "invalid", reason: "too_long" };
  if (looksPersonal(question)) return { status: "invalid", reason: "personal_data" };
  return null;
}

/** Answer a written question from the syllabus and its study notes, or refuse. */
export function answerFromLibrary(
  syllabus: Syllabus,
  notes: Map<string, StudyNote>,
  raw: string,
  scopeTopicId: string | null,
): AskDraft {
  const invalid = validateQuestion(raw);
  if (invalid) return invalid;
  const text = normalizeSearch(raw);

  if (has(text, WORDS.devices)) return ruleAnswer(syllabus.rules.devices);
  if (has(text, WORDS.medium)) return ruleAnswer(syllabus.rules.medium);
  if (has(text, WORDS.negative)) return negativeAnswer(syllabus);
  if (has(text, WORDS.law) && has(text, WORDS.lawVersion)) return ruleAnswer(syllabus.rules.laws);

  const subjectId = mentionedSubject(syllabus, text);
  if (subjectId && has(text, WORDS.weight)) {
    const answer = weightAnswer(syllabus, subjectId);
    if (answer) return answer;
  }

  const hits = searchSyllabus(syllabus, raw);
  const scoped = scopeTopicId ? notes.get(scopeTopicId) : undefined;
  const best = hits[0];
  // A strong topic match that has a study note answers from the note.
  if (best && best.score >= 3 && notes.has(best.topicId)) {
    return noteAnswer(notes.get(best.topicId) as StudyNote);
  }
  if (!best && scoped) return noteAnswer(scoped);

  if (has(text, WORDS.pattern)) return patternAnswer(syllabus);
  return { status: "unsupported", relatedTopicIds: hits.map((h) => h.topicId).slice(0, 4) };
}
