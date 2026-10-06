import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ProfileForm } from "@/components/start/ProfileForm";
import { photos } from "@/content/photos";
import { groupNames, provinceNames } from "@/content/taxonomy";
import { GROUPS, LEVELS, PROVINCES } from "@/lib/contracts";
import { availability } from "@/lib/data";
import { nepalToday } from "@/lib/dates";
import { getDictionary, getProfile } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.start.title };
}

type Search = { level?: string; province?: string; group?: string };

export default async function StartPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { lang, t } = await getDictionary();
  const profile = await getProfile();
  const query = await searchParams;
  const initial = {
    level: query.level ?? profile?.level ?? "",
    province: query.province ?? profile?.province ?? "",
    group: query.group ?? profile?.group ?? "",
    examDate: profile?.examDate ?? "",
  };
  return (
    <div className="wrap grid gap-x-12 gap-y-2 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.5fr)]">
      <header className="pb-6 pt-6 md:pt-9 lg:self-start">
        <h1 className="text-display">{t.start.title}</h1>
        <p className="mt-3 max-w-prose text-ink-2">{t.start.lead}</p>
        {/* Decoration for the empty column beside the form. It is not shown on
            a phone, where it would push the form down the screen, and a hidden
            image is never downloaded. */}
        <figure className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-2xl bg-sunken lg:block">
          <Image
            src={photos.mustardTerraces.image}
            alt=""
            fill
            sizes="(min-width: 64rem) 24rem, 0px"
            placeholder="blur"
            className="object-cover"
          />
          <Link href="/credits#photos" className="photo-credit">
            {t.common.photoBy.replace("{name}", photos.mustardTerraces.author)}
          </Link>
        </figure>
      </header>
      <ProfileForm
        lang={lang}
        labels={{ start: t.start, levels: t.levels }}
        levels={[...LEVELS]}
        provinces={PROVINCES.map((code) => ({ code, label: provinceNames[code].full[lang] }))}
        groups={GROUPS.map((code) => ({ code, label: groupNames[code][lang] }))}
        available={availability()}
        initial={initial}
        today={nepalToday()}
      />
    </div>
  );
}
