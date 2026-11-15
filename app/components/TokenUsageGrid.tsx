"use client";

import { Squircle } from "@squircle-js/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import claudeCodeUsage from "@/public/claude-code-usage.json";
import codexUsage from "@/public/codex-usage.json";

type UsageSnapshot = {
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
  claudeCodeTokens: number;
  codexTokens: number;
  date: string;
  id: string;
  level: number;
  tokens: number;
};

type ActiveUsagePopup = UsageCell & {
  x: number;
  y: number;
};

const codexSnapshot = codexUsage as UsageSnapshot;
const claudeCodeSnapshot = claudeCodeUsage as UsageSnapshot;
const columnCount = 49;
const rowCount = 7;

// Use charcoal for zero tokens, then progressively brighter shades of the site pink.
// Apply each fill directly so it doesn't depend on generated CSS classes.
const levelColors = [
  "#161616", "#411127", "#601533",
  "#81193f", "#a31d4d", "#c6235d",
  "#e92770", "#ff297c", "#ff619f",
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

function getUsageByDate(snapshot: UsageSnapshot) {
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

  // Spread lower counts across more shades so peak days don't flatten the grid.
  const intensity = Math.sqrt(Math.min(1, tokens / peakTokens));
  return Math.max(1, Math.ceil(intensity * (levelColors.length - 1)));
}

function buildCells(): UsageCell[] {
  const codexByDate = getUsageByDate(codexSnapshot);
  const claudeCodeByDate = getUsageByDate(claudeCodeSnapshot);
  const allDates = new Set([...codexByDate.keys(), ...claudeCodeByDate.keys()]);
  const peakTokens = Math.max(
    0,
    ...[...allDates].map(
      (date) => (codexByDate.get(date) ?? 0) + (claudeCodeByDate.get(date) ?? 0),
    ),
  );
  const latestDate = parseDate(
    [codexSnapshot.updatedAt, claudeCodeSnapshot.updatedAt].sort().at(-1)!,
  );
  const gridStart = addDays(startOfWeek(latestDate), -(columnCount - 1) * rowCount);

  return Array.from({ length: columnCount * rowCount }, (_, index) => {
    const column = Math.floor(index / rowCount);
    const row = index % rowCount;
    const date = formatDate(addDays(gridStart, column * rowCount + row));
    const codexTokens = codexByDate.get(date) ?? 0;
    const claudeCodeTokens = claudeCodeByDate.get(date) ?? 0;
    const tokens = codexTokens + claudeCodeTokens;

    return {
      claudeCodeTokens,
      codexTokens,
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

export function TokenUsageGrid() {
  const [activePopup, setActivePopup] = useState<ActiveUsagePopup | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edgeMask, setEdgeMask] = useState<string>();
  const cells = buildCells();
  const monthLabels = buildMonthLabels(cells);

  useEffect(() => {
    const scroller = scrollRef.current;
    const content = scroller?.firstElementChild;
    if (!scroller || !content) return;

    function updateEdges() {
      if (!scroller) return;
      const overflow = scroller.scrollWidth - scroller.clientWidth;
      // The grid starts at the right edge, so scrolling left gives a negative offset.
      const offset = -scroller.scrollLeft;
      const fadeLeft = overflow - offset > 1;
      const fadeRight = offset > 1 && overflow > 1;
      const leftEdge = fadeLeft ? "transparent, black 16px" : "black";
      const rightEdge = fadeRight ? "black calc(100% - 16px), transparent" : "black";

      setEdgeMask(fadeLeft || fadeRight ? `linear-gradient(to right, ${leftEdge}, ${rightEdge})` : undefined);
    }

    const observer = new ResizeObserver(updateEdges);
    observer.observe(scroller);
    observer.observe(content);
    scroller.addEventListener("scroll", updateEdges, { passive: true });
    updateEdges();

    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", updateEdges);
    };
  }, []);

  function showPopup(cell: UsageCell, element: HTMLElement) {
    const rect = element.getBoundingClientRect();

    setActivePopup({
      ...cell,
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
          <h2 className="text-[1.45rem] font-semibold leading-none text-strong">
            Token Activity
          </h2>

          <p className="shrink-0 text-[1rem] leading-none text-strong">
            Daily
          </p>
        </div>

        <div
          ref={scrollRef}
          className="token-scrollbar-hidden mt-7 overflow-x-auto pb-1"
          dir="rtl"
          style={{ maskImage: edgeMask, WebkitMaskImage: edgeMask }}
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
                  aria-label={`${formatDisplayDate(cell.date)}: Codex ${formatTokenUsage(
                    cell.codexTokens,
                  )}, Claude Code ${formatTokenUsage(
                    cell.claudeCodeTokens,
                  )}, total ${formatTokenUsage(cell.tokens)}`}
                  className="group h-4 w-4 touch-manipulation border-0 bg-transparent p-0 outline-none cursor-default"
                  onPointerEnter={(event) => handlePointerEnter(cell, event)}
                  onPointerLeave={handlePointerLeave}
                >
                  <Squircle
                    aria-hidden="true"
                    className="h-4 w-4 transition duration-150 group-hover:ring-1 group-hover:ring-strong/0"
                    style={{ backgroundColor: levelColors[cell.level] }}
                    cornerRadius={4}
                    cornerSmoothing={1}
                    height={16}
                    width={16}
                  />
                </button>
              ))}
            </div>

            <div
              className="mt-4 grid text-center text-[1rem] font-medium leading-none text-faint"
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
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+0.7rem)] rounded-[16px] border border-line bg-popover px-3 py-2 text-left shadow-[0_14px_40px_var(--shadow)]"
          style={{ left: activePopup.x, top: activePopup.y }}
        >
          <p className="whitespace-nowrap text-[0.82rem] font-semibold leading-none text-strong">
            {formatDisplayDate(activePopup.date)}
          </p>
          <dl className="mt-2.5 grid grid-cols-[auto_auto] gap-x-4 gap-y-1.5 whitespace-nowrap text-[0.78rem] leading-none">
            <dt className="text-subtle">Codex</dt>
            <dd className="text-right tabular-nums text-subtle">
              {formatTokenUsage(activePopup.codexTokens)}
            </dd>
            <dt className="text-subtle">Claude Code</dt>
            <dd className="text-right tabular-nums text-subtle">
              {formatTokenUsage(activePopup.claudeCodeTokens)}
            </dd>
            <dt className="mt-0.5 border-t border-line pt-1.5 font-semibold text-strong">
              Total
            </dt>
            <dd className="mt-0.5 border-t border-line pt-1.5 text-right font-semibold tabular-nums text-strong">
              {formatTokenUsage(activePopup.tokens)}
            </dd>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
