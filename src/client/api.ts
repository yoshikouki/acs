import type { AccessLogsResponse, HealthResponse, SettingsResponse } from "../shared/types";

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/api/health");
}

export async function fetchSettings(): Promise<SettingsResponse> {
  return fetchJson<SettingsResponse>("/api/settings");
}

export async function saveSettings(agentBaseUrl: string): Promise<SettingsResponse> {
  return fetchJson<SettingsResponse>("/api/settings", {
    body: JSON.stringify({ agentBaseUrl }),
    headers: {
      "content-type": "application/json"
    },
    method: "PUT"
  });
}

export async function fetchAccessLogs(): Promise<AccessLogsResponse> {
  return fetchJson<AccessLogsResponse>("/api/logs/access");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : "Request failed.";
    throw new Error(message);
  }

  return body as T;
}

