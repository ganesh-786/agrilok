"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { Check, ChevronRight, Clock, Close } from "@/components/Icons";
import { QuestionActions } from "@/components/practice/QuestionActions";
import { EmptyState, Meter, Skeleton } from "@/components/ui/Blocks";
import { Callout } from "@/components/ui/Callout";
import { Sheet } from "@/components/ui/Sheet";
import { SourceCitation } from "@/components/ui/SourceCitation";
import { DemoTag, ReviewLabel, Tag } from "@/components/ui/Tag";
import { saveAnswer, useProgress, useStorageAvailable } from "@/lib/client/progress";
import type { OptionId } from "@/lib/contracts";
import { nepalToday } from "@/lib/dates";
import { fmt, localDigits } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import {
  pickFrom,
  pickMistakes,
  pickQuick,
  planMock,
  scoreAnswers,
  type MockSpec,
  type SyllabusProgress,
} from "@/lib/practice";
import type { SessionQuestion } from "@/lib/practice-view";

export type SessionMode = "quick" | "subject" | "topic" | "mock" | "mistakes" | "saved";

export type SessionLabels = {
  session: Dictionary["session"];
  source: Dictionary["source"];
  common: Dictionary["common"];
  question: Dictionary["question"];
  reviewState: Dictionary["reviewState"];
  demo: Dictionary["demo"];
  practice: Pick<Dictionary["practice"], "mockDemo">;
};

type Persisted = {
  ids: string[];
  index: number;
  choices: Record<string, OptionId | null>;
  checked: Record<string, boolean>;
  startedAt: number;
  minutes: number;
  submitted: boolean;
};

const SIZE = 10;

function readSession(key: string): Persisted | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: Persisted | null): void {
  try {
    if (value) window.sessionStorage.setItem(key, JSON.stringify(value));
    else window.sessionStorage.removeItem(key);
  } catch {
    // The session still runs; it just will not survive a reload.
  }
}

function choose(
  mode: SessionMode,
  pool: SessionQuestion[],
  progress: SyllabusProgress,
  mock: MockSpec | null,
  seed: string,
): { ids: string[]; minutes: number } {
  const today = nepalToday();
  if (mode === "mock" && mock) {
    const plan = planMock(pool, mock, seed);
    return { ids: plan?.questions.map((q) => q.id) ?? [], minutes: plan?.minutes ?? 0 };
  }
  const picked =
    mode === "quick"
      ? pickQuick(pool, mock?.blueprint ?? [], progress, today, seed, SIZE)
      : mode === "mistakes"
        ? pickMistakes(pool, progress, today, SIZE)
        : mode === "saved"
          ? pool.filter((q) => progress.saved.includes(q.id)).slice(0, SIZE)
          : pickFrom(pool, progress, seed, SIZE);
  return { ids: picked.map((q) => q.id), minutes: 0 };
}

