import type { Metadata } from "next";

import { ReviewList } from "@/components/practice/ReviewList";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { Unavailable } from "@/components/study/Unavailable";
import { PageHeader } from "@/components/ui/Blocks";
import { practiceQuestions } from "@/lib/data";
import { toSessionQuestion } from "@/lib/practice-view";
import { loadStudyContext, type ContextParams } from "@/lib/study-context";

export async function generateMetadata({ params }: { params: ContextParams }): Promise<Metadata> {
  const { t } = await loadStudyContext(params);
  return { title: t.review.title };
}

export default async function ReviewPage({ params }: { params: ContextParams }) {
  const { ctx, syllabus, base, lang, t } = await loadStudyContext(params);
  if (!syllabus) return <Unavailable page="practice" ctx={ctx} t={t} lang={lang} />;
  const questions = practiceQuestions(syllabus).map((question) =>
    toSessionQuestion(question, lang),
  );

  return (
    <div className="wrap">
      <Breadcrumbs
        label={t.nav.breadcrumb}
        trail={[
          { href: base, label: t.nav.home },
          { href: `${base}/practice`, label: t.nav.practice },
        ]}
        current={t.review.title}
      />
      <PageHeader plain title={t.review.title} lead={t.review.lead} />
      <ReviewList
        syllabusId={syllabus.id}
        base={base}
        questions={questions}
        labels={{ review: t.review }}
        lang={lang}
      />
    </div>
  );
}
