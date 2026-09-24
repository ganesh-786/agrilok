import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnswerView } from "@/components/AnswerView";
import { LevelBadge } from "@/components/Badges";
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
    <div className="wrap max-w-3xl py-8">
      <p className="flex items-center gap-2 text-sm">
        <LevelBadge level={answer.level} t={t} lang={lang} />
        <Link href={`/${slug}`} className="link">
          {t.levels[answer.level].name}
        </Link>
      </p>
      <div className="mt-5 rounded-[var(--radius-card)] border border-rule bg-card p-4 sm:p-6">
        <AnswerView result={answer} labels={t.answer} lang={lang} siteUrl={SITE_URL} prefix="p" />
      </div>
      <p className="mt-6">
        <Link href={`/${slug}#ask`} className="btn btn-quiet">
          {t.level.askTitle}
        </Link>
      </p>
    </div>
  );
}
