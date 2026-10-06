"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { saveProfile, type ProfileState } from "@/app/actions";
import { Tag } from "@/components/ui/Tag";
import type { Availability, LevelCode } from "@/lib/contracts";
import { fmt, localDigits } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";

type Labels = { start: Dictionary["start"]; levels: Dictionary["levels"] };
type Option = { code: string; label: string };

// One form, four questions. It works as a plain form without JavaScript;
// with it, the service groups show which exams have a syllabus as soon as a
// level and commission are chosen, so nobody is led into an empty exam.
export function ProfileForm({
  lang,
  labels,
  levels,
  provinces,
  groups,
  available,
  initial,
  today,
}: {
  lang: Lang;
  labels: Labels;
  levels: LevelCode[];
  provinces: Option[];
  groups: Option[];
  available: Availability;
  initial: ProfileState["values"];
  today: string;
}) {
  const [state, action, pending] = useActionState(saveProfile, { errors: {}, values: initial });
  const [level, setLevel] = useState(state.values.level);
  const [province, setProvince] = useState(state.values.province);
  const [group, setGroup] = useState(state.values.group);
  const [examDate, setExamDate] = useState(state.values.examDate);
  const errorSummary = useRef<HTMLDivElement>(null);
  const s = labels.start;
  const errors = state.errors;
  const errorKeys = Object.keys(errors) as (keyof ProfileState["errors"])[];
  useEffect(() => {
    if (Object.keys(state.errors).length) errorSummary.current?.focus();
  }, [state]);
  const hasSyllabus = (group: string) =>
    available.some((a) => a.level === level && a.province === province && a.group === group);
  const provinceHasAny = (code: string) =>
    available.some((a) => a.level === level && a.province === code);
  const errorText = (key: keyof ProfileState["errors"]) => {
    const code = errors[key];
    if (!code) return null;
    return key === "examDate"
      ? s.errors[code as "invalid" | "past" | "too_far"]
      : s.errors[key as "level" | "province" | "group"];
  };
  const legend = (n: number, text: string) => (
    <legend className="mb-3 flex items-baseline gap-3 font-display text-title">
      <span aria-label={fmt(s.step, { n }, lang)} className="code w-5 shrink-0">
        {localDigits(n, lang)}
      </span>
      {text}
    </legend>
  );

  return (
    <form
      action={action}
      className="space-y-6 pb-4 lg:pt-10"
      noValidate
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      {/* A failed Server Action must not reset the selected radio controls.
          A successful save redirects and replaces this form. */}
      {errorKeys.length ? (
        <div
          ref={errorSummary}
          role="alert"
          tabIndex={-1}
          aria-labelledby="profile-error-title"
          data-testid="profile-error-summary"
          className="rounded-lg border border-danger bg-danger-tint p-4"
        >
          <h2 id="profile-error-title" className="text-lead text-danger">
            {s.errorSummary}
          </h2>
          <ul className="mt-2 space-y-1 text-small">
            {errorKeys.map((key) => (
              <li key={key}>
                <a
                  href={`#${key === "examDate" ? "examDate" : `profile-${key}`}`}
                  className="link text-danger"
                >
                  {errorText(key)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset aria-describedby={errors.level ? "err-level" : undefined}>
        {legend(1, s.levelLegend)}
        <div className="grid gap-3 sm:grid-cols-2">
          {levels.map((code, index) => (
            <label key={code} className="choice">
              <input
                id={index === 0 ? "profile-level" : undefined}
                type="radio"
                name="level"
                value={code}
                checked={level === code}
                onChange={() => setLevel(code)}
                aria-describedby={errors.level ? "err-level" : undefined}
                required
              />
              <span>
                <Tag tone={code}>{labels.levels[code].short}</Tag>
                <span className="mt-2 block text-small text-ink-2">{s[code]}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.level ? (
          <p id="err-level" className="mt-2 text-small font-semibold text-danger">
            {errorText("level")}
          </p>
        ) : null}
      </fieldset>

      <hr className="border-line" />
      <fieldset aria-describedby={`hint-province${errors.province ? " err-province" : ""}`}>
        {legend(2, s.provinceLegend)}
        <p id="hint-province" className="-mt-1 mb-3 text-small text-ink-3">
          {s.provinceHint}
        </p>
        <label className="sr-only" htmlFor="profile-province">
          {s.provinceLegend}
        </label>
        <select
          id="profile-province"
          name="province"
          value={province}
          onChange={(event) => setProvince(event.target.value)}
          aria-invalid={errors.province ? true : undefined}
          aria-describedby={`hint-province${errors.province ? " err-province" : ""}`}
          className="field w-full"
          required
        >
          <option value="">{s.errors.province}</option>
          {provinces.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
              {level ? ` · ${provinceHasAny(option.code) ? s.available : s.notAvailable}` : ""}
            </option>
          ))}
        </select>
        {province ? (
          <div className="mt-3 space-y-2 text-small text-ink-2">
            <p>{provinces.find((option) => option.code === province)?.label}</p>
            {level ? (
              <Tag tone={provinceHasAny(province) ? "outline" : "warning"}>
                {provinceHasAny(province) ? s.available : s.notAvailable}
              </Tag>
            ) : null}
          </div>
        ) : null}
        {errors.province ? (
          <p id="err-province" className="mt-2 text-small font-semibold text-danger">
            {errorText("province")}
          </p>
        ) : null}
      </fieldset>

      <hr className="border-line" />
      <fieldset aria-describedby={`hint-group${errors.group ? " err-group" : ""}`}>
        {legend(3, s.groupLegend)}
        <p id="hint-group" className="-mt-1 mb-3 text-small text-ink-3">
          {s.groupHint}
        </p>
        <label className="sr-only" htmlFor="profile-group">
          {s.groupLegend}
        </label>
        <select
          id="profile-group"
          name="group"
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          aria-invalid={errors.group ? true : undefined}
          aria-describedby={`hint-group${errors.group ? " err-group" : ""}`}
          className="field w-full"
          required
        >
          <option value="">{s.errors.group}</option>
          {groups.map((option) => {
            const ready = level && province ? hasSyllabus(option.code) : null;
            return (
              <option key={option.code} value={option.code}>
                {option.label}
                {ready === null ? "" : ` · ${ready ? s.available : s.notAvailable}`}
              </option>
            );
          })}
        </select>
        {group ? (
          <div className="mt-3 space-y-2 text-small text-ink-2">
            <p>{groups.find((option) => option.code === group)?.label}</p>
            {level && province ? (
              <Tag tone={hasSyllabus(group) ? "outline" : "warning"}>
                {hasSyllabus(group) ? s.available : s.notAvailable}
              </Tag>
            ) : null}
          </div>
        ) : null}
        {errors.group ? (
          <p id="err-group" className="mt-2 text-small font-semibold text-danger">
            {errorText("group")}
          </p>
        ) : null}
      </fieldset>

      <hr className="border-line" />
      <fieldset>
        {legend(4, s.examDateLegend)}
        <label htmlFor="examDate" className="sr-only">
          {s.examDateLegend}
        </label>
        <input
          id="examDate"
          name="examDate"
          type="date"
          min={today}
          value={examDate}
          onChange={(event) => setExamDate(event.target.value)}
          aria-invalid={errors.examDate ? true : undefined}
          aria-describedby={`hint-date${errors.examDate ? " err-date" : ""}`}
          className="field max-w-xs"
        />
        <p id="hint-date" className="mt-2 text-small text-ink-3">
          {s.examDateHint}
        </p>
        {errors.examDate ? (
          <p id="err-date" className="mt-1 text-small font-semibold text-danger">
            {errorText("examDate")}
          </p>
        ) : null}
      </fieldset>

      <div className="ruled space-y-3">
        <button type="submit" className="btn btn-primary btn-block sm:w-auto" disabled={pending}>
          {pending ? s.saving : s.save}
        </button>
        <p className="text-caption text-ink-3">{s.privacy}</p>
      </div>
    </form>
  );
}
