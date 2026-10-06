import { Alert } from "@/components/Icons";
import type { Syllabus } from "@/lib/contracts";
import { fmt, tr } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";

// The exam at a glance, from the official syllabus: each stage, each paper's
// format, and the negative marking. The numbers are the content, so the marks
// are set as figures in their own column.
export function ExamSummary({
  syllabus,
  t,
  lang,
}: {
  syllabus: Syllabus;
  t: Dictionary;
  lang: Lang;
}) {
  const row = (key: string, title: string, detail: string, marks: number) => (
    <li key={key} className="flex items-start justify-between gap-x-4 py-3 text-small first:pt-0">
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-ink-3">{detail}</span>
      </span>
      <span className="num shrink-0 font-display text-lead text-ink">
        {fmt(t.syllabus.marks, { n: marks }, lang)}
      </span>
    </li>
  );
  return (
    <div className="flex flex-1 flex-col">
      <ul className="divide-y divide-line">
        {syllabus.papers.map((paper) =>
          row(
            paper.id,
            tr(paper.title, lang),
            `${paper.format === "objective" ? t.syllabus.objective : t.syllabus.subjective} · ${tr(paper.pattern, lang)} · ${fmt(t.syllabus.minutes, { n: paper.minutes }, lang)}`,
            paper.fullMarks,
          ),
        )}
        {syllabus.stages
          .filter((stage) => stage.kind !== "written")
          .map((stage) =>
            row(stage.id, tr(stage.title, lang), tr(stage.detail, lang), stage.marks),
          )}
      </ul>
      {/* A rule of the exam, not an alarm: it sits at the foot of the table it
          qualifies, marked with an icon and its name. */}
      <p className="mt-auto flex items-start gap-2.5 border-t border-line pt-3 text-small text-ink-2">
        <Alert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <span>
          <span className="font-semibold text-ink">{t.syllabus.ruleNegative}: </span>
          {tr(syllabus.rules.negativeMarking.text, lang)}
        </span>
      </p>
    </div>
  );
}
