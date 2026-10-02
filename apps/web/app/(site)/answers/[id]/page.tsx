import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnswerView } from "@/components/AnswerView";
import { Tag } from "@/components/ui/Tag";
import { api } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import { slugFromLevel } from "@/lib/levels";
import { getDictionary } from "@/lib/preferences";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const answer = await api.answer((await params).id).catch(() => null);
  return answer ? { title: answer.question.slice(0, 80) } : {};
}

export default async function AnswerPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) notFound();
  const [{ lang, t }, answer] = await Promise.all([getDictionary(), api.answer(id)]);
  if (!answer) notFound();
  const slug = slugFromLevel(answer.level);

  return (
    <div className="wrap-narrow py-6 sm:py-8">
      <p className="flex items-center gap-2 text-small">
        <Tag tone={answer.level}>{t.levels[answer.level].short}</Tag>
        <Link href={`/${slug}`} className="link">
          {t.levels[answer.level].name}
        </Link>
      </p>
      <div className="mt-5">
        <AnswerView
          result={answer}
          labels={t.answer}
          sourceLabels={t}
          lang={lang}
          siteUrl={SITE_URL}
          prefix="p"
          headingLevel={1}
        />
      </div>
      <p className="mt-6">
        <Link href={`/${slug}#ask`} className="btn btn-secondary">
          {t.ask.title}
        </Link>
      </p>
    </div>
  );
}
