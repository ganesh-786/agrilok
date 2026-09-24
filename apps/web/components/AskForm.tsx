"use client";

import { useActionState, useState } from "react";

import { askQuestion, type AskState } from "@/app/actions";
import { AnswerView } from "@/components/AnswerView";
import { localDigits } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import { looksPersonal } from "@/lib/pii";
import type { LevelCode } from "@/lib/types";

const MAX = 1000;
const INITIAL: AskState = { status: "idle" };

// The form posts to a server action, so it also works before JavaScript loads
// or where it never loads; the enhancements here (pending state, character
// count, the personal-data warning) are extras, not requirements.
export function AskForm({
  level,
  province,
  group,
  askLabels,
  answerLabels,
  lang,
  siteUrl,
}: {
  level: LevelCode;
  province?: string;
  group?: string;
  askLabels: Dictionary["ask"];
  answerLabels: Dictionary["answer"];
  lang: Lang;
  siteUrl: string;
}) {
  const [state, formAction, pending] = useActionState(askQuestion, INITIAL);
  const [text, setText] = useState("");
  const personal = looksPersonal(text);
  const placeholder =
    level === "level_4" ? askLabels.placeholder_level_4 : askLabels.placeholder_level_7;
  const error =
    state.status === "error"
      ? {
          rate_limited: askLabels.rateLimited,
          invalid: askLabels.invalid,
          unavailable: askLabels.unavailable,
        }[state.error]
      : null;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-2.5">
        <input type="hidden" name="level" value={level} />
        {province ? <input type="hidden" name="province" value={province} /> : null}
        {group ? <input type="hidden" name="group" value={group} /> : null}
        <label htmlFor={`question-${level}`} className="block font-semibold">
          {askLabels.label}
        </label>
        <textarea
          id={`question-${level}`}
          name="question"
          required
          minLength={3}
          maxLength={MAX}
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          aria-describedby={`question-${level}-help`}
          className="field min-h-[6rem] resize-y leading-relaxed"
        />
        <div
          id={`question-${level}-help`}
          className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-[0.82rem]"
        >
          <p
            className={personal ? "font-semibold text-rhodo" : "text-ink-3"}
            role={personal ? "alert" : undefined}
          >
            {personal ? askLabels.piiWarning : askLabels.privacy}
          </p>
          <p className="text-ink-3" aria-live="off">
            {localDigits(MAX - text.length, lang)} {askLabels.charsLeft}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" className="btn btn-primary" disabled={pending || personal}>
            {pending ? askLabels.submitting : askLabels.submit}
          </button>
          {pending ? <span className="text-sm text-ink-3">{askLabels.slowNote}</span> : null}
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-card)] border border-rhodo/40 bg-card px-4 py-3 text-rhodo"
        >
          {error}
        </p>
      ) : null}

      {state.status === "answered" ? (
        <div className="rounded-[var(--radius-card)] border border-rule bg-card p-4 sm:p-6">
          <AnswerView
            result={state.result}
            asked={state.asked}
            labels={answerLabels}
            lang={lang}
            siteUrl={siteUrl}
            prefix={`ask-${level}`}
          />
          {state.result.cache.kind === "similar" ? (
            <form action={formAction} className="mt-4 border-t border-rule pt-3">
              <input type="hidden" name="level" value={level} />
              <input type="hidden" name="question" value={state.asked} />
              <input type="hidden" name="fresh" value="1" />
              {province ? <input type="hidden" name="province" value={province} /> : null}
              {group ? <input type="hidden" name="group" value={group} /> : null}
              <button type="submit" className="btn btn-quiet text-sm" disabled={pending}>
                {askLabels.fresh}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
