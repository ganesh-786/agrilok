import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Book, Calendar, ChevronRight, Document, Search, Target } from "@/components/Icons";
import { AskForm } from "@/components/ask/AskForm";
import { QuestionPicker } from "@/components/ask/QuestionPicker";
import { Unavailable } from "@/components/study/Unavailable";
import { PageHeader } from "@/components/ui/Blocks";
import { findTopic, notesFor, practiceQuestions, topicsInOrder } from "@/lib/data";
import { loadStudyContext, type ContextParams } from "@/lib/study-context";
import { localDigits, tr } from "@/lib/format";

type Search = { topic?: string; questionId?: string };

export async function generateMetadata({ params }: { params: ContextParams }): Promise<Metadata> {
  const { t } = await loadStudyContext(params);
  return { title: t.ask.title };
}

export default async function AskPage({
  params,
  searchParams,
}: {
  params: ContextParams;
  searchParams: Promise<Search>;
}) {
  const { ctx, syllabus, base, lang, t } = await loadStudyContext(params);
  if (!syllabus) return <Unavailable page="ask" ctx={ctx} t={t} lang={lang} />;

  const query = await searchParams;
  const questions = practiceQuestions(syllabus);
  if (query.questionId) {
    const question = questions.find((item) => item.id === query.questionId);
    if (!question) notFound();
    redirect(`${base}/practice/question/${encodeURIComponent(question.id)}`);
  }
  const initialTopic = query.topic
    ? (findTopic(syllabus, decodeURIComponent(query.topic))?.topic ?? null)
    : null;
  const topics = topicsInOrder(syllabus).map(({ topic }) => ({
    id: topic.id,
    label: `${localDigits(topic.code, lang)} ${tr(topic.title, lang)}`,
  }));
  const selectedTopicId = initialTopic?.id ?? "";
  const selectedNote = initialTopic ? notesFor(syllabus).get(initialTopic.id) : null;
  const tools = [
    {
      key: "explainTopic" as const,
      href: selectedTopicId
        ? `${base}/syllabus/${encodeURIComponent(selectedTopicId)}`
        : `${base}/syllabus`,
      Icon: Book,
    },
    { key: "explainQuestion" as const, href: null, Icon: Target },
    { key: "findSyllabus" as const, href: `${base}/syllabus`, Icon: Search },
    {
      key: "practice" as const,
      href: selectedTopicId
        ? `${base}/practice/session?mode=topic&topic=${encodeURIComponent(selectedTopicId)}`
        : `${base}/practice`,
      Icon: Target,
    },
    { key: "plan" as const, href: `${base}/guide`, Icon: Calendar },
    { key: "source" as const, href: `${base}/syllabus`, Icon: Document },
  ];

  return (
    <div className="wrap">
      <PageHeader title={t.ask.title} lead={t.ask.lead}>
        {selectedNote && initialTopic ? (
          <p className="pt-2 text-small text-ink-2">
            {t.ask.scope}:{" "}
            <span className="font-semibold text-ink">{tr(initialTopic.title, lang)}</span>
          </p>
        ) : null}
        <a
          href="#written-question"
          className="link inline-flex min-h-11 items-center text-small lg:hidden"
        >
          {t.ask.writeQuestion}
        </a>
      </PageHeader>

      <div className="grid grid-cols-1 items-start gap-6 pb-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-8">
        <aside className="min-w-0">
          <section className="space-y-4" aria-labelledby="tools-title">
            <div className="space-y-2">
              <h2 id="tools-title" className="text-title">
                {t.ask.toolsTitle}
              </h2>
              <p className="text-caption text-ink-2">{t.ask.toolsFree}</p>
            </div>
            <ul className="grid grid-cols-2 items-start gap-3 lg:grid-cols-1">
              {tools.map(({ key, href, Icon }) => (
                <li key={key} className="h-full has-[[open]]:col-span-2 lg:has-[[open]]:col-span-1">
                  {href ? (
                    <Link
                      href={href}
                      className="card card-link flex h-full min-h-24 flex-col items-start gap-2 px-4 py-3 no-underline lg:min-h-20 lg:flex-row lg:gap-3 lg:py-4"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-action-ink lg:mt-1" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-small font-semibold text-ink">
                          {t.ask.tools[key].title}
                        </span>
                        <span className="mt-1 hidden text-caption text-ink-3 lg:block">
                          {t.ask.tools[key].body}
                        </span>
                      </span>
                      <ChevronRight className="mt-2 hidden h-4 w-4 shrink-0 text-ink-3 lg:block" />
                    </Link>
                  ) : (
                    <details className="card h-full">
                      <summary className="row-link flex min-h-24 flex-col items-start gap-2 rounded-xl px-4 py-3 lg:min-h-20 lg:flex-row lg:gap-3 lg:py-4">
                        <span className="flex w-full items-center justify-between lg:contents">
                          <Icon className="h-5 w-5 shrink-0 text-action-ink lg:mt-1" />
                          <ChevronRight className="disclosure-icon h-4 w-4 shrink-0 text-ink-3 lg:hidden" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-small font-semibold text-ink">
                            {t.ask.tools[key].title}
                          </span>
                          <span className="mt-1 hidden text-caption text-ink-3 lg:block">
                            {t.ask.tools[key].body}
                          </span>
                        </span>
                        <ChevronRight className="disclosure-icon hidden h-4 w-4 shrink-0 text-ink-3 lg:mt-2 lg:block" />
                      </summary>
                      <QuestionPicker
                        base={base}
                        questions={questions.map((question) => ({
                          id: question.id,
                          stem: tr(question.stem, lang),
                          provenance: question.provenance,
                        }))}
                        labels={{ ask: t.ask, practice: t.practice, demo: t.demo }}
                      />
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </aside>
        <AskForm
          ctx={ctx}
          base={base}
          lang={lang}
          labels={{
            ask: t.ask,
            source: t.source,
            common: t.common,
            reviewState: t.reviewState,
            demo: t.demo,
          }}
          topics={topics}
          initialTopic={initialTopic}
        />
      </div>
    </div>
  );
}
