"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";

import { switchExam } from "@/app/actions";
import type { Availability, ExamContext } from "@/lib/contracts";
import type { Dictionary } from "@/lib/i18n";

// Change level, commission or service group in place, from any study page. It
// lives in the exam bar's disclosure and nowhere else, so there is one place
// to change the exam, not two.
//
// Three labelled native selects and one button. Native, because the lists are
// short (2, 8 and 13 options) and a phone's own picker is the control every
// student already knows; a button, because a select that navigated as soon as
// it changed would move a keyboard or screen-reader user to another exam while
// they were still reading the options.
//
// It is a plain form posting to a Server Action, so it also works before
// JavaScript loads or without it. With JavaScript it adds one thing: it says
// whether the exam being chosen has a syllabus in the library, before the
// student commits to it.

export type SwitcherOption = { value: string; code: string; label: string };

export type SwitcherLabels = {
  context: Dictionary["context"];
  level: string;
  province: string;
  group: string;
  available: string;
  notAvailable: string;
  cancel: string;
};

const noop = () => () => {};

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
      {pending ? busy : idle}
    </button>
  );
}

export function ExamSwitcher({
  current,
  levels,
  provinces,
  groups,
  available,
  saveDefault,
  labels,
}: {
  /** The exam on screen, as select values. */
  current: { level: string; province: string; group: string };
  levels: SwitcherOption[];
  provinces: SwitcherOption[];
  groups: SwitcherOption[];
  available: Availability;
  /** Whether "make this my exam" starts ticked: yes when the student is on their own exam. */
  saveDefault: boolean;
  labels: SwitcherLabels;
}) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const [level, setLevel] = useState(current.level);
  const [province, setProvince] = useState(current.province);
  const [group, setGroup] = useState(current.group);
  // The availability line is announced only after the student changes a
  // choice, not on every page that happens to contain this form.
  const [touched, setTouched] = useState(false);
  // Availability depends on all three choices together. Before hydration a
  // changed select cannot update it, so it is shown only once it can be kept true.
  const live = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const c = labels.context;

  const levelCode = levels.find((option) => option.value === level)?.code as
    ExamContext["level"] | undefined;
  const has = (p: string, g: string) =>
    available.some((a) => a.level === levelCode && a.province === p && a.group === g);
  const provinceHasAny = (p: string) =>
    available.some((a) => a.level === levelCode && a.province === p);
  const inLibrary = has(province, group);
  const suffix = (ok: boolean) => (live ? ` · ${ok ? labels.available : labels.notAvailable}` : "");

  // Cancel leaves the exam exactly as it was: the choices go back, the panel
  // closes, and focus returns to the control that opened it.
  function cancel() {
    setLevel(current.level);
    setProvince(current.province);
    setGroup(current.group);
    setTouched(false);
    const details = form.current?.closest("details");
    if (details) {
      details.open = false;
      details.querySelector("summary")?.focus();
    }
  }

  // Escape cancels from anywhere in the disclosure, its toggle included. On an
  // open select it only closes the list, as it does everywhere else.
  useEffect(() => {
    const details = form.current?.closest("details");
    if (!details) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !details!.open) return;
      if (event.target instanceof HTMLSelectElement) return;
      form.current?.reset();
      details!.open = false;
      details!.querySelector("summary")?.focus();
    }
    details.addEventListener("keydown", onKeyDown);
    return () => details.removeEventListener("keydown", onKeyDown);
  }, []);

  const select = (
    name: string,
    label: string,
    value: string,
    onChange: (next: string) => void,
    options: SwitcherOption[],
    note: (option: SwitcherOption) => string,
  ) => (
    <div className="min-w-0">
      <label htmlFor={`${id}-${name}`} className="mb-1.5 block text-small font-semibold">
        {label}
      </label>
      <select
        id={`${id}-${name}`}
        name={name}
        value={value}
        onChange={(event) => {
          onChange(event.currentTarget.value);
          setTouched(true);
        }}
        className="field"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {note(option)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      ref={form}
      action={switchExam}
      className="space-y-4"
      data-testid="exam-switcher"
      onReset={() => {
        setLevel(current.level);
        setProvince(current.province);
        setGroup(current.group);
        setTouched(false);
      }}
    >
      <input type="hidden" name="from" value={pathname} />
      <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        {select("level", labels.level, level, setLevel, levels, () => "")}
        {select("province", labels.province, province, setProvince, provinces, (option) =>
          suffix(provinceHasAny(option.code)),
        )}
        {select("group", labels.group, group, setGroup, groups, (option) =>
          suffix(has(province, option.code)),
        )}
      </div>

      <p
        role={touched ? "status" : undefined}
        data-testid="exam-availability"
        className={`min-h-[1.65em] text-small ${inLibrary ? "text-ink-2" : "font-semibold text-warning"}`}
      >
        {live ? (inLibrary ? c.inLibrary : c.notInLibrary) : null}
      </p>

      <label className="flex cursor-pointer items-start gap-3 text-small">
        <input
          type="checkbox"
          name="save"
          defaultChecked={saveDefault}
          className="mt-1 h-5 w-5 shrink-0"
          aria-describedby={`${id}-save-hint`}
        />
        <span>
          <span className="block font-semibold text-ink">{c.saveAsMine}</span>
          <span id={`${id}-save-hint`} className="block text-ink-2">
            {c.saveAsMineHint}
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SubmitButton idle={c.openExam} busy={c.opening} />
        <button type="button" className="btn btn-secondary" onClick={cancel}>
          {labels.cancel}
        </button>
        <Link
          href={`/start?level=${levelCode ?? ""}&province=${province}&group=${group}`}
          className="link inline-flex min-h-11 items-center text-small"
        >
          {c.fullSetup}
        </Link>
      </div>
      <p className="text-caption text-ink-3">{c.keptApart}</p>
    </form>
  );
}
