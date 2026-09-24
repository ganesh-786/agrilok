import type { Metadata } from "next";

import { ReviewBadge } from "@/components/Badges";
import { Figure } from "@/components/Figure";
import { photos } from "@/content/photos";
import { howItWorks } from "@/content/pages";
import { localDigits } from "@/lib/format";
import { getDictionary, getLite } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getDictionary();
  return { title: howItWorks[lang].title, description: howItWorks[lang].lede };
}

export default async function HowItWorksPage() {
  const { lang, t } = await getDictionary();
  const lite = await getLite();
  const c = howItWorks[lang];
  return (
    <div className="wrap max-w-4xl py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{c.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-ink-2">{c.lede}</p>

      <Figure
        photo={photos.paddyTerraces}
        lang={lang}
        lite={lite}
        sizes="(min-width: 896px) 896px, 100vw"
        aspect="aspect-[16/7]"
        className="mt-8"
      />

      <section className="mt-10">
        <h2 className="text-2xl font-bold">{c.stepsTitle}</h2>
        <ol className="mt-5 space-y-5">
          {c.steps.map((step, i) => (
            <li key={i} className="grid grid-cols-[2.25rem_1fr] gap-3">
              <span className="font-serif text-2xl font-extrabold leading-none text-field">
                {localDigits(i + 1, lang)}
              </span>
              <p className="text-ink-2">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rule mt-10 pt-8">
        <h2 className="text-2xl font-bold">{c.reviewTitle}</h2>
        <dl className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt>
              <ReviewBadge state="verified" t={t} />
            </dt>
            <dd className="text-ink-2">{c.reviewVerified}</dd>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt>
              <ReviewBadge state="ai_assisted_pending_review" t={t} />
            </dt>
            <dd className="text-ink-2">{c.reviewPending}</dd>
          </div>
        </dl>
      </section>

      <section className="rule mt-10 pt-8">
        <h2 className="text-2xl font-bold">{c.measuredTitle}</h2>
        <ul className="mt-4 space-y-3">
          {c.measured.map((line) => (
            <li key={line} className="border-l-2 border-field pl-4 text-ink-2">
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="rule mt-10 pt-8">
        <h2 className="text-2xl font-bold">{c.aiTitle}</h2>
        <p className="mt-3 text-ink-2">{c.ai}</p>
      </section>

      <section className="rule mt-10 pt-8">
        <h2 className="text-2xl font-bold">{c.limitsTitle}</h2>
        <ul className="mt-4 space-y-3">
          {c.limits.map((line) => (
            <li key={line} className="border-l-2 border-mustard pl-4 text-ink-2">
              {line}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
