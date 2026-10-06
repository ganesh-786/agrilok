import "server-only";

import { cookies } from "next/headers";

import type { ExamProfile } from "@/lib/contracts";
import { dictionaries, isLang, type Dictionary, type Lang } from "@/lib/i18n";
import { PROFILE_COOKIE, parseProfile } from "@/lib/profile";

export const LANG_COOKIE = "agrilok_lang";

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "ne";
}

export async function getDictionary(): Promise<{ lang: Lang; t: Dictionary }> {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}

/** The saved exam profile, or null when there is none or it does not parse. */
export async function getProfile(): Promise<ExamProfile | null> {
  return parseProfile((await cookies()).get(PROFILE_COOKIE)?.value);
}
