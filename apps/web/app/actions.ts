"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { AskResult, ExamProfile } from "@/lib/contracts";
import {
  contextPath,
  groupFromSlug,
  isProvince,
  parseContext,
  placeOf,
  sameContext,
  switchPath,
} from "@/lib/context";
import { SIMULATION_COOKIE, ask, syllabusFor } from "@/lib/data";
import { nepalToday } from "@/lib/dates";
import { isLang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/preferences";
import {
  PROFILE_COOKIE,
  adoptedProfile,
  checkExamDate,
  parseProfile,
  serializeProfile,
} from "@/lib/profile";

const YEAR = 60 * 60 * 24 * 365;

const cookieOptions = {
  maxAge: YEAR,
  sameSite: "lax" as const,
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

function safeReturnPath(value: FormDataEntryValue | null): string {
  // Only ever redirect within this site.
  const path = typeof value === "string" ? value : "/";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function setLanguage(formData: FormData): Promise<void> {
  const lang = formData.get("lang");
  if (typeof lang === "string" && isLang(lang)) {
    (await cookies()).set(LANG_COOKIE, lang, cookieOptions);
  }
  redirect(safeReturnPath(formData.get("returnTo")));
}

// --- Exam profile ------------------------------------------------------------------------

export type ProfileState = {
  errors: Partial<Record<"level" | "province" | "group" | "examDate", string>>;
  values: { level: string; province: string; group: string; examDate: string };
};

export async function saveProfile(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const values = {
    level: String(formData.get("level") ?? ""),
    province: String(formData.get("province") ?? ""),
    group: String(formData.get("group") ?? ""),
    examDate: String(formData.get("examDate") ?? ""),
  };
  const errors: ProfileState["errors"] = {};
  const slug = values.level === "level_4" ? "level-4" : values.level === "level_7" ? "level-7" : "";
  if (!slug) errors.level = "level";
  if (!isProvince(values.province)) errors.province = "province";
  if (!groupFromSlug(values.group)) errors.group = "group";
  const dateError = checkExamDate(values.examDate, nepalToday());
  if (dateError) errors.examDate = dateError;
  const ctx = parseContext({ level: slug, province: values.province, group: values.group });
  if (!ctx || Object.keys(errors).length) return { errors, values };

  const profile: ExamProfile = { ...ctx, examDate: values.examDate || null };
  const store = await cookies();
  const previous = parseProfile(store.get(PROFILE_COOKIE)?.value);
  store.set(PROFILE_COOKIE, serializeProfile(profile), cookieOptions);
  const switched =
    previous &&
    (previous.level !== profile.level ||
      previous.province !== profile.province ||
      previous.group !== profile.group);
  redirect(`${contextPath(ctx)}${switched ? "?switched=1" : ""}`);
}

/**
 * Change level, commission or service group from the exam bar on any study
 * page. The student stays in the same section of the new exam.
 *
 * Looking at another exam and making it the saved one are different things:
 * the profile cookie changes only when the form's "save" box is ticked. Ticking
 * it without changing a choice is how an exam opened from a shared link is
 * adopted: the student stays on the page and the exam becomes theirs. Every
 * combination of valid values is an exam, whether or not its syllabus is in
 * the library; the page that opens says what is missing rather than quietly
 * opening a different exam.
 */
export async function switchExam(formData: FormData): Promise<void> {
  const ctx = parseContext({
    level: String(formData.get("level") ?? ""),
    province: String(formData.get("province") ?? ""),
    group: String(formData.get("group") ?? ""),
  });
  if (!ctx) redirect("/start");
  const from = safeReturnPath(formData.get("from"));
  if (formData.get("save") === "on") {
    const store = await cookies();
    const previous = parseProfile(store.get(PROFILE_COOKIE)?.value);
    store.set(PROFILE_COOKIE, serializeProfile(adoptedProfile(previous, ctx)), cookieOptions);
  }
  // Nothing to switch to: stay exactly where the student was.
  if (sameContext(placeOf(from)?.ctx ?? null, ctx)) redirect(from);
  redirect(switchPath(from, ctx));
}

// --- Ask ---------------------------------------------------------------------------------------

export type AskState =
  | { status: "idle" }
  | { status: "done"; result: AskResult }
  | { status: "error"; question: string };

export async function askAction(_previous: AskState, formData: FormData): Promise<AskState> {
  const question = String(formData.get("question") ?? "");
  const ctx = parseContext({
    level: String(formData.get("level") ?? ""),
    province: String(formData.get("province") ?? ""),
    group: String(formData.get("group") ?? ""),
  });
  const scope = String(formData.get("topic") ?? "") || null;
  const syllabus = ctx ? syllabusFor(ctx) : null;
  if (!syllabus) return { status: "error", question };
  try {
    return { status: "done", result: await ask(syllabus, question, scope) };
  } catch {
    return { status: "error", question };
  }
}

// --- Prototype tools (docs/usability-testing.md) ------------------------------------------

export async function setSimulation(formData: FormData): Promise<void> {
  const flags = [
    formData.get("ai") === "on" ? "ai" : "",
    formData.get("sources") === "on" ? "sources" : "",
  ]
    .filter(Boolean)
    .join(",");
  const store = await cookies();
  if (flags) store.set(SIMULATION_COOKIE, flags, { ...cookieOptions, maxAge: 60 * 60 * 24 });
  else store.delete(SIMULATION_COOKIE);
  redirect("/prototype?applied=1");
}
