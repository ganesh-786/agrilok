"use client";

import Link from "next/link";

import { Bookmark, Repeat } from "@/components/Icons";
import { Panel, Skeleton } from "@/components/ui/Blocks";
import { useProgress } from "@/lib/client/progress";
import { nepalToday } from "@/lib/dates";
import { fmt } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import { dueQuestionIds } from "@/lib/practice";

type Labels = Dictionary["practice"];

/** Mistakes due today, from this device's progress. */
export function DueCard({
  syllabusId,
  base,
  labels,
  lang,
}: {
  syllabusId: string;
  base: string;
  labels: Labels;
  lang: Lang;
}) {
  const progress = useProgress(syllabusId);
  const due = progress ? dueQuestionIds(progress, nepalToday()).length : 0;
  const anyWrong =
    !!progress && Object.values(progress.answers).some((record) => !record.lastCorrect);
  return (
    <Panel id="due" level={2} icon={<Repeat className="h-5 w-5" />} title={labels.dueTitle}>
      {progress === null ? (
        <Skeleton lines={2} />
      ) : (
        <>
          <p className="text-small text-ink-2">
            {due > 0 ? fmt(labels.dueBody, { n: due }, lang) : labels.dueNone}
          </p>
          {due > 0 || anyWrong ? (
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {due > 0 ? (
                <Link
                  href={`${base}/practice/session?mode=mistakes`}
                  className="btn btn-secondary btn-sm"
                >
                  {labels.dueStart}
                </Link>
              ) : null}
              {anyWrong ? (
                <Link href={`${base}/practice/review`} className="btn btn-quiet btn-sm">
                  {labels.allMistakes}
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}

/** Questions the student saved while reviewing. */
export function SavedCard({
  syllabusId,
  base,
  labels,
  lang,
}: {
  syllabusId: string;
  base: string;
  labels: Labels;
  lang: Lang;
}) {
  const progress = useProgress(syllabusId);
  const count = progress?.saved.length ?? 0;
  return (
    <Panel id="saved" level={2} icon={<Bookmark className="h-5 w-5" />} title={labels.savedTitle}>
      {progress === null ? (
        <Skeleton lines={2} />
      ) : count > 0 ? (
        <>
          <p className="text-small text-ink-2">
            {fmt(
              count === 1 ? labels.subjectQuestionsOne : labels.subjectQuestions,
              { n: count },
              lang,
            )}
          </p>
          <div className="mt-auto pt-4">
            <Link href={`${base}/practice/session?mode=saved`} className="btn btn-secondary btn-sm">
              {labels.savedStart}
            </Link>
          </div>
        </>
      ) : (
        <p className="text-small text-ink-2">{labels.savedNone}</p>
      )}
    </Panel>
  );
}
