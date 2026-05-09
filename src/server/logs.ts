import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AccessLogEntry } from "../shared/types";
import { ensureStorage, getLogsDir } from "./config";

export async function appendAccessLog(entry: AccessLogEntry): Promise<void> {
  await ensureStorage();
  await appendFile(getAccessLogPath(), `${JSON.stringify(entry)}\n`, "utf8");
}

export async function readRecentAccessLogs(limit = 100): Promise<AccessLogEntry[]> {
  try {
    const raw = await readFile(getAccessLogPath(), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as AccessLogEntry)
      .reverse();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function getAccessLogPath(): string {
  return join(getLogsDir(), "access.jsonl");
}

