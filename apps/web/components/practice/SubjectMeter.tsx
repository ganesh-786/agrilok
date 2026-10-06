"use client";

import { Meter } from "@/components/ui/Blocks";
import { useProgress } from "@/lib/client/progress";
import { fmt } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

/**
 * How many of a subject's questions this device last answered right. It is
 * drawn at nought before the browser has been read and for a subject not yet
 * practised, so the card never changes height when the count arrives.
 */
export function SubjectMeter({
  syllabusId,
  questionIds,
  label,
  lang,
}: {
  syllabusId: string;
  questionIds: string[];
  /** "{right} of {total} right" */
  label: string;
  lang: Lang;
}) {
  const progress = useProgress(syllabusId);
  const right = progress ? questionIds.filter((id) => progress.answers[id]?.lastCorrect).length : 0;
  const text = fmt(label, { right, total: questionIds.length }, lang);
  return (
    <span className="mt-3 block">
      <Meter value={right} max={questionIds.length} label={text} />
      <span className="num mt-1.5 block text-caption text-ink-3">{text}</span>
    </span>
  );
}
