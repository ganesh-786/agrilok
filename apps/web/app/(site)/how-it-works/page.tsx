import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/ui/Blocks";
import { ReviewLabel } from "@/components/ui/Tag";
import { howItWorks } from "@/content/pages";
import { localDigits } from "@/lib/format";
import { getDictionary } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getDictionary();
  return { title: howItWorks[lang].title, description: howItWorks[lang].lede };
}

export default async function HowItWorksPage() {
  const { lang, t } = await getDictionary();
  const c = howItWorks[lang];
  return (
    <div className="wrap">
      <PageHeader title={c.title} lead={c.lede} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
        <article className="min-w-0 max-w-3xl">
          <section id="steps" className="ruled">
            <h2 className="text-title">{c.stepsTitle}</h2>
            <ol className="mt-5 space-y-5">
              {c.steps.map((step, i) => (
                <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                  <span className="code pt-0.5 text-title">{localDigits(i + 1, lang)}</span>
                  <p className="text-ink-2">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="review" className="ruled mt-10">
            <h2 className="text-title">{c.reviewTitle}</h2>
            <dl className="mt-4 space-y-4">
              <div className="space-y-3 rounded-lg border border-line p-4">
                <dt>
                  <ReviewLabel state="verified" t={t} />
                </dt>
                <dd className="text-ink-2">{c.reviewVerified}</dd>
              </div>
              <div className="space-y-3 rounded-lg border border-line p-4">
                <dt>
                  <ReviewLabel state="ai_assisted_pending_review" t={t} />
                </dt>
                <dd className="text-ink-2">{c.reviewPending}</dd>
              </div>
            </dl>
          </section>

          <section id="measured" className="ruled mt-10">
            <h2 className="text-title">{c.measuredTitle}</h2>
            <ul className="mt-4 space-y-3">
              {c.measured.map((line) => (
                <li key={line} className="border-t border-line pt-3 text-ink-2">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <section id="ai" className="ruled mt-10">
            <h2 className="text-title">{c.aiTitle}</h2>
            <p className="mt-3 text-ink-2">{c.ai}</p>
          </section>

          <section id="limits" className="ruled mt-10">
            <h2 className="text-title">{c.limitsTitle}</h2>
            <ul className="mt-4 space-y-3">
              {c.limits.map((line) => (
                <li key={line} className="border-t border-line pt-3 text-ink-2">
                  {line}
                </li>
              ))}
            </ul>
            {/* The licences of the software and fonts the site is built with.
                Kept reachable from here; it is not something a student needs
                at the foot of every page. */}
            <p className="mt-6 text-small">
              <Link href="/credits" className="link inline-flex min-h-11 items-center">
                {t.footer.credits}
              </Link>
            </p>
          </section>
        </article>
        <nav aria-label={c.title} className="order-first lg:order-last lg:self-start">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 border-l-2 border-line pl-4 text-small lg:flex-col lg:gap-2">
            {[
              ["steps", c.stepsTitle],
              ["review", c.reviewTitle],
              ["measured", c.measuredTitle],
              ["ai", c.aiTitle],
              ["limits", c.limitsTitle],
            ].map(([id, title]) => (
              <li key={id}>
                <a href={`#${id}`} className="link inline-flex min-h-11 items-center">
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
