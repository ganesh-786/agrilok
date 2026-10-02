"use client";

import { useRef, useState } from "react";

import { Bookmark, Flag } from "@/components/Icons";
import { Sheet } from "@/components/ui/Sheet";
import { saveReport, toggleSaved, useProgress } from "@/lib/client/progress";
import type { Dictionary } from "@/lib/i18n";

type Labels = {
  session: Dictionary["session"];
  question: Dictionary["question"];
  common: Dictionary["common"];
};

// Save a question for later, or report a problem with it. Reports stay on the
// device until the review queue exists, and the screen says so plainly.
export function QuestionActions({
  syllabusId,
  questionId,
  labels,
}: {
  syllabusId: string;
  questionId: string;
  labels: Labels;
}) {
  const progress = useProgress(syllabusId);
  const saved = !!progress?.saved.includes(questionId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "failed" | "missing">("idle");
  const reasons = labels.question.reasons;
  const reasonRef = useRef<HTMLInputElement>(null);

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!reason) {
      setState("missing");
      reasonRef.current?.focus();
      return;
    }
    setState(
      saveReport({ targetId: questionId, reason, note: note.slice(0, 500) }) ? "sent" : "failed",
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toggleSaved(syllabusId, questionId)}
        aria-pressed={saved}
        className="btn btn-secondary btn-sm"
        disabled={progress === null}
      >
        <Bookmark className="h-4 w-4" filled={saved} />
        {saved ? labels.session.saved : labels.session.save}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setState("idle");
        }}
        className="btn btn-quiet btn-sm"
      >
        <Flag className="h-4 w-4" />
        {labels.session.report}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={labels.question.reportTitle}
        closeLabel={labels.common.close}
      >
        {state === "sent" ? (
          <p role="status" className="text-ink-2">
            {labels.question.reportThanks}
          </p>
        ) : (
          <form onSubmit={send} className="space-y-4">
            <fieldset
              className="space-y-3"
              aria-invalid={state === "missing" || undefined}
              aria-describedby={state === "missing" ? `reason-error-${questionId}` : undefined}
            >
              <legend className="sr-only">{labels.question.reportTitle}</legend>
              {(Object.keys(reasons) as (keyof typeof reasons)[]).map((key, index) => (
                <label key={key} className="choice">
                  <input
                    ref={index === 0 ? reasonRef : undefined}
                    type="radio"
                    name="reason"
                    value={key}
                    checked={reason === key}
                    onChange={() => {
                      setReason(key);
                      setState("idle");
                    }}
                  />
                  {reasons[key]}
                </label>
              ))}
            </fieldset>
            <div>
              <label htmlFor={`note-${questionId}`} className="mb-1 block text-small font-semibold">
                {labels.question.reportNote}
              </label>
              <textarea
                id={`note-${questionId}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                className="field"
              />
            </div>
            {state === "missing" ? (
              <p
                id={`reason-error-${questionId}`}
                role="alert"
                className="text-small font-semibold text-danger"
              >
                {labels.question.chooseReason}
              </p>
            ) : state === "failed" ? (
              <p role="alert" className="text-small font-semibold text-danger">
                {labels.question.reportFailed}
              </p>
            ) : null}
            <button type="submit" className="btn btn-primary btn-block">
              {labels.question.reportSend}
            </button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
