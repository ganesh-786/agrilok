// Study progress, kept on this device only (localStorage). No account, no
// server, nothing that identifies the student (docs/privacy.md).
//
// Progress is keyed by syllabus, and a syllabus belongs to exactly one level,
// so Level 4 answers can never count towards Level 7. Every read and write
// survives a blocked or full storage (private windows, some Android browsers):
// progress then simply is not kept, and the screens say so.

import { useSyncExternalStore } from "react";

import type { OptionId } from "@/lib/contracts";
import { nepalToday } from "@/lib/dates";
import { EMPTY_PROGRESS, recordAnswer, type SyllabusProgress } from "@/lib/practice";

const KEY = "agrilok:progress:v1";
const EVENT = "agrilok:progress";

type Store = { v: 1; bySyllabus: Record<string, SyllabusProgress> };
const EMPTY_STORE: Store = { v: 1, bySyllabus: {} };

let cachedRaw: string | null = null;
let cachedStore: Store = EMPTY_STORE;
let available = true;

function read(): Store {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    available = false;
    return cachedStore;
  }
  if (raw === cachedRaw) return cachedStore;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Store) : EMPTY_STORE;
    cachedStore = parsed && parsed.v === 1 && parsed.bySyllabus ? parsed : EMPTY_STORE;
  } catch {
    cachedStore = EMPTY_STORE;
  }
  return cachedStore;
}

function write(store: Store): void {
  try {
    const raw = JSON.stringify(store);
    window.localStorage.setItem(KEY, raw);
    cachedRaw = raw;
    cachedStore = store;
    available = true;
  } catch {
    available = false;
    cachedStore = store;
  }
  window.dispatchEvent(new Event(EVENT));
}

function update(syllabusId: string, change: (current: SyllabusProgress) => SyllabusProgress): void {
  const store = read();
  const current = store.bySyllabus[syllabusId] ?? EMPTY_PROGRESS;
  write({ v: 1, bySyllabus: { ...store.bySyllabus, [syllabusId]: change(current) } });
}

export function saveAnswer(
  syllabusId: string,
  questionId: string,
  choice: OptionId | null,
  correct: boolean,
): void {
  update(syllabusId, (p) => ({
    ...p,
    answers: {
      ...p.answers,
      [questionId]: recordAnswer(
        p.answers[questionId],
        choice,
        correct,
        nepalToday(),
        new Date().toISOString(),
      ),
    },
  }));
}

export function markStudied(syllabusId: string, topicId: string): void {
  update(syllabusId, (p) => ({
    ...p,
    studied: { ...p.studied, [topicId]: new Date().toISOString() },
    lastTopicId: topicId,
  }));
}

/** Save or unsave a question. Returns whether it is now saved. */
export function toggleSaved(syllabusId: string, questionId: string): boolean {
  const saved = (read().bySyllabus[syllabusId] ?? EMPTY_PROGRESS).saved.includes(questionId);
  update(syllabusId, (p) => ({
    ...p,
    saved: saved ? p.saved.filter((id) => id !== questionId) : [...p.saved, questionId],
  }));
  return !saved;
}

export function resetProgress(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(REPORTS_KEY);
  } catch {
    // Nothing was stored.
  }
  cachedRaw = null;
  cachedStore = EMPTY_STORE;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The progress for one syllabus. Null during server rendering and the first
 * paint, so screens show a skeleton rather than a wrong empty state.
 */
export function useProgress(syllabusId: string): SyllabusProgress | null {
  return useSyncExternalStore(
    subscribe,
    () => read().bySyllabus[syllabusId] ?? EMPTY_PROGRESS,
    () => null,
  );
}

/** False when this browser will not keep anything (private mode, storage full). */
export function useStorageAvailable(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      read();
      return available;
    },
    () => null,
  );
}

// --- Issue reports, kept until the review queue exists --------------------------------

const REPORTS_KEY = "agrilok:reports:v1";

export type Report = { targetId: string; reason: string; note: string; at: string };

export function saveReport(report: Omit<Report, "at">): boolean {
  try {
    const raw = window.localStorage.getItem(REPORTS_KEY);
    const list = raw ? (JSON.parse(raw) as Report[]) : [];
    list.push({ ...report, at: new Date().toISOString() });
    window.localStorage.setItem(REPORTS_KEY, JSON.stringify(list.slice(-50)));
    return true;
  } catch {
    return false;
  }
}
