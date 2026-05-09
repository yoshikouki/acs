import { Activity, ExternalLink, RefreshCw, Save, Server } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AccessLogEntry, HealthResponse, SettingsResponse } from "../shared/types";
import { fetchAccessLogs, fetchHealth, fetchSettings, saveSettings } from "./api";

type LoadState = "idle" | "loading" | "ready" | "error";

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [agentBaseUrl, setAgentBaseUrl] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setMessage(null);
    try {
      const [nextHealth, nextSettings, nextLogs] = await Promise.all([
        fetchHealth(),
        fetchSettings(),
        fetchAccessLogs()
      ]);
      setHealth(nextHealth);
      setSettings(nextSettings);
      setAgentBaseUrl(nextSettings.settings.agentBaseUrl);
      setLogs(nextLogs.entries);
      setLoadState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load ACS status.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusText = useMemo(() => {
    if (loadState === "loading") return "Loading";
    if (loadState === "error") return "Needs attention";
    return health?.ok ? "Online" : "Offline";
  }, [health?.ok, loadState]);

  async function handleSave() {
    setMessage(null);
    try {
      const nextSettings = await saveSettings(agentBaseUrl);
      setSettings(nextSettings);
      setAgentBaseUrl(nextSettings.settings.agentBaseUrl);
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Agent Connection Server</span>
          <h1>ACS</h1>
        </div>
        <div className="header-actions">
          <a className="icon-button" href="/agent/" title="Open agent">
            <ExternalLink size={18} />
          </a>
          <button className="icon-button" type="button" onClick={load} title="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <section className="status-grid">
        <article className="metric-card">
          <Server size={18} />
          <div>
            <span>Status</span>
            <strong>{statusText}</strong>
          </div>
        </article>
        <article className="metric-card">
          <Activity size={18} />
          <div>
            <span>Uptime</span>
            <strong>{formatUptime(health?.uptimeSeconds ?? 0)}</strong>
          </div>
        </article>
        <article className="metric-card wide">
          <span>Storage</span>
          <strong>{settings?.storageDir ?? "~/.acs"}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Agent Target</h2>
          <span>{settings?.settings.source ?? "default"}</span>
        </div>
        <div className="settings-row">
          <input
            aria-label="Agent base URL"
            disabled={settings?.writable === false}
            onChange={(event) => setAgentBaseUrl(event.target.value)}
            spellCheck={false}
            type="url"
            value={agentBaseUrl}
          />
          <button className="primary-button" disabled={settings?.writable === false} onClick={handleSave} type="button">
            <Save size={18} />
            <span>Save</span>
          </button>
        </div>
        {message ? <p className="message">{message}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Recent Access</h2>
          <button className="text-button" type="button" onClick={load}>
            Refresh
          </button>
        </div>
        <div className="log-list">
          {logs.length === 0 ? (
            <p className="empty-state">No requests yet.</p>
          ) : (
            logs.slice(0, 12).map((entry) => (
              <div className="log-row" key={`${entry.time}-${entry.method}-${entry.path}-${entry.durationMs}`}>
                <time>{formatTime(entry.time)}</time>
                <code>{entry.method}</code>
                <span>{entry.status}</span>
                <strong>{entry.path}</strong>
                <small>{entry.durationMs} ms</small>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

