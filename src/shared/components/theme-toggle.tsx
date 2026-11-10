"use client";

import { IconMoon, IconSun } from "@/shared/components/ui/brand-icons";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The theme script in the root layout has already applied the stored or system theme to <html> before hydration. */
function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }
}

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const toggle = () => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem("anops:theme", next);
    } catch {
      // Private mode or blocked storage: the theme still changes for this visit.
    }
    listeners.forEach((listener) => listener());
  };

  if (!hydrated) {
    return <div className="h-10 w-10 rounded-[var(--radius-control)]" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="relative h-10 w-10 rounded-[var(--radius-control)] flex items-center justify-center hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
    </button>
  );
}
