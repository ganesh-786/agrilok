import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuestionReview } from "@/components/practice/QuestionReview";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { Unavailable } from "@/components/study/Unavailable";
import { getSimulation, practiceQuestions } from "@/lib/data";
import { toSessionQuestion } from "@/lib/practice-view";
import { loadStudyContext } from "@/lib/study-context";

type Params = Promise<{ level: string; province: string; group: string; questionId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { t } = await loadStudyContext(params);
  return { title: t.question.title };
}

export default async function QuestionPage({ params }: { params: Params }) {
  const { ctx, syllabus, base, lang, t } = await loadStudyContext(params);
  if (!syllabus) return <Unavailable page="practice" ctx={ctx} t={t} lang={lang} />;
  const questionId = decodeURIComponent((await params).questionId);
  const question = practiceQuestions(syllabus).find((item) => item.id === questionId);
  if (!question) notFound();
  const simulation = await getSimulation();

  return (
    <div className="wrap-narrow">
      <Breadcrumbs
        label={t.nav.breadcrumb}
        trail={[
          { href: base, label: t.nav.home },
          { href: `${base}/practice`, label: t.nav.practice },
        ]}
        current={t.question.title}
      />
      <QuestionReview
        question={toSessionQuestion(question, lang)}
        syllabusId={syllabus.id}
        base={base}
        labels={{
          session: t.session,
          question: t.question,
          source: t.source,
          common: t.common,
          reviewState: t.reviewState,
          demo: t.demo,
        }}
        lang={lang}
        sourcesDown={simulation.sourcesUnavailable}
      />
    </div>
  );
}
