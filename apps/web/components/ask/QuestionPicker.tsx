"use client";

import { useState } from "react";

import { DemoTag } from "@/components/ui/Tag";
import type { Provenance } from "@/lib/contracts";
import type { Dictionary } from "@/lib/i18n";

export function QuestionPicker({
  base,
  questions,
  labels,
}: {
  base: string;
  questions: { id: string; stem: string; provenance: Provenance }[];
  labels: Pick<Dictionary, "ask" | "practice" | "demo">;
}) {
  const [selectedId, setSelectedId] = useState("");
  const selected = questions.find((question) => question.id === selectedId);

  return (
    <form action={`${base}/ask`} method="get" className="space-y-3 border-t border-line p-4">
      {questions.length ? (
        <>
          <label htmlFor="question-to-explain" className="block text-small font-semibold">
            {labels.ask.pickQuestion}
          </label>
          <select
            id="question-to-explain"
            name="questionId"
            className="field"
            value={selectedId}
            onChange={(event) => setSelectedId(event.currentTarget.value)}
            aria-describedby={selected ? "selected-question-preview" : undefined}
            required
          >
            <option value="" disabled>
              {labels.ask.pickQuestion}
            </option>
            {questions.map((question) => (
              <option key={question.id} value={question.id}>
                {question.provenance === "demo" ? `${labels.demo.tag}: ` : ""}
                {question.stem}
              </option>
            ))}
          </select>
          {selected ? (
            <div id="selected-question-preview" className="space-y-2 rounded-lg bg-sunken p-3">
              {selected.provenance === "demo" ? <DemoTag t={labels} /> : null}
              <p className="text-small leading-relaxed text-ink">{selected.stem}</p>
            </div>
          ) : null}
          <button type="submit" className="btn btn-secondary btn-sm">
            {labels.ask.open}
          </button>
        </>
      ) : (
        <p className="text-small text-ink-2">{labels.practice.noQuestions}</p>
      )}
    </form>
  );
}
