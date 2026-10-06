import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRight, Book, ChevronRight, Clock, Document, Target } from "@/components/Icons";
import { DueCard, SavedCard } from "@/components/practice/PracticeCounts";
import { SubjectMeter } from "@/components/practice/SubjectMeter";
import { SubjectIcon } from "@/components/study/SubjectIcon";
import { Unavailable } from "@/components/study/Unavailable";
import { EmptyState, PageHeader, Panel, Zone } from "@/components/ui/Blocks";
import { LeadPhoto } from "@/components/ui/LeadPhoto";
import { questionsFor } from "@/lib/data";
import { fmt, tr } from "@/lib/format";
import { mockSpec, objectivePaper } from "@/lib/practice";
import { loadStudyContext, type ContextParams } from "@/lib/study-context";

export async function generateMetadata({ params }: { params: ContextParams }): Promise<Metadata> {
  const { t } = await loadStudyContext(params);
  return { title: t.practice.title };
}

export default async function PracticeHub({ params }: { params: ContextParams }) {
  const { ctx, syllabus, base, lang, t } = await loadStudyContext(params);
  if (!syllabus) return <Unavailable page="practice" ctx={ctx} t={t} lang={lang} />;
  const questions = questionsFor(syllabus);
  const p = t.practice;
  const spec = mockSpec(syllabus);
  const paper = objectivePaper(syllabus);
  // How many questions a mock can take from the bank, per the paper's blueprint.
  const taken = spec
    ? spec.blueprint.reduce(
        (sum, { subjectId, questions: quota }) =>
          sum + Math.min(quota, questions.filter((q) => q.subjectId === subjectId).length),
        0,
      )
    : 0;
  const mockMinutes =
    spec && taken < spec.questionCount
      ? Math.max(1, Math.ceil((spec.minutes * taken) / spec.questionCount))
      : (spec?.minutes ?? 0);
  const subjects = syllabus.subjects
    .map((subject) => ({
      subject,
      ids: questions.filter((q) => q.subjectId === subject.id).map((q) => q.id),
    }))
    .filter((entry) => entry.ids.length > 0);
  const hasReasoning = syllabus.subjects.some((subject) => subject.area === "reasoning");

  return (
    <div className="wrap">
      <PageHeader title={p.title} lead={p.lead} />
      {questions.length === 0 ? (
        <EmptyState title={p.noQuestions} />
      ) : (
        <div>
          <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-6">
            <section aria-labelledby="quick" className="lead-block">
              <LeadPhoto photo="ripePaddy" credit={t.common.photoBy} />
              <div className="lead-body flex h-full min-h-52 flex-col items-start px-5 pb-6 pt-4 sm:p-8">
                <span className="icon-chip" aria-hidden="true">
                  <Target className="h-5 w-5" />
                </span>
                <h2 id="quick" className="mt-4 text-headline">
                  {p.quickTitle}
                </h2>
                <p className="lead-block-quiet mt-2">
                  {fmt(p.quickBody, { n: Math.min(10, questions.length) }, lang)}
                </p>
                <div className="mt-auto pt-7">
                  <Link href={`${base}/practice/session?mode=quick`} className="btn btn-on-hero">
                    {p.quickStart}
                    <ArrowRight className="btn-arrow h-4 w-4" />
                  </Link>
                </div>
              </div>
            </section>

            {spec && paper && taken > 0 ? (
              <Panel id="mock" level={2} icon={<Clock className="h-5 w-5" />} title={p.mockTitle}>
                <p className="text-small text-ink-2">
                  {fmt(
                    p.mockBody,
                    {
                      paper: tr(paper.title, lang),
                      n: spec.questionCount,
                      m: spec.minutes,
                      neg: spec.negativePercent,
                    },
                    lang,
                  )}
                </p>
                {taken < spec.questionCount ? (
                  <p className="mt-3 rounded-lg bg-sunken p-3 text-small text-ink-2">
                    {fmt(p.mockDemo, { taken, real: spec.questionCount, m: mockMinutes }, lang)}
                  </p>
                ) : null}
                <div className="mt-auto pt-4">
                  <Link href={`${base}/practice/session?mode=mock`} className="btn btn-secondary">
                    {p.mockStart}
                  </Link>
                </div>
              </Panel>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:mt-6 lg:gap-6">
            <DueCard syllabusId={syllabus.id} base={base} labels={p} lang={lang} />
            <SavedCard syllabusId={syllabus.id} base={base} labels={p} lang={lang} />
          </div>

          <Zone id="subjects" title={p.bySubject}>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map(({ subject, ids }) => (
                <li key={subject.id}>
                  <Link
                    href={`${base}/practice/session?mode=subject&subject=${encodeURIComponent(subject.id)}`}
                    className="card card-link flex h-full items-start gap-3.5 px-5 py-4 no-underline"
                    data-testid="subject-card"
                  >
                    <SubjectIcon titleEn={subject.title.en} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug text-ink">
                        {tr(subject.title, lang)}
                      </span>
                      <span className="num mt-1 block text-caption text-ink-3">
                        {fmt(
                          ids.length === 1 ? p.subjectQuestionsOne : p.subjectQuestions,
                          { n: ids.length },
                          lang,
                        )}
                      </span>
                      <SubjectMeter
                        syllabusId={syllabus.id}
                        questionIds={ids}
                        label={t.syllabus.progress}
                        lang={lang}
                      />
                    </span>
                    <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
            {hasReasoning ? (
              <p className="mt-4 text-caption text-ink-3">{p.reasoningNote}</p>
            ) : null}
          </Zone>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:mt-12 lg:gap-6">
            <Panel
              id="by-topic"
              level={2}
              icon={<Book className="h-5 w-5" />}
              title={p.byTopicTitle}
              action={
                <Link href={`${base}/guide#revise`} className="link">
                  {p.howToRevise}
                </Link>
              }
            >
              <p className="text-small text-ink-2">{p.byTopicBody}</p>
              <div className="mt-auto pt-4">
                <Link href={`${base}/syllabus`} className="btn btn-secondary btn-sm">
                  {p.openSyllabus}
                </Link>
              </div>
            </Panel>

            <Panel
              id="previous"
              level={2}
              icon={<Document className="h-5 w-5" />}
              title={p.previousTitle}
            >
              <p className="text-small text-ink-2">{p.previousBody}</p>
              {spec ? (
                <p className="mt-auto pt-4 text-small">
                  <Link href={`${base}/practice/session?mode=mock`} className="link">
                    {p.previousTry}
                  </Link>
                </p>
              ) : null}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
