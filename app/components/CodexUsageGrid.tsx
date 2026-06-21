"use client";

import { Squircle } from "@squircle-js/react";
import { useState, type PointerEvent } from "react";
import codexUsage from "@/public/codex-usage.json";

type CodexUsageSnapshot = {
  updatedAt: string;
  dailyUsageBuckets: Array<{
    startDate: string;
    tokens: number;
  }>;
  summary?: {
    peakDailyTokens?: number | null;
  };
};

type UsageCell = {
  date: string;
  id: string;
  level: number;
  tokens: number;
};

type ActiveUsagePopup = {
  date: string;
  id: string;
  tokens: number;
  x: number;
  y: number;
};

const snapshot = codexUsage as CodexUsageSnapshot;
const columnCount = 49;
const rowCount = 7;

const levelClasses = [
  "bg-[#161616]",
  "bg-[#18304b]",
  "bg-[#1d4166]",
  "bg-[#245f95]",
  "bg-[#3f9df4]",
];

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});

const longMonthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});

const compactTokenFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
});

function getOrdinalSuffix(day: number) {
  const lastTwoDigits = day % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatDisplayDate(value: string) {
  const date = parseDate(value);
  const month = longMonthFormatter.format(date);
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();

  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
}

function formatTokenUsage(tokens: number) {
  return `${compactTokenFormatter.format(tokens)} ${tokens === 1 ? "token" : "tokens"}`;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function startOfWeek(date: Date) {
  return addDays(date, -date.getUTCDay());
}

function getUsageByDate() {
  return new Map(
    snapshot.dailyUsageBuckets.map((bucket) => [
      bucket.startDate,
      Math.max(0, bucket.tokens),
    ]),
  );
}

function getLevel(tokens: number, peakTokens: number) {
  if (tokens <= 0 || peakTokens <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil((tokens / peakTokens) * 4));
}

function buildCells(): UsageCell[] {
  const usageByDate = getUsageByDate();
  const peakTokens =
    snapshot.summary?.peakDailyTokens ??
    Math.max(0, ...snapshot.dailyUsageBuckets.map((bucket) => bucket.tokens));
  const latestDate = parseDate(snapshot.updatedAt);
  const gridStart = addDays(startOfWeek(latestDate), -(columnCount - 1) * rowCount);

  return Array.from({ length: columnCount * rowCount }, (_, index) => {
    const column = Math.floor(index / rowCount);
    const row = index % rowCount;
    const date = formatDate(addDays(gridStart, column * rowCount + row));
    const tokens = usageByDate.get(date) ?? 0;

    return {
      date,
      id: `daily-${date}`,
      level: getLevel(tokens, peakTokens),
      tokens,
    };
  });
}

function buildMonthLabels(cells: UsageCell[]): string[] {
  return cells
    .filter((_, index) => index % rowCount === 0)
    .map((cell, index, columns) => {
      const month = monthFormatter.format(parseDate(cell.date));
      const previousMonth =
        index > 0 ? monthFormatter.format(parseDate(columns[index - 1].date)) : null;

      return index === 0 || month === previousMonth ? "" : month;
    })
    .filter(Boolean);
}

export function CodexUsageGrid() {
  const [activePopup, setActivePopup] = useState<ActiveUsagePopup | null>(null);
  const cells = buildCells();
  const monthLabels = buildMonthLabels(cells);

  function showPopup(cell: UsageCell, element: HTMLElement) {
    const rect = element.getBoundingClientRect();

    setActivePopup({
      date: cell.date,
      id: cell.id,
      tokens: cell.tokens,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }

  function handlePointerEnter(
    cell: UsageCell,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    // Only trigger hover state for pointing devices (e.g. physical mice)
    if (event.pointerType === "mouse") {
      showPopup(cell, event.currentTarget);
    }
  }

  function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") {
      setActivePopup(null);
    }
  }

  return (
    <section className="mt-20 w-[800px] max-w-[90vw]">
      <div className="mt-6">
        <div className="flex items-end justify-between gap-5 sm:gap-6">
          <h2 className="text-[1.45rem] font-semibold leading-none text-[#f2f2f2]">
            Codex Activity
          </h2>

          <p className="shrink-0 text-[1rem] leading-none text-[#f2f2f2]">
            Daily
          </p>
        </div>

        <div
          className="codex-scrollbar-hidden mt-7 overflow-x-auto pb-1"
          dir="rtl"
        >
          <div className="w-max" dir="ltr">
            <div className="grid grid-flow-col grid-rows-7 gap-[7px]">
              {cells.map((cell) => (
                <button
                  id={cell.id}
                  key={cell.id}
                  type="button"
                  aria-describedby={
                    activePopup?.id === cell.id ? `${cell.id}-popup` : undefined
                  }
                  aria-label={`${formatDisplayDate(cell.date)}: ${formatTokenUsage(
                    cell.tokens,
                  )}`}
                  className="group h-4 w-4 touch-manipulation border-0 bg-transparent p-0 outline-none cursor-default"
                  onPointerEnter={(event) => handlePointerEnter(cell, event)}
                  onPointerLeave={handlePointerLeave}
                >
                  <Squircle
                    aria-hidden="true"
                    className={`h-4 w-4 transition duration-150 group-hover:ring-1 group-hover:ring-[#f2f2f2]/0 ${levelClasses[cell.level]}`}
                    cornerRadius={4}
                    cornerSmoothing={1}
                    height={16}
                    width={16}
                  />
                </button>
              ))}
            </div>

            <div
              className="mt-4 grid text-center text-[1rem] font-medium leading-none text-[#686868]"
              style={{
                gridTemplateColumns: `repeat(${monthLabels.length}, minmax(0, 1fr))`,
              }}
            >
              {monthLabels.map((month, index) => (
                <span
                  key={`${index}-${month}`} 
                  className="min-w-0"
                >
                  {month}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activePopup ? (
        <div
          id={`${activePopup.id}-popup`}
          role="tooltip"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+0.7rem)] rounded-[16px] border border-[#2d2d2d] bg-[#111111] px-3 py-2 text-left shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
          style={{ left: activePopup.x, top: activePopup.y }}
        >
          <p className="whitespace-nowrap text-[0.82rem] font-semibold leading-none text-[#f2f2f2]">
            {formatDisplayDate(activePopup.date)}
          </p>
          <p className="mt-2 whitespace-nowrap text-[0.78rem] leading-none text-[#9a9a9a]">
            {formatTokenUsage(activePopup.tokens)}
          </p>
        </div>
      ) : null}
    </section>
  );
}