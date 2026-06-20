import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "codex-usage.json");
const codexBin = process.env.CODEX_BIN || "codex";
const requestTimeoutMs = Number(process.env.CODEX_USAGE_TIMEOUT_MS || 30000);

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUsage(result) {
  const dailyUsageBuckets = Array.isArray(result?.dailyUsageBuckets)
    ? result.dailyUsageBuckets
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

const usage = normalizeUsage(await readCodexUsage());

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(usage, null, 2)}\n`);

console.log(
  `Wrote ${usage.dailyUsageBuckets.length} daily Codex usage buckets to ${path.relative(
    projectRoot,
    outputPath,
  )}`,
);
