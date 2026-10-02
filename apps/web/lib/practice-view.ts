import type {
  Citation,
  OptionId,
  PracticeQuestion,
  Provenance,
  ReviewStateValue,
} from "@/lib/contracts";
import { localDigits, tr } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

/**
 * A question as a practice session receives it: already in the page's
 * language, so a phone downloads one language, not two. The citation keeps
 * both, because the source component chooses its own words.
 */
export type SessionQuestion = {
  id: string;
  subjectId: string;
  topicId: string;
  topicCode: string;
  topicTitle: string;
  subjectTitle: string;
  origin: PracticeQuestion["origin"];
  provenance: Provenance;
  review: ReviewStateValue;
  stem: string;
  options: { id: OptionId; text: string; whyWrong: string | null }[];
  answer: OptionId;
  explanation: string;
  citation: Citation;
};

export function toSessionQuestion(q: PracticeQuestion, lang: Lang): SessionQuestion {
  return {
    id: q.id,
    subjectId: q.subjectId,
    topicId: q.topicId,
    topicCode: localDigits(q.topicCode, lang),
    topicTitle: tr(q.topicTitle, lang),
    subjectTitle: tr(q.subjectTitle, lang),
    origin: q.origin,
    provenance: q.provenance,
    review: q.review,
    stem: tr(q.stem, lang),
    options: q.options.map((o) => ({
      id: o.id,
      text: tr(o.text, lang),
      whyWrong: o.whyWrong ? tr(o.whyWrong, lang) : null,
    })),
    answer: q.answer,
    explanation: tr(q.explanation, lang),
    citation: q.citation,
  };
}
