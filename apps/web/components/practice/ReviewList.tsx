"use client";

import Link from "next/link";

import { ChevronRight } from "@/components/Icons";
import { EmptyState, Skeleton } from "@/components/ui/Blocks";
import { Tag } from "@/components/ui/Tag";
import { useProgress } from "@/lib/client/progress";
import { dueQuestionIds, pickMistakes } from "@/lib/practice";
import { formatDate, fmt, localDigits } from "@/lib/format";
import { nepalToday } from "@/lib/dates";
import type { Dictionary, Lang } from "@/lib/i18n";
import type { SessionQuestion } from "@/lib/practice-view";

type Labels = Pick<Dictionary, "review">;

export function ReviewList({
  syllabusId,
  base,
  questions,
  labels,
  lang,
}: {
  syllabusId: string;
  base: string;
  questions: SessionQuestion[];
  labels: Labels;
  lang: Lang;
}) {
  const progress = useProgress(syllabusId);
  const today = nepalToday();
  if (progress === null)
    return (
      <div className="rounded-xl bg-sunken p-5">
        <Skeleton lines={5} />
      </div>
    );

  const selected = pickMistakes(questions, progress, today, questions.length);
  if (!selected.length)
    return (
      <EmptyState
        title={labels.review.empty}
        actions={
          <Link href={`${base}/practice/session?mode=quick`} className="btn btn-primary">
            {labels.review.startPractice}
          </Link>
        }
      />
    );
  const due = new Set(dueQuestionIds(progress, today));
  const now = selected.filter((question) => due.has(question.id));
  const later = selected.filter((question) => !due.has(question.id));

  const section = (id: string, title: string, items: SessionQuestion[]) => (
    <section className="ruled space-y-2" aria-labelledby={id}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} className="text-title">
          {title}
        </h2>
        <span className="num text-small text-ink-3">{localDigits(items.length, lang)}</span>
      </div>
      <ul className="divide-y divide-line">
        {items.map((question) => {
          const record = progress.answers[question.id];
          return (
            <li key={question.id}>
              <Link
                href={`${base}/practice/question/${encodeURIComponent(question.id)}`}
                className="row-link -mx-2 flex items-start gap-4 rounded-lg px-2 py-4 no-underline"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-relaxed text-ink">
                    {question.stem}
                  </span>
                  <span className="mt-1 block text-caption text-ink-3">
                    {question.topicCode} {question.topicTitle}
                  </span>
                  <span className="mt-3 block">
                    <Tag tone={due.has(question.id) ? "warning" : "neutral"}>
                      {record?.due ? formatDate(record.due, lang) : labels.review.later}
                    </Tag>
                  </span>
                  {record?.due && !due.has(question.id) ? (
                    <span className="mt-1 block text-caption text-ink-3">
                      {fmt(labels.review.comesBack, { date: formatDate(record.due, lang) }, lang)}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-3" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className="max-w-4xl space-y-10">
      {now.length ? (
        <Link href={`${base}/practice/session?mode=mistakes`} className="btn btn-primary">
          {labels.review.start}
        </Link>
      ) : null}
      {now.length ? section("review-due", labels.review.dueNow, now) : null}
      {later.length ? section("review-later", labels.review.later, later) : null}
    </div>
  );
}
