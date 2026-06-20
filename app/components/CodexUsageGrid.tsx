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

type MonthLabel = {
  column: number;
  label: string;
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

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

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

function buildMonthLabels(cells: UsageCell[]): MonthLabel[] {
  return cells
    .filter((_, index) => index % rowCount === 0)
    .map((cell, index, columns) => {
      const month = monthFormatter.format(parseDate(cell.date));
      const previousMonth =
        index > 0 ? monthFormatter.format(parseDate(columns[index - 1].date)) : null;

      return {
        column: index + 1,
        label: month === previousMonth ? "" : month,
      };
    })
    .filter((month) => month.label);
}

export function CodexUsageGrid() {
  const cells = buildCells();
  const monthLabels = buildMonthLabels(cells);

  return (
    <section className="mt-20 w-[800px] max-w-[90vw]">
      <div className="mt-6">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:gap-6">
          <h2 className="text-[1.45rem] font-semibold leading-none text-[#f2f2f2]">
            Codex Activity
          </h2>

          <p className="shrink-0 text-[1rem] leading-none text-[#f2f2f2]">
            Daily
          </p>
        </div>

        <div className="mt-7 overflow-x-auto pb-1">
          <div className="w-max">
            <div className="grid grid-flow-col grid-rows-7 gap-[7px]">
              {cells.map((cell) => (
                <div
                  key={cell.id}
                  className={`h-4 w-4 rounded-[4px] ${levelClasses[cell.level]}`}
                  aria-label={`${cell.date}: ${cell.tokens} Codex tokens`}
                  title={`${cell.date}: ${compactNumberFormatter.format(
                    cell.tokens,
                  )} tokens`}
                />
              ))}
            </div>

            <div
              className="mt-4 grid gap-[7px] text-[1rem] font-medium leading-none text-[#686868]"
              style={{ gridTemplateColumns: `repeat(${columnCount}, 1rem)` }}
            >
              {monthLabels.map((month) => (
                <span
                  key={`${month.label}-${month.column}`}
                  className="col-span-4"
                  style={{ gridColumnStart: month.column }}
                >
                  {month.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
