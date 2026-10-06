import type { Lang } from "@/lib/i18n";

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

export function localDigits(value: string | number, lang: Lang): string {
  const text = String(value);
  return lang === "ne" ? text.replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)] ?? d) : text;
}

/** "2026-09-16" as "16 Sep 2026" or "२०२६ सेप्टेम्बर १६". Dates stay Gregorian, as the source recorded them. */
export function formatDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "";
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00+05:45` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat(lang === "ne" ? "ne-NP" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  }).format(date);
  return lang === "ne" ? localDigits(formatted, lang) : formatted;
}

export function formatDateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat(lang === "ne" ? "ne-NP" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  }).format(date);
  return lang === "ne" ? localDigits(formatted, lang) : formatted;
}

export function formatBytes(bytes: number, lang: Lang): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const text = `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
  return localDigits(text, lang);
}

/** Label from a {code, name_en, name_ne} list, falling back to the code. */
export function labelFor(
  list: { code: string; name_en: string; name_ne: string }[],
  code: string | null | undefined,
  lang: Lang,
): string {
  if (!code) return "";
  const hit = list.find((item) => item.code === code);
  if (!hit) return code;
  return lang === "ne" ? hit.name_ne : hit.name_en;
}

/** Fill {name} placeholders in a dictionary template. Numbers use the page's digits. */
export function fmt(template: string, vars: Record<string, string | number>, lang: Lang): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    if (value === undefined) return match;
    return typeof value === "number" ? localDigits(value, lang) : value;
  });
}

/** Pick the page's language from text given in both. */
export function tr(text: { ne: string; en: string }, lang: Lang): string {
  return text[lang];
}
