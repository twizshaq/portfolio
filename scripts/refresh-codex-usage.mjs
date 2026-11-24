import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "codex-usage.json");
// The ChatGPT desktop app bundles the Codex CLI; use it when `codex` isn't on PATH.
const bundledCodexBin = "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex";
const codexBin =
  process.env.CODEX_BIN || (existsSync(bundledCodexBin) ? bundledCodexBin : "codex");
const requestTimeoutMs = Number(process.env.CODEX_USAGE_TIMEOUT_MS || 30000);
const codexStateDir = process.env.CODEX_HOME || path.join(process.env.HOME || "", ".codex");

const localUsageQuery = `
WITH entries AS (
  SELECT
    date(ts, 'unixepoch', 'localtime') AS start_date,
    substr(
      feedback_log_body,
      instr(feedback_log_body, 'turn_id=') + 8,
      instr(substr(feedback_log_body, instr(feedback_log_body, 'turn_id=') + 8), ' ') - 1
    ) AS turn_id,
    CAST(
      substr(
        feedback_log_body,
        instr(feedback_log_body, 'total_usage_tokens=') + 19,
        instr(
          substr(feedback_log_body, instr(feedback_log_body, 'total_usage_tokens=') + 19),
          ' '
        ) - 1
      ) AS INTEGER
    ) AS tokens
  FROM logs
  WHERE target = 'codex_core::session::turn'
    AND feedback_log_body LIKE '%post sampling token usage%'
), turns AS (
  SELECT start_date, turn_id, MAX(tokens) AS tokens
  FROM entries
  GROUP BY start_date, turn_id
)
SELECT start_date AS startDate, SUM(tokens) AS tokens
FROM turns
GROUP BY start_date
ORDER BY start_date;
`;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeBuckets(buckets) {
  return Array.isArray(buckets)
    ? buckets
        .filter(
          (bucket) =>
            typeof bucket?.startDate === "string" &&
            Number.isFinite(bucket?.tokens),
        )
        .map((bucket) => ({
          startDate: bucket.startDate,
          tokens: Math.max(0, Math.round(bucket.tokens)),
        }))
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
    : [];
}

function normalizeUsage(result, localBuckets) {
  const remoteBuckets = normalizeBuckets(result?.dailyUsageBuckets);
  const latestRemoteDate = remoteBuckets.at(-1)?.startDate;
  // The account feed remains the source of truth; local logs only fill newer days it omits.
  const dailyUsageBuckets = [
    ...remoteBuckets,
    ...localBuckets.filter(
      (bucket) => !latestRemoteDate || bucket.startDate > latestRemoteDate,
    ),
  ];

  return {
    updatedAt: dailyUsageBuckets.at(-1)?.startDate || todayIsoDate(),
    dailyUsageBuckets,
    summary: {
      peakDailyTokens:
        result?.summary?.peakDailyTokens ??
        Math.max(0, ...dailyUsageBuckets.map((bucket) => bucket.tokens)),
    },
  };
}

async function newestCodexLogDatabase() {
  const entries = await readdir(codexStateDir, { withFileTypes: true });
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /^logs_\d+\.sqlite$/.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(codexStateDir, entry.name);
        return { filePath, modifiedAt: (await stat(filePath)).mtimeMs };
      }),
  );

  return candidates.sort((a, b) => b.modifiedAt - a.modifiedAt)[0]?.filePath;
}

function queryLocalUsage(databasePath) {
  return new Promise((resolve, reject) => {
    const child = spawn("sqlite3", ["-json", databasePath, localUsageQuery], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Local Codex usage query failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const rows = JSON.parse(stdout);
        resolve(normalizeBuckets(rows));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function readLocalUsage() {
  try {
    const databasePath = await newestCodexLogDatabase();
    // A missing or locked log database should never block the account-level export.
    return databasePath ? await queryLocalUsage(databasePath) : [];
  } catch (error) {
    console.warn(`Skipping local Codex usage fallback: ${error.message}`);
    return [];
  }
}

function readCodexUsage() {
  return new Promise((resolve, reject) => {
    const child = spawn(codexBin, ["app-server"], {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let buffer = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`Timed out after ${requestTimeoutMs}ms waiting for Codex usage.`));
    }, requestTimeoutMs);

    function finish(error, value) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      child.kill("SIGTERM");

      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    }

    function send(message) {
      child.stdin.write(`${JSON.stringify(message)}\n`);
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.stdout.on("data", (chunk) => {
      buffer += chunk;

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf("\n");

        if (!line) {
          continue;
        }

        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }

        if (message.id === 2) {
          if (message.error) {
            finish(new Error(message.error.message || "Codex usage read failed."));
          } else {
            finish(null, message.result);
          }
        }
      }
    });

    child.on("error", (error) => {
      finish(error);
    });

    child.on("exit", (code) => {
      if (!settled && code !== 0) {
        finish(
          new Error(
            `Codex app-server exited with code ${code}.${stderr ? `\n${stderr}` : ""}`,
          ),
        );
      }
    });

    send({
      id: 1,
      method: "initialize",
      params: {
        clientInfo: {
          name: "portfolio_codex_usage_exporter",
          title: "Portfolio Codex Usage Exporter",
          version: "0.1.0",
        },
        capabilities: {
          experimentalApi: true,
        },
      },
    });
    send({ method: "initialized", params: {} });
    send({ id: 2, method: "account/usage/read", params: null });
  });
}

const [remoteUsage, localUsage] = await Promise.all([readCodexUsage(), readLocalUsage()]);
const usage = normalizeUsage(remoteUsage, localUsage);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(usage, null, 2)}\n`);

console.log(
  `Wrote ${usage.dailyUsageBuckets.length} daily Codex usage buckets to ${path.relative(
    projectRoot,
    outputPath,
  )}`,
);
