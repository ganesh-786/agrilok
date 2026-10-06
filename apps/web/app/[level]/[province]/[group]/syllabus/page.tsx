import type { Metadata } from "next";
import Link from "next/link";

import { Book, ChevronRight, ExternalLink, Search } from "@/components/Icons";
import { TopicStatus } from "@/components/study/TopicStatus";
import { Unavailable } from "@/components/study/Unavailable";
import { SubjectIcon } from "@/components/study/SubjectIcon";
import { PageHeader } from "@/components/ui/Blocks";
import { Callout } from "@/components/ui/Callout";
import { SourceCitation } from "@/components/ui/SourceCitation";
import { ReviewLabel, Tag } from "@/components/ui/Tag";
import type { Paper, Subject, Syllabus } from "@/lib/contracts";
import { document, getSimulation, notesFor, questionsFor, resolveCitation } from "@/lib/data";
import { fmt, formatDate, localDigits, tr } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import { searchSyllabus } from "@/lib/search";
import { checkOfficialLink } from "@/lib/official-links";
import { loadStudyContext, type ContextParams } from "@/lib/study-context";

export async function generateMetadata({ params }: { params: ContextParams }): Promise<Metadata> {
  const { t } = await loadStudyContext(params);
  return { title: t.syllabus.title };
}

function weightText(
  paper: Paper,
  w: { questions: number | null; marks: number | null },
  sectionMarks: number | null,
  t: Dictionary,
  lang: Lang,
): string {
  if (w.questions) return fmt(t.syllabus.questions, { n: w.questions }, lang);
  if (w.marks) return fmt(t.syllabus.marks, { n: w.marks }, lang);
  if (sectionMarks) return fmt(t.syllabus.sectionShared, { n: sectionMarks }, lang);
  return paper.format === "objective" ? t.syllabus.objective : t.syllabus.subjective;
}

