"use client";

import { useEffect, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type Theme } from "./theme";

// The theme lives on <html data-theme>, so React reads it from there.
function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function savedTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, getTheme, () => "dark");
  const next: Theme = theme === "light" ? "dark" : "light";

  // Until someone picks a theme here, keep following the device setting.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    function follow() {
      if (!savedTheme()) {
        document.documentElement.dataset.theme = media.matches ? "light" : "dark";
      }
    }
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing can block storage; the switch still works for this visit.
    }
  }

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="absolute right-4 top-4 z-50 grid h-10 w-10 cursor-pointer place-items-center rounded-full text-muted transition-[color,transform] duration-300 hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong active:scale-[.92] sm:right-6 sm:top-6"
      onClick={toggle}
    >
      {/* A sun in dark mode and a moon in light mode. CSS picks the icon, so it is
          right from the first paint, before React has loaded. */}
      <svg
        aria-hidden="true"
        className="h-[18px] w-[18px] light:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg
        aria-hidden="true"
        className="h-[18px] w-[18px] dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
