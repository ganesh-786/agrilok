"use client";

import Link from "next/link";

import { Check, Close } from "@/components/Icons";
import { QuestionActions } from "@/components/practice/QuestionActions";
import { Callout } from "@/components/ui/Callout";
import { SourceCitation } from "@/components/ui/SourceCitation";
import { DemoTag, ReviewLabel } from "@/components/ui/Tag";
import { useProgress } from "@/lib/client/progress";
import type { Dictionary, Lang } from "@/lib/i18n";
import type { SessionQuestion } from "@/lib/practice-view";

type Labels = Pick<
  Dictionary,
  "session" | "question" | "source" | "common" | "reviewState" | "demo"
>;

export function QuestionReview({
  question,
  syllabusId,
  base,
  labels,
  lang,
  sourcesDown,
}: {
  question: SessionQuestion;
  syllabusId: string;
  base: string;
  labels: Labels;
  lang: Lang;
  sourcesDown: boolean;
}) {
  const progress = useProgress(syllabusId);
  const record = progress?.answers[question.id];
  const chosen = record?.lastChoice ?? null;
  const correct = chosen === question.answer;

  return (
    <article className="space-y-6">
      <header className="space-y-2 pt-2">
        <p className="num text-small text-ink-3">
          {question.topicCode} {question.topicTitle}
        </p>
        <h1 className="text-headline">{labels.question.title}</h1>
        <div className="flex flex-wrap gap-1.5">
          {question.provenance === "demo" ? <DemoTag t={labels} /> : null}
          <ReviewLabel state={question.review} t={labels} />
        </div>
      </header>

      {!record ? <Callout tone="info">{labels.question.notAnswered}</Callout> : null}
      {record && !correct ? (
        <Callout tone="warning" title={labels.session.incorrect}>
          {labels.question.yourLast}
        </Callout>
      ) : null}
      {record && correct ? (
        <Callout tone="success" title={labels.session.correct}>
          {labels.question.yourLast}
        </Callout>
      ) : null}

      <section className="card space-y-3 p-4 sm:p-6" aria-label={labels.question.title}>
        <p className="mb-5 font-display text-lead leading-relaxed">{question.stem}</p>
        {question.options.map((option) => {
          const isAnswer = option.id === question.answer;
          const isChosen = option.id === chosen;
          return (
            <div
              key={option.id}
              className={`flex items-start gap-3 rounded-lg border px-4 py-4 ${isAnswer ? "border-success bg-success-tint" : isChosen ? "border-danger bg-danger-tint" : "border-line"}`}
            >
              <span className="mt-0.5 w-5 shrink-0 font-semibold">{option.id.toUpperCase()}.</span>
              <span className="min-w-0 flex-1">
                {option.text}
                {isAnswer ? (
                  <span className="mt-2 flex items-center gap-1.5 text-small font-semibold text-success">
                    <Check className="h-4 w-4 shrink-0" />
                    {labels.session.correctAnswer}
                  </span>
                ) : isChosen ? (
                  <span className="mt-2 flex items-center gap-1.5 text-small font-semibold text-danger">
                    <Close className="h-4 w-4 shrink-0" />
                    {labels.session.yourAnswer}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-title">{labels.session.explanation}</h2>
        <p className="text-ink">{question.explanation}</p>
        {!correct && chosen ? (
          <p className="text-small text-ink-2">
            {question.options.find((option) => option.id === chosen)?.whyWrong ?? ""}
          </p>
        ) : null}
      </section>

      <section className="ruled space-y-3" aria-labelledby="question-source">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="question-source" className="text-title">
            {labels.session.source}
          </h2>
          <ReviewLabel state={question.review} t={labels} />
        </div>
        <SourceCitation
          citation={question.citation}
          lang={lang}
          labels={labels}
          sourcesDown={sourcesDown}
        />
      </section>

      <QuestionActions syllabusId={syllabusId} questionId={question.id} labels={labels} />
      <Link
        href={`${base}/practice/session?mode=topic&topic=${encodeURIComponent(question.topicId)}`}
        className="btn btn-secondary btn-sm"
      >
        {labels.question.practiseTopic}
      </Link>
    </article>
  );
}