export default async function SyllabusPage({
  params,
  searchParams,
}: {
  params: ContextParams;
  searchParams: Promise<{ q?: string }>;
}) {
  const { ctx, syllabus, base, lang, t } = await loadStudyContext(params);
  if (!syllabus) return <Unavailable page="syllabus" ctx={ctx} t={t} lang={lang} />;
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const doc = document(syllabus.documentId);
  const officialLink = doc ? checkOfficialLink(doc.url) : null;
  const docCitation = resolveCitation({
    kind: "official",
    documentId: syllabus.documentId,
    locator: { ne: "पूरा पाठ्यक्रम", en: "The whole syllabus" },
    quote: null,
  });
  const simulation = await getSimulation();
  const notes = notesFor(syllabus);
  const questions = questionsFor(syllabus);
  const questionsByTopic = new Map<string, string[]>();
  for (const question of questions) {
    questionsByTopic.set(question.topicId, [
      ...(questionsByTopic.get(question.topicId) ?? []),
      question.id,
    ]);
  }
  const hits = q ? searchSyllabus(syllabus, q) : [];
  const topicById = new Map(
    syllabus.subjects.flatMap((s) => s.topics.map((tp) => [tp.id, { tp, s }] as const)),
  );
  const rules: [string, Syllabus["rules"][keyof Syllabus["rules"]]][] = [
    [t.syllabus.ruleNegative, syllabus.rules.negativeMarking],
    [t.syllabus.ruleLaws, syllabus.rules.laws],
    [t.syllabus.ruleDevices, syllabus.rules.devices],
    [t.syllabus.ruleMedium, syllabus.rules.medium],
    [t.syllabus.ruleProgression, syllabus.rules.progression],
  ];
  const rendered = new Set<string>();

  const topicRow = (subject: Subject, topicId: string) => {
    const entry = topicById.get(topicId);
    if (!entry) return null;
    const qIds = questionsByTopic.get(topicId) ?? [];
    return (
      <li key={topicId}>
        <Link
          href={`${base}/syllabus/${encodeURIComponent(topicId)}`}
          className="row-link group flex min-h-16 items-start gap-3 px-4 py-4 no-underline sm:gap-4 sm:px-5"
        >
          <span className="code w-11 shrink-0 pt-0.5 text-lead">
            {localDigits(entry.tp.code, lang)}
          </span>
          <span className="min-w-0 flex-1 space-y-1">
            <span className="block font-semibold leading-relaxed text-ink">
              {tr(entry.tp.title, lang)}
            </span>
            <span className="flex flex-wrap items-center gap-2 pt-1">
              {notes.has(topicId) ? <Tag tone="outline">{t.syllabus.hasNote}</Tag> : null}
              {qIds.length ? (
                <Tag tone="neutral">
                  {fmt(
                    qIds.length === 1 ? t.topic.practiseCountOne : t.syllabus.questionCount,
                    { n: qIds.length },
                    lang,
                  )}
                </Tag>
              ) : null}
              <TopicStatus
                syllabusId={syllabus.id}
                topicId={topicId}
                questionIds={qIds}
                labels={{ studied: t.syllabus.studied, progress: t.syllabus.progress }}
                lang={lang}
              />
            </span>
          </span>
          <ChevronRight className="mt-1.5 h-5 w-5 shrink-0 text-ink-3 group-hover:text-ink" />
        </Link>
      </li>
    );
  };

  return (
    <div className="wrap pb-10">
      <PageHeader title={t.syllabus.title}>
        <p className="text-small">
          <span className="font-medium text-ink-2">{tr(syllabus.title, lang)}</span>
        </p>
      </PageHeader>

      <form role="search" method="get" className="max-w-3xl">
        <label htmlFor="syllabus-q" className="mb-2 block text-small font-semibold">
          {t.syllabus.searchLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="syllabus-q"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder={t.syllabus.searchPlaceholder}
            className="field min-w-0"
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn btn-primary shrink-0 px-4"
            aria-label={t.syllabus.searchButton}
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </form>

      {q ? (
        <section aria-live="polite" className="mt-5 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lead">{fmt(t.syllabus.searchResults, { q }, lang)}</h2>
            <Link href={`${base}/syllabus`} className="link shrink-0 text-small" scroll={false}>
              {t.syllabus.clearSearch}
            </Link>
          </div>
          {hits.length ? (
            <ul className="card divide-y divide-line overflow-hidden" data-testid="search-results">
              {hits.map((hit) => {
                const subject = syllabus.subjects.find((s) => s.id === hit.subjectId);
                return subject ? topicRow(subject, hit.topicId) : null;
              })}
            </ul>
          ) : (
            <Callout tone="info">{fmt(t.syllabus.searchNone, { q }, lang)}</Callout>
          )}
        </section>
      ) : null}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-8">
        <aside className="min-w-0 xl:order-2">
          <section
            aria-labelledby="official"
            className="border-y border-line py-3 xl:rounded-xl xl:border xl:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2 id="official" className="flex items-center gap-2 text-small">
                <Book className="h-4 w-4 shrink-0 text-ink-2" />
                {t.syllabus.officialSource}
              </h2>
              <ReviewLabel state={syllabus.review} t={t} />
            </div>
            {doc ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption">
                {officialLink?.ok && !simulation.sourcesUnavailable ? (
                  <a
                    href={officialLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link inline-flex min-h-11 flex-wrap items-center gap-x-2"
                  >
                    {t.library.officialPdf}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-normal text-ink-3">{officialLink.host}</span>
                    <span className="sr-only">{t.common.externalHint}</span>
                  </a>
                ) : (
                  <p className="py-1 text-warning">
                    <span className="font-semibold">{t.source.withheld}. </span>
                    {simulation.sourcesUnavailable
                      ? t.source.reasons.down
                      : officialLink && !officialLink.ok
                        ? t.source.reasons[officialLink.reason]
                        : t.source.noSiteYet}
                    {officialLink?.ok ? (
                      <span className="block text-ink-3">{officialLink.host}</span>
                    ) : null}
                  </p>
                )}
                <span className="text-ink-3">
                  {fmt(t.source.fetched, { date: formatDate(doc.fetchedOn, lang) }, lang)}
                </span>
              </div>
            ) : null}
            {syllabus.partial ? (
              <p className="mt-2 text-caption text-ink-2">{t.syllabus.partialNote}</p>
            ) : null}
            {doc && docCitation ? (
              <details className="reveal mt-1" data-testid="syllabus-source-details">
                <summary className="link inline-flex min-h-11 items-center gap-2 text-small">
                  <ChevronRight className="disclosure-icon h-4 w-4 shrink-0" />
                  <span>
                    {doc.id} · {t.library.details}
                  </span>
                </summary>
                <div className="space-y-4 border-t border-line pt-4">
                  <SourceCitation
                    citation={docCitation}
                    lang={lang}
                    labels={t}
                    sourcesDown={simulation.sourcesUnavailable}
                  />
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-small">
                    <Link
                      href={`${base}/guide#use`}
                      className="link inline-flex min-h-11 items-center"
                    >
                      {t.syllabus.howToUse}
                    </Link>
                    <a href="#rules" className="link inline-flex min-h-11 items-center">
                      {t.syllabus.rulesTitle}
                    </a>
                  </div>
                </div>
              </details>
            ) : null}
          </section>
        </aside>

        <div className="min-w-0 space-y-8 xl:order-1">
          {syllabus.papers.map((paper) => (
            <section key={paper.id} aria-labelledby={`paper-${paper.id}`}>
              <header className="ruled">
                <h2 id={`paper-${paper.id}`} className="text-headline">
                  {tr(paper.title, lang)}
                </h2>
                <p className="mt-2 text-small text-ink-2">
                  {paper.format === "objective" ? t.syllabus.objective : t.syllabus.subjective} ·{" "}
                  {tr(paper.pattern, lang)} · {fmt(t.syllabus.minutes, { n: paper.minutes }, lang)}{" "}
                  · {fmt(t.syllabus.fullMarks, { n: paper.fullMarks }, lang)} ·{" "}
                  {fmt(t.syllabus.passMarks, { n: paper.passMarks }, lang)}
                </p>
                {paper.format === "subjective" ? (
                  <p className="mt-2 text-small text-ink-2">{t.syllabus.subjectiveNote}</p>
                ) : null}
              </header>
              {paper.sections.map((section) => (
                <div key={section.id} className="mt-6 space-y-4">
                  <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-lead">
                    {tr(section.title, lang)}
                    {section.questions ? (
                      <span className="text-small font-normal text-ink-3">
                        {fmt(t.syllabus.questions, { n: section.questions }, lang)}
                      </span>
                    ) : section.marks ? (
                      <span className="text-small font-normal text-ink-3">
                        {fmt(t.syllabus.marks, { n: section.marks }, lang)}
                      </span>
                    ) : null}
                  </h3>
                  {section.weights.map((w) => {
                    const subject = syllabus.subjects.find((s) => s.id === w.subjectId);
                    if (!subject) return null;
                    const first = !rendered.has(subject.id);
                    rendered.add(subject.id);
                    const weight = weightText(paper, w, section.marks, t, lang);
                    const subjectQuestions = questions.filter(
                      (qq) => qq.subjectId === subject.id,
                    ).length;
                    if (!first) {
                      return (
                        <a
                          key={subject.id}
                          href={`#subject-${subject.id}`}
                          className="card row-link flex flex-wrap items-center justify-between gap-3 px-5 py-4 no-underline"
                        >
                          <span className="font-semibold text-ink">
                            {localDigits(subject.number, lang)}. {tr(subject.title, lang)}
                          </span>
                          <span className="num text-small text-ink-3">{weight}</span>
                        </a>
                      );
                    }
                    return (
                      <div
                        key={subject.id}
                        id={`subject-${subject.id}`}
                        className="card overflow-hidden"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-sunken px-4 py-4 sm:px-5">
                          <div className="flex min-w-0 items-start gap-3">
                            <SubjectIcon titleEn={subject.title.en} />
                            <div className="min-w-0">
                              <h4 className="font-display text-lead text-ink">
                                {localDigits(subject.number, lang)}. {tr(subject.title, lang)}
                              </h4>
                              <p className="text-caption text-ink-3">
                                {fmt(
                                  t.syllabus.topicsInSubject,
                                  { n: subject.topics.length },
                                  lang,
                                )}
                              </p>
                            </div>
                          </div>
                          <span className="num shrink-0 text-small font-semibold text-ink-2">
                            {weight}
                          </span>
                        </div>
                        <ul className="divide-y divide-line">
                          {subject.topics.map((tp) => topicRow(subject, tp.id))}
                        </ul>
                        {subjectQuestions > 0 ? (
                          <div className="border-t border-line px-4 py-2 sm:px-5">
                            <Link
                              href={`${base}/practice/session?mode=subject&subject=${encodeURIComponent(subject.id)}`}
                              className="link inline-flex min-h-12 items-center text-small font-semibold"
                            >
                              {t.syllabus.practiseSubject} (
                              {fmt(t.syllabus.questions, { n: subjectQuestions }, lang)})
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </section>
          ))}

          <section aria-labelledby="rules" className="ruled">
            <h2 id="rules" className="text-headline">
              {t.syllabus.rulesTitle}
            </h2>
            <dl className="mt-3 divide-y divide-line">
              {rules.map(([label, rule]) => (
                <div key={label} className="grid gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <dt className="font-semibold text-ink">{label}</dt>
                  <dd className="text-small text-ink-2">
                    {tr(rule.text, lang)}{" "}
                    {rule.citation.kind === "official" ? (
                      <span className="text-caption text-ink-3">
                        ({tr(rule.citation.locator, lang)})
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
