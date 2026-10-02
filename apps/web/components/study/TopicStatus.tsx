"use client";

import { Check } from "@/components/Icons";
import { useProgress } from "@/lib/client/progress";
import { fmt } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

// Progress on one topic, from this device: studied, and how many of its
// questions were answered right. Nothing is shown before there is something
// true to show; an empty percentage means nothing.
export function TopicStatus({
  syllabusId,
  topicId,
  questionIds,
  labels,
  lang,
}: {
  syllabusId: string;
  topicId: string;
  questionIds: string[];
  labels: { studied: string; progress: string };
  lang: Lang;
}) {
  const progress = useProgress(syllabusId);
  if (!progress) return null;
  const studied = !!progress.studied[topicId];
  let attempts = 0;
  let correct = 0;
  for (const id of questionIds) {
    const record = progress.answers[id];
    if (record) {
      attempts += record.attempts;
      correct += record.correct;
    }
  }
  if (!studied && attempts === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-caption text-ink-3">
      {studied ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-success-tint px-2 py-1 font-semibold text-success">
          <Check className="h-3.5 w-3.5" />
          {labels.studied}
        </span>
      ) : null}
      {attempts > 0 ? (
        <span className="num">
          {fmt(labels.progress, { right: correct, total: attempts }, lang)}
        </span>
      ) : null}
    </span>
  );
}
