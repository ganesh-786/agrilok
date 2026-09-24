import "server-only";

import { cookies, headers } from "next/headers";

import { dictionaries, isLang, type Dictionary, type Lang } from "@/lib/i18n";

export const LANG_COOKIE = "agrilok_lang";
export const LITE_COOKIE = "agrilok_lite";

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "ne";
}

export async function getDictionary(): Promise<{ lang: Lang; t: Dictionary }> {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}

/**
 * Lite mode hides photographs. On by choice, or automatically when the
 * browser asks to save data (the `Save-Data: on` header many Android phones
 * send on metered connections).
 */
export async function getLite(): Promise<boolean> {
  const choice = (await cookies()).get(LITE_COOKIE)?.value;
  if (choice === "1") return true;
  if (choice === "0") return false;
  return (await headers()).get("save-data")?.toLowerCase() === "on";
}
