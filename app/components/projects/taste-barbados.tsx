"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import tasteBarbadosIcon from "@/public/projects/taste-barbados-icon.png";

export function TasteBarbadosModal() {
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
        className="flex max-w-[600px] cursor-pointer items-center gap-2 outline-none transition-transform active:scale-[.99] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-strong"
        onClick={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <Image
          src={tasteBarbadosIcon}
          alt=""
          width={22}
          height={22}
          className="shrink-0"
        />
        Taste Barbados: Food Spot Discovery Platform
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
            aria-labelledby="taste-barbados-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-[800px] overflow-y-auto rounded-[24px] border border-transparent bg-transparent p-5 shadow-[0_30px_90px_rgba(0,0,0,0.0)] sm:max-h-[calc(100dvh-3rem)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  id="taste-barbados-title"
                  className="pr-20 text-[1.35rem] font-semibold"
                >
                  Taste Barbados
                </p>
                <p className="mt-1 text-sm text-subtle">
                  Food Spot Discovery Platform
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
                Taste Barbados helps people find restaurants, bakeries, food
                trucks, rum shops, cafés and more across Barbados. It also gives
                food businesses an easy way to get listed and keep their menu,
                hours and specials up to date.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] border border-line bg-surface p-4">
                  <p className="font-semibold text-strong">Explore</p>
                  <p className="mt-2 text-muted">Search, filter and browse food spots on a map, with voice search and saved favourites.</p>
                </div>
                <div className="rounded-[18px] border border-line bg-surface p-4">
                  <p className="font-semibold text-strong">Owner dashboard</p>
                  <p className="mt-2 text-muted">Owners manage their menu, opening hours, daily specials and holiday schedules in one place.</p>
                </div>
                <div className="rounded-[18px] border border-line bg-surface p-4">
                  <p className="font-semibold text-strong">AI menu scanning</p>
                  <p className="mt-2 text-muted">Snap a photo of a menu and the dishes and prices are pulled straight into the listing.</p>
                </div>
                <div className="rounded-[18px] border border-line bg-surface p-4">
                  <p className="font-semibold text-strong">Business onboarding</p>
                  <p className="mt-2 text-muted">Owners apply to be listed, and a review team approves listings, ownership transfers, closures and reopenings.</p>
                </div>
                <div className="rounded-[18px] border border-line bg-surface p-4">
                  <p className="font-semibold text-strong">Notifications</p>
                  <p className="mt-2 text-muted">Users get an alert when new spots open, and owners and applicants get updates by email.</p>
                </div>
                <div className="rounded-[18px] border border-line bg-surface p-4">
                  <p className="font-semibold text-strong">Launch</p>
                  <p className="mt-2 text-muted">A Coming Soon page collects launch sign-ups while business applications are already open.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Next.js</span>
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">React</span>
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">TypeScript</span>
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Tailwind CSS</span>
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Supabase</span>
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Mapbox</span>
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">OpenAI</span>
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Resend</span>
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Vercel</span>
              </div>

              <a
                href="https://tastebarbados.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-strong underline underline-offset-4 transition hover:opacity-70"
              >
                Visit tastebarbados.app
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
