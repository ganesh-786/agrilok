import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PracticeSession, type SessionMode } from "@/components/practice/PracticeSession";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { Unavailable } from "@/components/study/Unavailable";
import { findTopic, getSimulation, practiceQuestions } from "@/lib/data";
import { localDigits, tr } from "@/lib/format";
import { mockSpec } from "@/lib/practice";
import { toSessionQuestion } from "@/lib/practice-view";
import { loadStudyContext, type ContextParams } from "@/lib/study-context";

const MODES: SessionMode[] = ["quick", "subject", "topic", "mock", "mistakes", "saved"];

type Search = Promise<{ mode?: string; subject?: string; topic?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: ContextParams;
  searchParams: Search;
}): Promise<Metadata> {
  const { t } = await loadStudyContext(params);
  const mode = (await searchParams).mode as SessionMode;
  return { title: MODES.includes(mode) ? t.session.modes[mode] : t.practice.title };
}

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: ContextParams;
  searchParams: Search;
}) {
  const { ctx, syllabus, base, lang, t } = await loadStudyContext(params);
  if (!syllabus) return <Unavailable page="practice" ctx={ctx} t={t} lang={lang} />;
  const query = await searchParams;
  const mode = (MODES.includes(query.mode as SessionMode) ? query.mode : "quick") as SessionMode;

  let scope = "all";
  let title = t.session.modes[mode];
  let filter: ((q: { subjectId: string; topicId: string }) => boolean) | undefined;
  if (mode === "subject") {
    const subject = syllabus.subjects.find((s) => s.id === query.subject);
    if (!subject) notFound();
    scope = subject.id;
    title = `${t.session.modes.subject}: ${tr(subject.title, lang)}`;
    filter = (q) => q.subjectId === subject.id;
  } else if (mode === "topic") {
    const place = query.topic ? findTopic(syllabus, query.topic) : null;
    if (!place) notFound();
    scope = place.topic.id;
    title = `${localDigits(place.topic.code, lang)} ${tr(place.topic.title, lang)}`;
    filter = (q) => q.topicId === place.topic.id;
  }

  const pool = practiceQuestions(syllabus, filter).map((q) => toSessionQuestion(q, lang));
  const simulation = await getSimulation();
  // Client components get only the strings they use.
  const labels = {
    session: t.session,
    source: t.source,
    common: t.common,
    question: t.question,
    reviewState: t.reviewState,
    demo: t.demo,
    practice: { mockDemo: t.practice.mockDemo },
  };

  return (
    <div className="wrap-narrow">
      <Breadcrumbs
        label={t.nav.breadcrumb}
        trail={[
          { href: base, label: t.nav.home },
          { href: `${base}/practice`, label: t.nav.practice },
        ]}
        current={t.session.modes[mode]}
      />
      <PracticeSession
        mode={mode}
        scope={scope}
        syllabusId={syllabus.id}
        base={base}
        title={title}
        pool={pool}
        mock={mockSpec(syllabus)}
        labels={labels}
        lang={lang}
        sourcesDown={simulation.sourcesUnavailable}
      />
    </div>
  );
}
