"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { api, ApiUnavailableError } from "@/lib/api";
import { isLang } from "@/lib/i18n";
import { LANG_COOKIE, LITE_COOKIE } from "@/lib/preferences";
import type { AskResponse, LevelCode } from "@/lib/types";

const YEAR = 60 * 60 * 24 * 365;

function safeReturnPath(value: FormDataEntryValue | null): string {
  // Only ever redirect within this site.
  const path = typeof value === "string" ? value : "/";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function setLanguage(formData: FormData): Promise<void> {
  const lang = formData.get("lang");
  if (typeof lang === "string" && isLang(lang)) {
    (await cookies()).set(LANG_COOKIE, lang, {
      maxAge: YEAR,
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }
  redirect(safeReturnPath(formData.get("returnTo")));
}

export async function setLite(formData: FormData): Promise<void> {
  const lite = formData.get("lite") === "1" ? "1" : "0";
  (await cookies()).set(LITE_COOKIE, lite, {
    maxAge: YEAR,
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  redirect(safeReturnPath(formData.get("returnTo")));
}

export type AskState =
  | { status: "idle" }
  | { status: "answered"; result: AskResponse; asked: string }
  | { status: "error"; error: "rate_limited" | "invalid" | "unavailable"; asked: string };

const LEVELS: LevelCode[] = ["level_4", "level_7"];

export async function askQuestion(_previous: AskState, formData: FormData): Promise<AskState> {
  // Reading headers marks this as a per-request action; nothing is cached.
  await headers();
  const level = formData.get("level");
  const question = String(formData.get("question") ?? "").trim();
  const province = String(formData.get("province") ?? "") || undefined;
  const group = String(formData.get("group") ?? "") || undefined;
  const fresh = formData.get("fresh") === "1";
  if (typeof level !== "string" || !LEVELS.includes(level as LevelCode)) {
    return { status: "error", error: "invalid", asked: question };
  }
  if (question.length < 3 || question.length > 1000) {
    return { status: "error", error: "invalid", asked: question };
  }
  try {
    const result = await api.ask(level as LevelCode, {
      question,
      province,
      service_group: group,
      fresh,
    });
    if ("error" in result) return { status: "error", error: result.error, asked: question };
    return { status: "answered", result, asked: question };
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return { status: "error", error: "unavailable", asked: question };
    }
    throw error;
  }
}
