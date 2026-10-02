import { Suspense } from "react";

import { setLanguage } from "@/app/actions";
import { ReturnTo } from "@/components/NavState";
import type { Dictionary, Lang } from "@/lib/i18n";

// A plain form, not a client toggle: switching language works on the oldest
// phone browser, with or without JavaScript.
export function LanguageSwitch({ t, lang }: { t: Dictionary; lang: Lang }) {
  return (
    <form action={setLanguage}>
      <input type="hidden" name="lang" value={lang === "ne" ? "en" : "ne"} />
      <Suspense>
        <ReturnTo />
      </Suspense>
      <button
        type="submit"
        title={t.nav.switchTitle}
        lang={lang === "ne" ? "en" : "ne"}
        // On an English page this one word, नेपाली, would be the only Devanagari
        // on screen and would pull in the whole 121 kB Devanagari file to draw
        // it. The device's own Devanagari face draws it instead.
        className={`min-h-11 rounded-lg border border-line-strong bg-surface px-3 text-small font-semibold transition-colors duration-[var(--motion-press)] hover:border-ink hover:bg-sunken ${
          lang === "en" ? "device-devanagari" : ""
        }`}
      >
        {t.nav.switchLabel}
      </button>
    </form>
  );
}
