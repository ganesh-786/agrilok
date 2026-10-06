import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronRight } from "@/components/Icons";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { MarkStudied } from "@/components/study/MarkStudied";
import { OfflineSave } from "@/components/study/OfflineSave";
import { Unavailable } from "@/components/study/Unavailable";
import { EmptyState } from "@/components/ui/Blocks";
import { SourceCitation } from "@/components/ui/SourceCitation";
import { DemoTag, ReviewLabel } from "@/components/ui/Tag";
import {
  findTopic,
  getSimulation,
  notesFor,
  questionsFor,
  resolveCitations,
  topicsInOrder,
} from "@/lib/data";
import { fmt, formatDate, localDigits, tr } from "@/lib/format";
import { loadStudyContext } from "@/lib/study-context";

type Params = Promise<{ level: string; province: string; group: string; topic: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { syllabus, lang } = await loadStudyContext(params);
  const place = syllabus ? findTopic(syllabus, decodeURIComponent((await params).topic)) : null;
  return place
    ? { title: `${localDigits(place.topic.code, lang)} ${tr(place.topic.title, lang)}` }
    : {};
}

export default async function TopicPage({ params }: { params: Params }) {
  const { ctx, syllabus, base, lang, t } = await loadStudyContext(params);
  if (!syllabus) return <Unavailable page="syllabus" ctx={ctx} t={t} lang={lang} />;
  const topicId = decodeURIComponent((await params).topic);
  const place = findTopic(syllabus, topicId);
  if (!place) notFound();
  const { subject, topic } = place;
  const code = localDigits(topic.code, lang);
  const note = notesFor(syllabus).get(topic.id) ?? null;
  const questions = questionsFor(syllabus).filter((q) => q.topicId === topic.id);
  const simulation = await getSimulation();
  const citations = note ? resolveCitations(note.citations) : [];
  const order = topicsInOrder(syllabus);
  const prev = order[place.index - 1];
  const next = order[place.index + 1];
  const weights = syllabus.papers.flatMap((paper) =>
    paper.sections.flatMap((section) =>
      section.weights
        .filter((w) => w.subjectId === subject.id)
        .map((w) => ({
          key: `${paper.id}-${section.id}`,
          paper: tr(paper.title, lang),
          section: tr(section.title, lang),
          value: w.questions
            ? fmt(t.syllabus.questions, { n: w.questions }, lang)
            : w.marks
              ? fmt(t.syllabus.marks, { n: w.marks }, lang)
              : section.marks
                ? fmt(t.syllabus.sectionShared, { n: section.marks }, lang)
                : "",
        })),
    ),
  );
  const practiceHref = `${base}/practice/session?mode=topic&topic=${encodeURIComponent(topic.id)}`;
  const askHref = `${base}/ask?topic=${encodeURIComponent(topic.id)}`;
  const offlineItem = {
    id: `topic:${base}:${topic.id}`,
    kind: "topic" as const,
    label: `${code} ${tr(topic.title, lang)}`,
    href: `${base}/syllabus/${encodeURIComponent(topic.id)}`,
    urls: [
      `${base}/syllabus/${encodeURIComponent(topic.id)}`,
      ...(questions.length ? [practiceHref] : []),
    ],
  };
  const weightDetails = (id: string) =>
    weights.length ? (
      <section className="ruled" aria-labelledby={id}>
        <h2 id={id} className="text-title">
          {t.topic.whereCounts}
        </h2>
        <ul className="mt-3 divide-y divide-line text-small text-ink-2">
          {weights.map((w) => (
            <li key={w.key} className="space-y-1 py-3 first:pt-0 last:pb-0">
              <span className="block">
                {w.paper}, {w.section}
              </span>
              <span className="num block font-display text-lead text-ink">{w.value}</span>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <article className="wrap">
      {note ? <MarkStudied syllabusId={syllabus.id} topicId={topic.id} /> : null}
      <Breadcrumbs
        label={t.nav.breadcrumb}
        trail={[
          { href: base, label: t.nav.home },
          { href: `${base}/syllabus`, label: t.nav.syllabus },
          {
            href: `${base}/syllabus#subject-${subject.id}`,
            label: `${localDigits(subject.number, lang)}. ${tr(subject.title, lang)}`,
          },
        ]}
        current={code}
        currentDetail={tr(topic.title, lang)}
      />

      <header className="space-y-3 pb-6 pt-2 sm:pb-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="code text-headline leading-none">{code}</span>
          {note?.provenance === "demo" ? <DemoTag t={t} /> : null}
          {note ? <ReviewLabel state={note.review} t={t} /> : null}
        </div>
        <h1 className="max-w-4xl text-headline">{tr(topic.title, lang)}</h1>
      </header>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-12">
        <aside className="flex flex-col gap-8 xl:order-2">
          <div className="space-y-1 xl:space-y-4 xl:rounded-xl xl:border xl:border-line xl:p-5">
            {questions.length ? (
              <Link href={practiceHref} className="btn btn-primary w-full">
                {t.topic.practise} (
                {fmt(
                  questions.length === 1 ? t.topic.practiseCountOne : t.topic.practiseCount,
                  { n: questions.length },
                  lang,
                )}
                )
              </Link>
            ) : null}
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 xl:flex-col xl:items-stretch xl:gap-3"
              data-testid="topic-secondary-actions"
            >
              <Link
                href={askHref}
                className={
                  questions.length
                    ? "link inline-flex min-h-11 items-center text-small xl:justify-center xl:rounded-lg xl:border xl:border-line-strong xl:px-3 xl:py-2 xl:no-underline xl:hover:bg-sunken"
                    : "btn btn-primary w-full"
                }
              >
                {t.topic.ask}
              </Link>
              <OfflineSave item={offlineItem} labels={t.offline} variant="quiet" />
            </div>
          </div>

          <div className="hidden xl:block">{weightDetails("topic-weight-rail")}</div>
        </aside>

        <div className="min-w-0 xl:order-1">
          {note ? (
            <div className="space-y-8">
              {note.provenance === "demo" ? (
                <p className="border-l-2 border-line-strong pl-3 text-caption text-ink-2">
                  {t.topic.demoNote}
                </p>
              ) : null}
              <p
                className="max-w-prose text-lead font-medium text-ink"
                data-testid="study-note-summary"
              >
                {tr(note.summary, lang)}
              </p>
              <section aria-labelledby="explanation" className="ruled space-y-4">
                <h2 id="explanation" className="text-title">
                  {t.topic.explanation}
                </h2>
                {note.explanation.map((paragraph, i) => (
                  <p key={i} className="max-w-prose leading-[1.9] text-ink">
                    {tr(paragraph, lang)}
                  </p>
                ))}
              </section>
              <section
                aria-labelledby="key-points"
                className="space-y-3 rounded-xl bg-sunken p-5 sm:p-6"
              >
                <h2 id="key-points" className="text-title">
                  {t.topic.keyPoints}
                </h2>
                <ul className="max-w-prose list-disc space-y-3 pl-5 leading-[1.85] text-ink marker:text-ink-3">
                  {note.keyPoints.map((point, i) => (
                    <li key={i}>{tr(point, lang)}</li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="sources" className="ruled space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="sources" className="text-title">
                    {t.topic.sources}
                  </h2>
                  <ReviewLabel state={note.review} t={t} />
                </div>
                <ol className="divide-y divide-line">
                  {citations.map((citation, i) => (
                    <li key={i} className="py-4 first:pt-0 last:pb-0">
                      <SourceCitation
                        citation={citation}
                        n={i + 1}
                        lang={lang}
                        labels={t}
                        sourcesDown={simulation.sourcesUnavailable}
                      />
                    </li>
                  ))}
                </ol>
                <p className="text-caption text-ink-3">
                  {fmt(t.topic.updated, { date: formatDate(note.updatedOn, lang) }, lang)}
                </p>
              </section>
            </div>
          ) : (
            <div>
              <EmptyState title={t.topic.noNoteTitle}>
                <p>{t.topic.noNoteBody}</p>
              </EmptyState>
            </div>
          )}

          <div className="mt-8 xl:hidden">{weightDetails("topic-weight-inline")}</div>

          <section aria-labelledby="related" className="ruled mt-8 space-y-3">
            <h2 id="related" className="text-title">
              {t.topic.related}
            </h2>
            {questions.length ? (
              <ul className="divide-y divide-line">
                {questions.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`${base}/practice/question/${encodeURIComponent(q.id)}`}
                      className="row-link -mx-2 flex min-h-14 items-start gap-3 rounded-lg px-2 py-3.5 no-underline"
                    >
                      <span className="min-w-0 flex-1 leading-relaxed text-ink">
                        {tr(q.stem, lang)}
                      </span>
                      <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-ink-2">{t.topic.noQuestions}</p>
            )}
          </section>

          <nav
            aria-label={`${t.topic.previous} / ${t.topic.next}`}
            className="mt-8 grid gap-3 sm:grid-cols-2"
          >
            {prev ? (
              <Link
                href={`${base}/syllabus/${encodeURIComponent(prev.topic.id)}`}
                className="card row-link px-5 py-4 no-underline"
              >
                <span className="block text-caption text-ink-3">{t.topic.previous}</span>
                <span className="block text-small font-semibold text-ink">
                  {localDigits(prev.topic.code, lang)} {tr(prev.topic.title, lang)}
                </span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {next ? (
              <Link
                href={`${base}/syllabus/${encodeURIComponent(next.topic.id)}`}
                className="card row-link px-5 py-4 no-underline sm:text-right"
              >
                <span className="block text-caption text-ink-3">{t.topic.next}</span>
                <span className="block text-small font-semibold text-ink">
                  {localDigits(next.topic.code, lang)} {tr(next.topic.title, lang)}
                </span>
              </Link>
            ) : null}
          </nav>
        </div>
      </div>
    </article>
  );
}
