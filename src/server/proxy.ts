import type { Context } from "hono";

import { readRuntimeSettings } from "./config";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

export async function proxyAgentRequest(c: Context): Promise<Response> {
  const settings = await readRuntimeSettings();
  const upstreamUrl = buildUpstreamUrl(c.req.url, settings.agentBaseUrl);
  const init: RequestInit & { duplex?: "half" } = {
    headers: copyRequestHeaders(c.req.raw.headers),
    method: c.req.method,
    redirect: "manual"
  };

  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    init.body = c.req.raw.body;
    init.duplex = "half";
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown upstream error.";
    return Response.json(
      {
        detail,
        error: "Agent upstream is unavailable."
      },
      { status: 502 }
    );
  }

  return new Response(upstreamResponse.body, {
    headers: copyResponseHeaders(upstreamResponse.headers),
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText
  });
}

function buildUpstreamUrl(requestUrlValue: string, agentBaseUrl: string): string {
  const requestUrl = new URL(requestUrlValue);
  const upstreamUrl = new URL(agentBaseUrl);
  const agentPath = requestUrl.pathname.replace(/^\/agent\/?/, "/");
  upstreamUrl.pathname = joinUrlPath(upstreamUrl.pathname, agentPath);
  upstreamUrl.search = requestUrl.search;
  return upstreamUrl.toString();
}

function joinUrlPath(basePath: string, agentPath: string): string {
  const base = basePath === "/" ? "" : basePath.replace(/\/$/, "");
  const path = agentPath.startsWith("/") ? agentPath : `/${agentPath}`;
  return `${base}${path}`;
}

function copyRequestHeaders(headers: Headers): Headers {
  const next = new Headers();
  for (const [name, value] of headers.entries()) {
    const lowerName = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerName) || lowerName === "host") {
      continue;
    }
    next.set(name, value);
  }
  return next;
}

function copyResponseHeaders(headers: Headers): Headers {
  const next = new Headers();
  for (const [name, value] of headers.entries()) {
    const lowerName = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerName)) {
      continue;
    }
    next.set(name, value);
  }
  return next;
}
