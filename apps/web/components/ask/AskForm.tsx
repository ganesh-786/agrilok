"use client";

import { useActionState, useEffect, useRef } from "react";

import { askAction, type AskState } from "@/app/actions";
import { ArrowRight, Search } from "@/components/Icons";
import { SourceCitation } from "@/components/ui/SourceCitation";
import { Callout } from "@/components/ui/Callout";
import { DemoTag, ReviewLabel } from "@/components/ui/Tag";
import { useOnline } from "@/lib/client/connectivity";
import { isAskKey } from "@/lib/enter-to-ask";
import { formatDate, fmt, tr } from "@/lib/format";
import { slugFromLevel } from "@/lib/levels";
import type { ExamContext, Topic } from "@/lib/contracts";
import type { Dictionary, Lang } from "@/lib/i18n";

type TopicOption = { id: string; label: string };
type CompletedResult = Extract<AskState, { status: "done" }>["result"];

export function AskForm({
  ctx,
  base,
  lang,
  labels,
  topics,
  initialTopic,
}: {
  ctx: ExamContext;
  base: string;
  lang: Lang;
  labels: Pick<Dictionary, "ask" | "source" | "common" | "reviewState" | "demo">;
  topics: TopicOption[];
  initialTopic: Topic | null;
}) {
  const [state, action, pending] = useActionState<AskState, FormData>(askAction, {
    status: "idle",
  });
  const a = labels.ask;
  const result = state.status === "done" ? state.result : null;
  const selectedTopic = initialTopic?.id ?? "";
  const responseRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const invalid = result?.status === "invalid";
  const online = useOnline();
  const draftKey = `agrilok:ask-draft:${base}`;

  useEffect(() => {
    const field = questionRef.current;
    if (!field || field.value) return;
    try {
      // Uncontrolled so the server-rendered form also works without JavaScript.
      field.value = window.sessionStorage.getItem(draftKey)?.slice(0, 1000) ?? "";
    } catch {
      // With storage blocked the current question remains in the field.
    }
  }, [draftKey]);

  function keepDraft(question: string) {
    try {
      window.sessionStorage.setItem(draftKey, question);
    } catch {
      // Asking must still work when storage is unavailable.
    }
  }

  useEffect(() => {
    if (pending || state.status === "idle") return;
    if (invalid || state.status === "error") questionRef.current?.focus();
    else responseRef.current?.focus();
  }, [state, pending, invalid]);

  return (
    <div className="min-w-0 space-y-6">
      <form
        id="written-question"
        tabIndex={-1}
        action={action}
        className="card space-y-5 p-5 sm:p-6"
        aria-labelledby="ask-form-title"
        aria-busy={pending}
        onSubmit={(event) => {
          keepDraft(questionRef.current?.value ?? "");
          if (online === false) event.preventDefault();
        }}
      >
        <input type="hidden" name="level" value={slugFromLevel(ctx.level)} />
        <input type="hidden" name="province" value={ctx.province} />
        <input type="hidden" name="group" value={ctx.group} />
        {!topics.length ? <input type="hidden" name="topic" value={selectedTopic} /> : null}
        <div>
          <label id="ask-form-title" htmlFor="question" className="block text-title font-semibold">
            {a.label}
          </label>
          <p className="mt-2 text-small text-ink-2">{a.privacy}</p>
        </div>
        {topics.length ? (
          <div>
            <label htmlFor="topic-select" className="mb-2 block text-small font-semibold">
              {a.scope}
            </label>
            <select
              id="topic-select"
              name="topic"
              defaultValue={selectedTopic}
              className="field"
              aria-label={a.scope}
            >
              <option value="">{a.scopeAll}</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <textarea
          ref={questionRef}
          id="question"
          name="question"
          rows={6}
          maxLength={1000}
          required
          defaultValue={state.status === "error" ? state.question : result?.question}
          placeholder={a.placeholder}
          className="field min-h-44 resize-y"
          aria-describedby={`ask-hint${invalid || state.status === "error" ? " ask-error" : ""}`}
          aria-invalid={invalid || state.status === "error" || undefined}
          onChange={(event) => keepDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            // On a touch screen Enter must stay a new line: a phone keyboard
            // has no Shift + Enter, and a half-written question sent by
            // accident spends a live answer (lib/enter-to-ask.ts).
            const touchScreen = window.matchMedia("(pointer: coarse)").matches;
            const key = {
              key: event.key,
              shiftKey: event.shiftKey,
              altKey: event.altKey,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              isComposing: event.nativeEvent.isComposing,
              keyCode: event.keyCode,
            };
            if (isAskKey(key, touchScreen) && !pending) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p id="ask-hint" className="text-caption text-ink-3">
            <span className="pointer-coarse:hidden">{a.enterHint}</span>
            <span className="hidden pointer-coarse:inline">{a.enterHintTouch}</span>
          </p>
          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
            <Search className="h-5 w-5" />
            {pending ? a.submitting : a.submit}
          </button>
        </div>
        {invalid || state.status === "error" ? (
          <p id="ask-error" role="alert" className="text-small font-semibold text-danger">
            {invalid ? a.invalid[result.reason] : a.errorBody}
          </p>
        ) : null}
        {online === false ? (
          <Callout tone="offline" role="status" title={a.offlineTitle}>
            {a.offlineBody}
          </Callout>
        ) : null}
      </form>

      {result && !invalid ? (
        <div
          ref={responseRef}
          tabIndex={-1}
          className="feedback-enter rounded-xl"
          aria-label={a.title}
        >
          <AskResultView result={result} base={base} lang={lang} labels={labels} topics={topics} />
        </div>
      ) : null}
    </div>
  );
}

function AskResultView({
  result,
  base,
  lang,
  labels,
  topics,
}: {
  result: CompletedResult;
  base: string;
  lang: Lang;
  labels: Pick<Dictionary, "ask" | "source" | "common" | "reviewState" | "demo">;
  topics: TopicOption[];
}) {
  // The explicit union below keeps the renderer honest when the demo data
  // gains another answer state.
  const a = labels.ask;
  if (result.status === "answered") {
    return (
      <article className="card space-y-6 p-5 sm:p-6" aria-labelledby="answer-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="answer-title" className="text-title">
            {a.title}
          </h2>
          {result.provenance === "demo" ? <DemoTag t={labels} /> : null}
        </div>
        <div className="rounded-lg bg-sunken px-4 py-3">
          <p className="text-caption font-semibold text-ink-3">{a.you}</p>
          <p className="mt-1 font-semibold text-ink">{result.question}</p>
        </div>
        <div className="space-y-3 text-ink">
          <p>{tr(result.answer, lang)}</p>
          {result.points.length ? (
            <ul className="list-disc space-y-1.5 pl-5">
              {result.points.map((point) => (
                <li key={tr(point, lang)}>{tr(point, lang)}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReviewLabel state={result.review} t={labels} />
          <span className="text-caption text-ink-3">
            {result.provenance === "demo" ? a.demoAnswer : a.fromSyllabus}
          </span>
        </div>
        <section aria-labelledby="answer-sources" className="space-y-3 border-t border-line pt-5">
          <h3 id="answer-sources" className="text-lead">
            {a.sources}
          </h3>
          <ol className="space-y-3">
            {result.citations.map((citation, index) => (
              <li key={index} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                <SourceCitation citation={citation} n={index + 1} lang={lang} labels={labels} />
              </li>
            ))}
          </ol>
        </section>
        {result.relatedTopicIds.length ? (
          <section aria-labelledby="related-topics" className="space-y-2">
            <h3 id="related-topics" className="text-lead">
              {a.related}
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.relatedTopicIds.map((topicId) => (
                <a
                  key={topicId}
                  href={`${base}/syllabus/${encodeURIComponent(topicId)}`}
                  className="btn btn-secondary btn-sm"
                >
                  {topics.find((topic) => topic.id === topicId)?.label ?? topicId}
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    );
  }
  if (result.status === "unsupported") {
    return (
      <Callout tone="info" title={a.unsupportedTitle}>
        <p>{a.unsupportedBody}</p>
        <p className="mt-2">
          <a href={`${base}/syllabus`} className="link font-semibold">
            {a.searchInstead}
          </a>
        </p>
      </Callout>
    );
  }
  if (result.status === "unavailable") {
    return (
      <Callout tone="warning" title={a.unavailableTitle}>
        {fmt(
          a.unavailableBody,
          { date: result.resumesAt ? formatDate(result.resumesAt, lang) : "later" },
          lang,
        )}
      </Callout>
    );
  }
  return <Callout tone="danger">{a.invalid[result.reason]}</Callout>;
}
