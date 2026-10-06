"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { Moon, Sun } from "@/components/Icons";
import type { Dictionary } from "@/lib/i18n";

type Theme = "light" | "dark";

const STORAGE_KEY = "agrilok:theme";

let clientTheme: Theme | null = null;
const themeListeners = new Set<() => void>();

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "dark" || explicit === "light") return explicit;
  return systemTheme();
}

function getClientTheme(): Theme {
  clientTheme ??= readTheme();
  return clientTheme;
}

function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function publishTheme(theme: Theme): void {
  clientTheme = theme;
  for (const listener of themeListeners) listener();
}

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function ThemeToggle({ t }: { t: Pick<Dictionary, "theme"> }) {
  const theme = useSyncExternalStore(subscribeTheme, getClientTheme, () => "light");
  const button = useRef<HTMLButtonElement>(null);

  // The script in the page's head sets the saved theme before the first paint.
  // In development React's Strict Mode remounts the page once and resets
  // <html> to the attributes it knows about, which drops that one; this puts
  // it back before anything is painted. In production it changes nothing.
  // (Next.js guide "How to prevent flash before hydration".)
  useLayoutEffect(() => {
    const saved = storedTheme();
    if (saved && document.documentElement.dataset.theme !== saved) {
      document.documentElement.dataset.theme = saved;
      publishTheme(saved);
    }
  }, []);

  const next = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? t.theme.switchToDark : t.theme.switchToLight;
  const Icon = theme === "dark" ? Sun : Moon;

  function apply() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Kept for this visit only.
    }
    publishTheme(next);
  }

  function toggle() {
    const root = document.documentElement;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || typeof document.startViewTransition !== "function") {
      apply();
      return;
    }
    // The new theme opens as a circle from the middle of this button to the
    // farthest corner of the window, so the change is seen to come from the
    // control that asked for it (the animation is in globals.css).
    const rect = button.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth;
    const y = rect ? rect.top + rect.height / 2 : 0;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-r", `${radius}px`);
    root.setAttribute("data-theme-change", "");
    const done = () => {
      root.removeAttribute("data-theme-change");
      for (const name of ["--theme-x", "--theme-y", "--theme-r"]) root.style.removeProperty(name);
    };
    try {
      // flushSync: the icon must already be the new one when the browser takes
      // its picture of the new page.
      document.startViewTransition(() => flushSync(apply)).finished.then(done, done);
    } catch {
      done();
      apply();
    }
  }

  return (
    <button
      ref={button}
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label={label}
      title={label}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-2 transition-colors duration-[var(--motion-press)] hover:border-ink hover:bg-sunken hover:text-ink"
    >
      {/* Keyed by theme, so the icon is a new element each time and turns in. */}
      <Icon key={theme} className="theme-icon h-5 w-5" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
