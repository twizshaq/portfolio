import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "claude-code-usage.json");

// Claude Code writes one JSONL transcript per session under <config dir>/projects.
const configDirs = [
  ...(process.env.CLAUDE_CONFIG_DIR || "").split(",").filter(Boolean),
  path.join(os.homedir(), ".claude"),
  path.join(os.homedir(), ".config", "claude"),
];

function todayIsoDate() {
  return localIsoDate(new Date());
}

function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function findTranscripts(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findTranscripts(entryPath);
      }

      return entry.name.endsWith(".jsonl") ? [entryPath] : [];
    }),
  );

  return nested.flat();
}

async function readClaudeCodeUsage() {
  const projectDirs = [...new Set(configDirs.map((dir) => path.resolve(dir, "projects")))];
  const transcripts = [
    ...new Set((await Promise.all(projectDirs.map(findTranscripts))).flat()),
  ];
  const tokensByDate = new Map();
  // A single API response can be written to the transcript more than once.
  const seenResponses = new Set();

  for (const transcript of transcripts) {
    const lines = readline.createInterface({
      input: createReadStream(transcript, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });

    for await (const line of lines) {
      if (!line.includes('"usage"')) {
        continue;
      }

      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      const usage = entry?.message?.usage;
      const timestamp = entry?.timestamp;
      if (!usage || typeof timestamp !== "string") {
        continue;
      }

      const responseKey = `${entry.message.id ?? ""}:${entry.requestId ?? ""}`;
      if (responseKey !== ":" && seenResponses.has(responseKey)) {
        continue;
      }
      seenResponses.add(responseKey);

      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const tokens =
        (usage.input_tokens || 0) +
        (usage.output_tokens || 0) +
        (usage.cache_creation_input_tokens || 0) +
        (usage.cache_read_input_tokens || 0);
      const day = localIsoDate(date);

      tokensByDate.set(day, (tokensByDate.get(day) ?? 0) + tokens);
    }
  }

  return { transcriptCount: transcripts.length, tokensByDate };
}

async function readPreviousBuckets() {
  try {
    const previous = JSON.parse(await readFile(outputPath, "utf8"));
    return Array.isArray(previous?.dailyUsageBuckets) ? previous.dailyUsageBuckets : [];
  } catch {
    return [];
  }
}

const { transcriptCount, tokensByDate } = await readClaudeCodeUsage();

// Claude Code deletes old transcripts (30 days by default), so keep days already
// in the snapshot instead of letting them drop out of the grid.
for (const bucket of await readPreviousBuckets()) {
  if (typeof bucket?.startDate !== "string" || !Number.isFinite(bucket?.tokens)) {
    continue;
  }

  tokensByDate.set(
    bucket.startDate,
    Math.max(bucket.tokens, tokensByDate.get(bucket.startDate) ?? 0),
  );
}

const dailyUsageBuckets = [...tokensByDate]
  .filter(([, tokens]) => tokens > 0)
  .map(([startDate, tokens]) => ({ startDate, tokens: Math.round(tokens) }))
  .sort((a, b) => a.startDate.localeCompare(b.startDate));

const usage = {
  updatedAt: dailyUsageBuckets.at(-1)?.startDate || todayIsoDate(),
  dailyUsageBuckets,
  summary: {
    peakDailyTokens: Math.max(0, ...dailyUsageBuckets.map((bucket) => bucket.tokens)),
  },
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(usage, null, 2)}\n`);

console.log(
  `Wrote ${usage.dailyUsageBuckets.length} daily Claude Code usage buckets from ${transcriptCount} transcripts to ${path.relative(
    projectRoot,
    outputPath,
  )}`,
);
