"use client";

import { useEffect, useState } from "react";

export function StJosephDeoModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <p
        role="button"
        tabIndex={0}
        className="max-w-[600px] cursor-pointer outline-none transition-transform active:scale-[.99] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-strong"
        onClick={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        St. Joseph DEO: Interactive Heritage Discovery Platform
      </p>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-overlay px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setIsOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="st-joseph-deo-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-[800px] overflow-y-auto rounded-[24px] border border-transparent bg-transparent p-5 shadow-[0_30px_90px_rgba(0,0,0,0.0)] sm:max-h-[calc(100dvh-3rem)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  id="st-joseph-deo-title"
                  className="pr-20 text-[1.35rem] font-semibold"
                >
                  St. Joseph DEO
                </p>
                <p className="mt-1 text-sm text-subtle">
                  Interactive Heritage Discovery Platform
                </p>
              </div>
              <button
                type="button"
                className="absolute right-5 top-5 cursor-pointer rounded-full px-3 py-1 text-sm text-muted transition hover:text-strong active:scale-[.95]"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-5 text-sm leading-6 text-soft">
              <p>
                St. Joseph DEO is an interactive platform for exploring local
                heritage through digital storytelling, location-based discovery,
                and accessible educational content.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] border border-line bg-surface p-4">
                  <p className="font-semibold text-strong">Discovery</p>
                  <p className="mt-2 text-muted">
                    Guides visitors through meaningful places, stories, and
                    cultural context.
                  </p>
                </div>
                <div className="rounded-[18px] border border-line bg-surface p-4">
                  <p className="font-semibold text-strong">Education</p>
                  <p className="mt-2 text-muted">
                    Turns historical material into approachable learning
                    experiences.
                  </p>
                </div>
                <div className="rounded-[18px] border border-line bg-surface p-4">
                  <p className="font-semibold text-strong">Interaction</p>
                  <p className="mt-2 text-muted">
                    Uses simple digital tools to make exploration more engaging.
                  </p>
                </div>
              </div>

              <p className="text-muted">
                Built as a concept for preserving and presenting community
                heritage in a format that feels useful on phones, tablets, and
                public displays.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
