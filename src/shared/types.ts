export type SettingsSource = "default" | "env" | "file";

export type RuntimeSettings = {
  agentBaseUrl: string;
  source: SettingsSource;
};

export type HealthResponse = {
  ok: true;
  service: "acs";
  version: string;
  storageDir: string;
  settings: RuntimeSettings;
  uptimeSeconds: number;
};

export type SettingsResponse = {
  storageDir: string;
  settings: RuntimeSettings;
  writable: boolean;
};

export type AccessLogEntry = {
  time: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userAgent?: string;
};

export type AccessLogsResponse = {
  entries: AccessLogEntry[];
};

