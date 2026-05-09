import { Hono } from "hono";
import { serveStatic } from "hono/bun";

import pkg from "../../package.json";
import { ensureStorage, getStorageDir, readRuntimeSettings, writeRuntimeSettings } from "./config";
import { appendAccessLog, readRecentAccessLogs } from "./logs";
import { proxyAgentRequest } from "./proxy";

const app = new Hono();

app.use("*", async (c, next) => {
  const startedAt = performance.now();
  await next();

  const durationMs = Math.round(performance.now() - startedAt);
  const userAgent = c.req.header("user-agent");

  void appendAccessLog({
    durationMs,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    time: new Date().toISOString(),
    ...(userAgent ? { userAgent } : {})
  }).catch((error) => {
    console.error("failed to append access log", error);
  });
});

app.get("/api/health", async (c) => {
  const settings = await readRuntimeSettings();
  return c.json({
    ok: true,
    service: "acs",
    settings,
    storageDir: getStorageDir(),
    uptimeSeconds: Math.round(process.uptime()),
    version: pkg.version
  });
});

app.get("/api/settings", async (c) => {
  const settings = await readRuntimeSettings();
  return c.json({
    settings,
    storageDir: getStorageDir(),
    writable: settings.source !== "env"
  });
});

app.put("/api/settings", async (c) => {
  const body = await c.req.json<{ agentBaseUrl?: string }>();
  if (!body.agentBaseUrl) {
    return c.json({ error: "agentBaseUrl is required." }, 400);
  }

  try {
    const settings = await writeRuntimeSettings({ agentBaseUrl: body.agentBaseUrl });
    return c.json({
      settings,
      storageDir: getStorageDir(),
      writable: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to write settings.";
    return c.json({ error: message }, 400);
  }
});

app.get("/api/logs/access", async (c) => {
  return c.json({
    entries: await readRecentAccessLogs()
  });
});

app.all("/agent", proxyAgentRequest);
app.all("/agent/*", proxyAgentRequest);

app.use("/assets/*", serveStatic({ root: "./dist/client" }));

app.get("*", async (c) => {
  const index = Bun.file("./dist/client/index.html");
  if (await index.exists()) {
    return c.html(await index.text());
  }

  return c.text("ACS client build is missing. Run `bun run build` first.", 404);
});

await ensureStorage();

const port = Number(process.env.ACS_PORT ?? "8787");
const hostname = process.env.ACS_HOST ?? "0.0.0.0";

Bun.serve({
  fetch: app.fetch,
  hostname,
  port
});

console.log(`ACS listening on http://${hostname}:${port}`);