export function PracticeSession({
  mode,
  scope,
  syllabusId,
  base,
  title,
  pool,
  mock,
  labels,
  lang,
  sourcesDown,
}: {
  mode: SessionMode;
  scope: string;
  syllabusId: string;
  base: string;
  title: string;
  pool: SessionQuestion[];
  mock: MockSpec | null;
  labels: SessionLabels;
  lang: Lang;
  sourcesDown: boolean;
}) {
  const s = labels.session;
  const progress = useProgress(syllabusId);
  const storage = useStorageAvailable();
  const key = `agrilok:session:v1:${syllabusId}:${mode}:${scope}`;
  const [session, setSession] = useState<Persisted | null>(null);
  const [resumed, setResumed] = useState(false);
  const [hint, setHint] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const feedbackRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLLegendElement>(null);
  const firstOptionRef = useRef<HTMLInputElement>(null);
  const answerFormId = useId();
  const byId = useMemo(() => new Map(pool.map((q) => [q.id, q])), [pool]);

  // "Picked up where you left off" is news for a moment, not a fixture: the
  // question counter beside it says the same thing for the rest of the session.
  useEffect(() => {
    if (!resumed) return;
    const timer = window.setTimeout(() => setResumed(false), 6_000);
    return () => window.clearTimeout(timer);
  }, [resumed]);

  // Start or resume once progress is known, and never re-pick mid-session.
  useEffect(() => {
    if (progress === null || session !== null) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const saved = readSession(key);
      if (saved && saved.ids.length && saved.ids.every((id) => byId.has(id)) && !saved.submitted) {
        setSession(saved);
        setResumed(true);
        return;
      }
      const { ids, minutes } = choose(
        mode,
        pool,
        progress,
        mock,
        `${nepalToday()}:${mode}:${scope}`,
      );
      const fresh: Persisted = {
        ids,
        index: 0,
        choices: {},
        checked: {},
        startedAt: Date.now(),
        minutes,
        submitted: false,
      };
      setSession(fresh);
      writeSession(key, fresh);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [progress, session, key, byId, mode, pool, mock, scope]);

  const update = useCallback(
    (change: (current: Persisted) => Persisted) => {
      setSession((current) => {
        if (!current) return current;
        const next = change(current);
        writeSession(key, next);
        return next;
      });
    },
    [key],
  );

  const questions = useMemo(
    () =>
      session ? session.ids.map((id) => byId.get(id)).filter((q): q is SessionQuestion => !!q) : [],
    [session, byId],
  );

  const submitMock = useCallback(() => {
    update((current) => {
      if (current.submitted) return current;
      for (const id of current.ids) {
        const q = byId.get(id);
        const choice = current.choices[id];
        if (q && choice) saveAnswer(syllabusId, id, choice, choice === q.answer);
      }
      return { ...current, submitted: true };
    });
    setConfirmSubmit(false);
  }, [update, byId, syllabusId]);

  // The mock test's clock. It submits by itself when time runs out.
  const deadline = session && mode === "mock" ? session.startedAt + session.minutes * 60_000 : null;
  useEffect(() => {
    if (deadline === null || session?.submitted) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline, session?.submitted]);
  const remaining = deadline === null ? null : Math.max(0, deadline - now);
  const timedOut = remaining === 0 && mode === "mock";
  useEffect(() => {
    if (!timedOut || !session || session.submitted) return;
    const timer = window.setTimeout(() => submitMock(), 0);
    return () => window.clearTimeout(timer);
  }, [timedOut, session, submitMock]);

  if (progress === null || session === null) {
    return (
      <div className="mt-6 min-h-96 rounded-xl bg-sunken p-5 sm:p-8">
        <Skeleton lines={5} />
      </div>
    );
  }

  const header = (
    <div className="pb-6 pt-2">
      <h1 className="text-headline text-ink">{title}</h1>
    </div>
  );

  if (!questions.length) {
    return (
      <div>
        {header}
        <EmptyState title={s.emptyTitle}>
          <p>{mode === "mistakes" ? s.emptyMistakes : mode === "saved" ? s.emptySaved : null}</p>
        </EmptyState>
      </div>
    );
  }

  // Results only when the student asks for them, so the last explanation is seen.
  const finished = session.submitted;
  if (finished) {
    return (
      <div>
        {header}
        <Results
          questions={questions}
          session={session}
          mode={mode}
          mock={mock}
          base={base}
          labels={labels}
          lang={lang}
          timedOut={timedOut}
          onAgain={() => {
            writeSession(key, null);
            const { ids, minutes } = choose(
              mode,
              pool,
              progress,
              mock,
              `${Date.now()}:${mode}:${scope}`,
            );
            const fresh: Persisted = {
              ids,
              index: 0,
              choices: {},
              checked: {},
              startedAt: Date.now(),
              minutes,
              submitted: false,
            };
            setSession(fresh);
            writeSession(key, fresh);
            setResumed(false);
          }}
        />
      </div>
    );
  }

  const index = Math.min(session.index, questions.length - 1);
  const q = questions[index] as SessionQuestion;
  const choice = session.choices[q.id] ?? null;
  const checked = mode !== "mock" && !!session.checked[q.id];
  const answeredCount = questions.filter((qq) => session.choices[qq.id]).length;
  const last = index === questions.length - 1;
  const correctOption = q.options.find((o) => o.id === q.answer);
  const chosenOption = q.options.find((o) => o.id === choice);
  const right = checked && choice === q.answer;
  const nextUnanswered = [...questions.slice(index + 1), ...questions.slice(0, index + 1)].find(
    (question) => !session.choices[question.id],
  );

  function onCheck(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "mock") return;
    if (!choice) {
      setHint(true);
      firstOptionRef.current?.focus();
      return;
    }
    setHint(false);
    saveAnswer(syllabusId, q.id, choice, choice === q.answer);
    update((c) => ({ ...c, checked: { ...c.checked, [q.id]: true } }));
    window.setTimeout(() => feedbackRef.current?.focus(), 0);
  }

  function go(to: number) {
    setHint(false);
    update((c) => ({ ...c, index: to }));
    window.scrollTo({ top: 0 });
    window.setTimeout(() => questionRef.current?.focus(), 0);
  }

  function skip() {
    setHint(false);
    update((c) => ({
      ...c,
      choices: { ...c.choices, [q.id]: null },
      checked: { ...c.checked, [q.id]: true },
      index: Math.min(c.index + 1, questions.length - 1),
    }));
    window.setTimeout(() => questionRef.current?.focus(), 0);
  }

  const clock =
    remaining !== null
      ? `${localDigits(Math.floor(remaining / 60000), lang)}:${localDigits(
          String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0"),
          lang,
        )}`
      : null;

  return (
    <div>
      {header}
      {storage === false ? (
        <Callout tone="warning" className="mb-3">
          {s.storageOff}
        </Callout>
      ) : null}
      {resumed ? (
        <p role="status" className="mb-3 text-small text-ink-3">
          {s.resumed}
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-small font-semibold text-ink">
          {fmt(s.questionOf, { i: index + 1, n: questions.length }, lang)}
        </p>
        {clock ? (
          <p
            role="timer"
            aria-label={s.timeLeft}
            className="num inline-flex items-center gap-2 rounded-lg bg-sunken px-3 py-2 text-small font-semibold text-ink"
          >
            <Clock className="h-4 w-4" />
            {clock}
          </p>
        ) : (
          <span className="text-caption text-ink-3">{q.subjectTitle}</span>
        )}
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
        <div
          className="meter-fill h-full rounded-full bg-action"
          style={{
            transform: `scaleX(${(mode === "mock" ? answeredCount : index + (checked ? 1 : 0)) / questions.length})`,
          }}
        />
      </div>
      {mode === "mock" ? (
        <details className="reveal card mb-5 overflow-hidden" data-testid="question-overview">
          <summary className="flex min-h-14 cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 font-semibold text-ink sm:px-6">
            <span className="inline-flex items-center gap-2">
              <ChevronRight className="disclosure-icon h-4 w-4 text-ink-3" />
              {s.questionOverview}
            </span>
            <span className="text-small font-normal text-ink-2">
              {fmt(s.answered, { n: answeredCount, total: questions.length }, lang)}
            </span>
          </summary>
          <div className="space-y-4 border-t border-line px-4 py-4 sm:px-6">
            <p className="text-small text-ink-2">{s.overviewHint}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-caption text-ink-2">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-ink" />
                {s.answeredState}
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-line-strong"
                  aria-hidden="true"
                />
                {s.unansweredState}
              </span>
            </div>
            <nav aria-label={s.questionOverview}>
              <ol className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
                {questions.map((question, position) => {
                  const answered = !!session.choices[question.id];
                  const current = position === index;
                  return (
                    <li key={question.id}>
                      <button
                        type="button"
                        aria-current={current ? "step" : undefined}
                        aria-label={`${fmt(s.questionOf, { i: position + 1, n: questions.length }, lang)}: ${answered ? s.answeredState : s.unansweredState}`}
                        onClick={() => go(position)}
                        className={`num flex min-h-12 w-full items-center justify-center gap-1 rounded-lg border text-small font-semibold ${current ? "border-action bg-action text-on-action" : answered ? "border-ink bg-sunken text-ink" : "border-line-strong bg-surface text-ink hover:border-ink"}`}
                      >
                        {localDigits(position + 1, lang)}
                        {answered ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!nextUnanswered}
              onClick={() => {
                if (nextUnanswered)
                  go(questions.findIndex((question) => question.id === nextUnanswered.id));
              }}
            >
              {s.nextUnanswered}
            </button>
          </div>
        </details>
      ) : null}
      {mode === "mock" && index === 0 && !answeredCount ? (
        <p className="mb-3 text-small text-ink-3">{s.mockNoFeedback}</p>
      ) : null}

      {/* The form holds the question only. Feedback, with its own report
          form in a dialog, sits beside it: a form may not contain a form. */}
      <div className="card overflow-hidden">
        <form id={answerFormId} onSubmit={onCheck}>
          <fieldset
            className="space-y-5 p-4 sm:p-7"
            aria-describedby={hint ? "answer-hint" : undefined}
            aria-invalid={hint || undefined}
          >
            <legend
              ref={questionRef}
              tabIndex={-1}
              className="float-left mb-4 w-full rounded-lg font-display text-lead leading-relaxed text-ink"
            >
              {q.stem}
            </legend>
            <div className="clear-both flex flex-wrap items-center gap-1.5">
              {q.provenance === "demo" ? <DemoTag t={labels} /> : null}
              <span className="text-caption text-ink-3">
                {q.topicCode} {q.topicTitle}
              </span>
            </div>
            <div className="space-y-3">
              {q.options.map((option, optionIndex) => {
                const selected = choice === option.id;
                const isAnswer = option.id === q.answer;
                const state = checked
                  ? isAnswer
                    ? "right"
                    : selected
                      ? "wrong"
                      : "idle"
                  : selected
                    ? "selected"
                    : "idle";
                return (
                  <label
                    key={option.id}
                    className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border px-4 py-3.5 transition-colors duration-[var(--motion-press)] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                      state === "right"
                        ? "border-success bg-success-tint"
                        : state === "wrong"
                          ? "border-danger bg-danger-tint"
                          : state === "selected"
                            ? "border-ink bg-sunken shadow-[inset_0_0_0_1px_var(--color-ink)]"
                            : "border-line-strong bg-surface hover:border-ink"
                    } ${checked ? "cursor-default" : ""}`}
                  >
                    <input
                      ref={optionIndex === 0 ? firstOptionRef : undefined}
                      type="radio"
                      name={`q-${q.id}`}
                      value={option.id}
                      checked={selected}
                      disabled={checked}
                      onChange={() => {
                        setHint(false);
                        update((c) => ({ ...c, choices: { ...c.choices, [q.id]: option.id } }));
                      }}
                      className="mt-1.5 h-5 w-5 shrink-0"
                      aria-label={`${fmt(s.optionLabel, { id: option.id.toUpperCase() }, lang)}: ${option.text}`}
                    />
                    <span className="min-w-0 flex-1 leading-relaxed text-ink">
                      <span className="mr-1.5 font-semibold text-ink-3">
                        {option.id.toUpperCase()}.
                      </span>
                      {option.text}
                      {state === "right" ? (
                        <span className="mt-2 flex items-center gap-1.5 text-small font-semibold text-success">
                          <Check className="h-4 w-4 shrink-0" />
                          {s.correctAnswer}
                        </span>
                      ) : state === "wrong" ? (
                        <span className="mt-2 flex items-center gap-1.5 text-small font-semibold text-danger">
                          <Close className="h-4 w-4 shrink-0" />
                          {s.yourAnswer}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
            {hint ? (
              <p id="answer-hint" role="alert" className="text-small font-semibold text-danger">
                {s.chooseFirst}
              </p>
            ) : null}
          </fieldset>
        </form>

        {checked ? (
          <div
            ref={feedbackRef}
            tabIndex={-1}
            aria-live="polite"
            className="feedback-enter space-y-5 border-t border-line p-4 sm:p-7"
          >
            <p
              className={`flex items-center gap-2 font-display text-title ${right ? "text-success" : choice ? "text-danger" : "text-ink-2"}`}
            >
              {right ? (
                <Check className="h-5 w-5 shrink-0" />
              ) : choice ? (
                <Close className="h-5 w-5 shrink-0" />
              ) : null}
              {right ? s.correct : choice ? s.incorrect : s.skipped}
            </p>
            {!right && correctOption ? (
              <p className="text-ink">
                <span className="font-semibold">{s.correctAnswer}: </span>
                {correctOption.id.toUpperCase()}. {correctOption.text}
              </p>
            ) : null}
            {!right && chosenOption?.whyWrong ? (
              <div className="rounded-lg bg-danger-tint px-3 py-2">
                <p className="text-small font-semibold text-danger">{s.whyWrong}</p>
                <p className="text-small text-ink">{chosenOption.whyWrong}</p>
              </div>
            ) : null}
            <div>
              <p className="text-small font-semibold text-ink-2">{s.explanation}</p>
              <p className="text-ink">{q.explanation}</p>
            </div>
            <div className="space-y-3 border-t border-line pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-small font-semibold text-ink-2">{s.source}</p>
                <ReviewLabel state={q.review} t={labels} />
              </div>
              <SourceCitation
                citation={q.citation}
                lang={lang}
                labels={labels}
                sourcesDown={sourcesDown}
              />
            </div>
            <QuestionActions syllabusId={syllabusId} questionId={q.id} labels={labels} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-4 sm:px-7">
          {mode === "mock" ? (
            <>
              <button
                type="button"
                onClick={() => go(Math.max(0, index - 1))}
                disabled={index === 0}
                className="btn btn-secondary btn-sm"
              >
                {s.previous}
              </button>
              <span className="text-caption text-ink-3">
                {fmt(s.answered, { n: answeredCount, total: questions.length }, lang)}
              </span>
              {last ? (
                <button
                  type="button"
                  onClick={() => setConfirmSubmit(true)}
                  className="btn btn-primary btn-sm"
                >
                  {s.submit}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  className="btn btn-primary btn-sm"
                >
                  {s.next}
                </button>
              )}
            </>
          ) : checked ? (
            <button
              type="button"
              onClick={() => (last ? update((c) => ({ ...c, submitted: true })) : go(index + 1))}
              className="btn btn-primary ml-auto"
            >
              {last ? s.finish : s.next}
            </button>
          ) : (
            <>
              <button type="button" onClick={skip} className="btn btn-secondary btn-sm">
                {s.skip}
              </button>
              <button type="submit" form={answerFormId} className="btn btn-primary">
                {s.check}
              </button>
            </>
          )}
        </div>
      </div>

      {mode === "mock" ? (
        <div className="mt-3 text-right">
          <button
            type="button"
            onClick={() => setConfirmSubmit(true)}
            className="btn btn-quiet btn-sm"
          >
            {s.submit}
          </button>
        </div>
      ) : null}

      <Sheet
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        title={s.submit}
        closeLabel={labels.common.close}
      >
        <p className="text-ink-2">
          {fmt(s.submitConfirm, { n: questions.length - answeredCount }, lang)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={submitMock} className="btn btn-primary">
            {s.submitNow}
          </button>
          <button
            type="button"
            onClick={() => setConfirmSubmit(false)}
            className="btn btn-secondary"
          >
            {s.keepGoing}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Results({
  questions,
  session,
  mode,
  mock,
  base,
  labels,
  lang,
  timedOut,
  onAgain,
}: {
  questions: SessionQuestion[];
  session: Persisted;
  mode: SessionMode;
  mock: MockSpec | null;
  base: string;
  labels: SessionLabels;
  lang: Lang;
  timedOut: boolean;
  onAgain: () => void;
}) {
  const s = labels.session;
  const outcome = (q: SessionQuestion) => {
    const choice = session.choices[q.id];
    return !choice ? "skipped" : choice === q.answer ? "correct" : "wrong";
  };
  const results = questions.map(outcome);
  const score = scoreAnswers(results, mock?.marksPerQuestion ?? 1, mock?.negativePercent ?? 0);
  const bySubject = new Map<string, { title: string; right: number; total: number }>();
  questions.forEach((q, i) => {
    const entry = bySubject.get(q.subjectId) ?? { title: q.subjectTitle, right: 0, total: 0 };
    entry.total += 1;
    if (results[i] === "correct") entry.right += 1;
    bySubject.set(q.subjectId, entry);
  });
  const wrong = questions.filter((q, i) => results[i] !== "correct");

  return (
    <div className="space-y-8">
      {timedOut ? <Callout tone="warning" role="status" title={s.timeUp} /> : null}
      <section aria-labelledby="results" className="wash-block space-y-3 p-5 sm:p-8">
        <h2 id="results" className="text-title">
          {s.resultsTitle}
        </h2>
        {mode === "mock" && mock ? (
          <>
            <p className="num font-display text-display">
              {fmt(s.mockScore, { net: score.net, out: score.outOf }, lang)}
            </p>
            <p className="num text-small text-ink-2">
              {fmt(
                s.mockBreakdown,
                {
                  c: score.correct,
                  g: score.gained,
                  w: score.wrong,
                  d: score.deducted,
                  s: score.skipped,
                },
                lang,
              )}
            </p>
            {questions.length < mock.questionCount ? (
              <p className="text-caption text-ink-2">
                {fmt(
                  labels.practice.mockDemo,
                  { taken: questions.length, real: mock.questionCount, m: session.minutes },
                  lang,
                )}
              </p>
            ) : null}
          </>
        ) : (
          <p className="num font-display text-display">
            {fmt(s.score, { c: score.correct, n: questions.length }, lang)}
          </p>
        )}
      </section>

      <section aria-labelledby="by-subject" className="ruled">
        <h2 id="by-subject" className="text-title">
          {s.bySubject}
        </h2>
        <ul className="mt-2 divide-y divide-line">
          {[...bySubject.values()].map((entry) => (
            <li key={entry.title} className="space-y-2 py-4 text-small">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-ink">{entry.title}</span>
                <span className="num shrink-0 font-semibold text-ink">
                  {localDigits(entry.right, lang)}/{localDigits(entry.total, lang)}
                </span>
              </div>
              <Meter
                value={entry.right}
                max={entry.total}
                label={fmt(s.score, { c: entry.right, n: entry.total }, lang)}
              />
            </li>
          ))}
        </ul>
      </section>

      {wrong.length ? (
        <section aria-labelledby="to-review" className="ruled">
          <h2 id="to-review" className="text-title">
            {s.reviewMistakes}
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {wrong.map((q) => (
              <li key={q.id}>
                <Link
                  href={`${base}/practice/question/${encodeURIComponent(q.id)}`}
                  className="row-link -mx-2 flex items-start gap-3 rounded-lg px-2 py-3 no-underline"
                >
                  <Tag tone={session.choices[q.id] ? "danger" : "neutral"}>
                    {session.choices[q.id] ? s.incorrect : s.skipped}
                  </Tag>
                  <span className="min-w-0 flex-1 text-small leading-snug text-ink">{q.stem}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onAgain} className="btn btn-primary">
          {s.again}
        </button>
        <Link href={`${base}/practice/review`} className="btn btn-secondary">
          {s.reviewMistakes}
        </Link>
        <Link href={`${base}/practice`} className="btn btn-quiet">
          {s.backToPractice}
        </Link>
      </div>
    </div>
  );
}
