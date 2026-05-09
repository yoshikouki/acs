import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { RuntimeSettings, SettingsSource } from "../shared/types";

const DEFAULT_AGENT_BASE_URL = "http://127.0.0.1:1455";

type StoredSettings = {
  agentBaseUrl?: string;
};

export function getStorageDir(): string {
  return process.env.ACS_HOME ?? join(homedir(), ".acs");
}

export function getSettingsPath(): string {
  return join(getStorageDir(), "settings.json");
}

export function getLogsDir(): string {
  return join(getStorageDir(), "logs");
}

export async function ensureStorage(): Promise<void> {
  await mkdir(getLogsDir(), { recursive: true });
}

export async function readRuntimeSettings(): Promise<RuntimeSettings> {
  const envValue = process.env.ACS_AGENT_BASE_URL;
  if (envValue) {
    return {
      agentBaseUrl: normalizeAgentBaseUrl(envValue),
      source: "env"
    };
  }

  const stored = await readStoredSettings();
  if (stored?.agentBaseUrl) {
    return {
      agentBaseUrl: normalizeAgentBaseUrl(stored.agentBaseUrl),
      source: "file"
    };
  }

  return {
    agentBaseUrl: normalizeAgentBaseUrl(DEFAULT_AGENT_BASE_URL),
    source: "default"
  };
}

export async function writeRuntimeSettings(input: {
  agentBaseUrl: string;
}): Promise<RuntimeSettings> {
  if (process.env.ACS_AGENT_BASE_URL) {
    throw new Error("ACS_AGENT_BASE_URL is set, so persistent settings are read-only.");
  }

  const agentBaseUrl = normalizeAgentBaseUrl(input.agentBaseUrl);
  const settings: StoredSettings = { agentBaseUrl };

  const path = getSettingsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  await rename(`${path}.tmp`, path);

  return {
    agentBaseUrl,
    source: "file"
  };
}

function normalizeAgentBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Agent base URL must be an absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Agent base URL must use http or https.");
  }

  if (!isLoopbackHost(url.hostname) && process.env.ACS_ALLOW_REMOTE_AGENT !== "1") {
    throw new Error("Agent base URL must be loopback unless ACS_ALLOW_REMOTE_AGENT=1 is set.");
  }

  url.hash = "";
  return trimTrailingSlash(url.toString());
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "::1" || host === "127.0.0.1" || host.startsWith("127.");
}

async function readStoredSettings(): Promise<StoredSettings | null> {
  try {
    const raw = await readFile(getSettingsPath(), "utf8");
    return JSON.parse(raw) as StoredSettings;
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
