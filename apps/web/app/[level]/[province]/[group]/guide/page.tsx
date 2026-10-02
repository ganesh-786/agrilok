import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { Unavailable } from "@/components/study/Unavailable";
import { ChipLinks, PageHeader, SectionHeader } from "@/components/ui/Blocks";
import { sameContext } from "@/lib/context";
import {
  daysLeft,
  buildPlan,
  currentBlockIndex,
  PLAN_LENGTHS,
  priorities,
  recommendedLength,
  type PlanLength,
} from "@/lib/plan";
import { getProfile } from "@/lib/preferences";
import { fmt, localDigits, tr } from "@/lib/format";
import { guessValue } from "@/lib/practice";
import { nepalToday } from "@/lib/dates";
import { loadStudyContext, type ContextParams } from "@/lib/study-context";

type Search = { days?: string };

export async function generateMetadata({ params }: { params: ContextParams }): Promise<Metadata> {
  const { t } = await loadStudyContext(params);
  return { title: t.guide.title };
}

export default async function GuidePage({
  params,
  searchParams,
}: {
  params: ContextParams;
  searchParams: Promise<Search>;
}) {
  const { ctx, syllabus, base, lang, t } = await loadStudyContext(params);

  // Advice that holds for any exam. It is the part of this page that still
  // applies when the exam's syllabus is not in the library.
  const steps = (id: string, title: string, items: string[]) => (
    <section id={id} aria-labelledby={`${id}-title`} className="ruled space-y-4">
      <SectionHeader id={`${id}-title`} title={title} />
      <ol className="max-w-prose list-decimal space-y-3 pl-5 text-ink-2 marker:font-semibold marker:text-ink">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
  const general = (
    <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-2">
      {steps("use", t.guide.useTitle, t.guide.use)}
      {steps("revise", t.guide.reviseTitle, t.guide.revise)}
    </div>
  );

  if (!syllabus) {
    return (
      <Unavailable page="guide" ctx={ctx} t={t} lang={lang}>
        {general}
      </Unavailable>
    );
  }

  const profile = await getProfile();
  const today = nepalToday();
  const examDate = profile && sameContext(profile, ctx) ? profile.examDate : null;
  const left = daysLeft(examDate, today);
  const query = await searchParams;
  const requested = Number(query.days);
  const length: PlanLength = PLAN_LENGTHS.includes(requested as PlanLength)
    ? (requested as PlanLength)
    : recommendedLength(left);
  const plan = buildPlan(syllabus, length);
  const nowIndex = currentBlockIndex(plan, length, left);
  const order = priorities(syllabus);
  const subjects = new Map(syllabus.subjects.map((subject) => [subject.id, subject]));
  const planLabel = (n: number) =>
    length === 7 ? fmt(t.guide.day, { n }, lang) : fmt(t.guide.week, { n }, lang);
  const blockLabel = (from: number, to: number) =>
    from === to ? planLabel(from) : fmt(t.guide.weeks, { from, to }, lang);
  const compareRows: [string, string, string][] = [
    [t.guide.compareRows.stages, t.guide.compareValues.l4Stages, t.guide.compareValues.l7Stages],
    [t.guide.compareRows.mcq, t.guide.compareValues.l4Mcq, t.guide.compareValues.l7Mcq],
    [t.guide.compareRows.written, t.guide.compareValues.l4Written, t.guide.compareValues.l7Written],
    [
      t.guide.compareRows.reasoning,
      t.guide.compareValues.l4Reasoning,
      t.guide.compareValues.l7Reasoning,
    ],
    [t.guide.compareRows.final, t.guide.compareValues.l4Final, t.guide.compareValues.l7Final],
    [t.guide.compareRows.laws, t.guide.compareValues.l4Laws, t.guide.compareValues.l7Laws],
    [
      t.guide.compareRows.approved,
      t.guide.compareValues.l4Approved,
      t.guide.compareValues.l7Approved,
    ],
  ];

  return (
    <div className="wrap">
      <Breadcrumbs
        label={t.nav.breadcrumb}
        trail={[{ href: base, label: t.nav.home }]}
        current={t.guide.title}
      />
      <PageHeader plain title={t.guide.title} lead={t.guide.lead} />

      <div className="space-y-10">
        <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-2">
          <section id="plan" aria-labelledby="plan-title" className="ruled space-y-5">
            <div>
              <SectionHeader id="plan-title" title={t.guide.planTitle} />
              <p className="mt-1 text-small text-ink-2">{t.guide.planLead}</p>
            </div>
            <ChipLinks
              label={t.guide.planTitle}
              items={PLAN_LENGTHS.map((option) => ({
                href: `${base}/guide?days=${option}#plan`,
                label: fmt(t.guide.planLength, { n: option }, lang),
                active: option === length,
              }))}
            />
            {examDate ? (
              <p className="text-small text-ink-2">
                {fmt(t.home.daysToExam, { n: Math.max(0, left ?? 0) }, lang)}
              </p>
            ) : (
              <p className="text-small text-ink-2">{t.guide.planNoDate}</p>
            )}
            <ol className="divide-y divide-line border-y border-line">
              {plan.map((block, index) => (
                <li
                  key={`${block.unit}-${block.from}-${block.to}`}
                  className={`px-4 py-4 ${index === nowIndex ? "bg-action-tint" : ""}`}
                  aria-current={index === nowIndex ? "step" : undefined}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-lead">{blockLabel(block.from, block.to)}</p>
                    {index === nowIndex ? (
                      <span className="rounded-md bg-action px-2 py-0.5 text-caption font-semibold text-on-action">
                        {t.guide.now}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-small text-ink-2">{t.guide.focus[block.focus]}</p>
                  {block.subjectIds.length ? (
                    <p className="mt-1 text-small text-ink-3">
                      {block.subjectIds
                        .map((id) => tr(subjects.get(id)?.title ?? { ne: id, en: id }, lang))
                        .join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <section id="first" aria-labelledby="first-title" className="ruled space-y-4">
            <SectionHeader id="first-title" title={t.guide.firstTitle} />
            <p className="max-w-prose text-ink-2">{t.guide.firstBody}</p>
            <ol className="divide-y divide-line">
              {order.slice(0, 6).map((priority, index) => {
                const subject = subjects.get(priority.subjectId);
                if (!subject) return null;
                return (
                  <li
                    key={priority.subjectId}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-x-2 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto]"
                  >
                    <span className="code text-lead">{localDigits(index + 1, lang)}</span>
                    <Link
                      href={`${base}/syllabus#subject-${subject.id}`}
                      className="link min-w-0 font-semibold"
                    >
                      {tr(subject.title, lang)}
                    </Link>
                    <span className="num col-start-2 text-small text-ink-3 sm:col-start-3">
                      {priority.questions
                        ? fmt(t.syllabus.questions, { n: priority.questions }, lang)
                        : fmt(t.syllabus.marks, { n: priority.marks }, lang)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {general}

        <section id="marking" aria-labelledby="marking-title" className="ruled space-y-4">
          <SectionHeader id="marking-title" title={t.guide.markingTitle} />
          <p className="max-w-prose text-ink-2">
            {fmt(
              t.guide.marking,
              {
                neg: syllabus.negativeMarkingPercent,
                guess: Math.round(guessValue(4, syllabus.negativeMarkingPercent) * 100),
                guess3: Math.round(guessValue(3, syllabus.negativeMarkingPercent) * 100),
              },
              lang,
            )}
          </p>
          <Link
            href={`${base}/syllabus#rules`}
            className="link inline-flex min-h-11 items-center text-small"
          >
            {t.syllabus.rulesTitle}
          </Link>
        </section>

        <section id="compare" aria-labelledby="compare-title" className="ruled space-y-4">
          <SectionHeader id="compare-title" title={t.guide.compareTitle} />
          <p className="text-small text-ink-2">{t.guide.compareLead}</p>
          <table className="w-full table-fixed border-collapse text-small">
            <thead>
              <tr className="hidden sm:table-row">
                <td className="w-[24%]" />
                <th scope="col" className="px-3 pb-3 text-left">
                  <span className="rounded-md bg-l4 px-2 py-0.5 font-semibold text-on-l4">
                    {t.levels.level_4.name}
                  </span>
                </th>
                <th scope="col" className="px-3 pb-3 text-left">
                  <span className="rounded-md bg-l7 px-2 py-0.5 font-semibold text-on-l7">
                    {t.levels.level_7.name}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map(([label, l4, l7]) => (
                <tr
                  key={label}
                  className="grid grid-cols-2 gap-x-4 border-t border-line py-4 align-top sm:table-row sm:py-0"
                >
                  <th
                    scope="row"
                    className="col-span-2 pb-2 text-left font-semibold text-ink sm:px-3 sm:py-4 sm:pl-0"
                  >
                    {label}
                  </th>
                  <td className="text-ink-2 sm:px-3 sm:py-4">
                    <span className="mb-1 block font-semibold text-l4-ink sm:hidden">
                      {t.levels.level_4.short}
                    </span>
                    {l4}
                  </td>
                  <td className="text-ink-2 sm:px-3 sm:py-4">
                    <span className="mb-1 block font-semibold text-l7-ink sm:hidden">
                      {t.levels.level_7.short}
                    </span>
                    {l7}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
