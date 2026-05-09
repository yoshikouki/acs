# ACS

ACS (Agent Client Server) exposes a local agent service through a small Bun + Hono server with a React client.

The first target is a Raspberry Pi on a private Tailscale network, where Safari on an iPhone can reach this server and send requests to a local Codex App Server.

## Stack

- Runtime: Bun
- API server: Hono
- Client: React, built as a browser app
- Storage: files under `~/.acs`
- Database: none

## Local Development

```sh
bun install
bun run typecheck
bun run build
bun run start
```

The server listens on `0.0.0.0:8787` by default so it can be reached through Tailscale from another device.

For client-only development:

```sh
bun run dev:client
```

## Configuration

ACS reads settings from `~/.acs/settings.json`. Environment variables can override runtime behavior:

| Variable | Default | Purpose |
| --- | --- | --- |
| `ACS_HOME` | `~/.acs` | Directory for settings and logs |
| `ACS_HOST` | `0.0.0.0` | Server bind host |
| `ACS_PORT` | `8787` | Server port |
| `ACS_AGENT_BASE_URL` | `http://127.0.0.1:1455` | Local agent upstream URL |
| `ACS_ALLOW_REMOTE_AGENT` | unset | Set to `1` to allow non-loopback upstream URLs |

The upstream URL is loopback-only by default so ACS does not accidentally become an open proxy when deployed on a reachable host.

## HTTP Surface

- `GET /api/health` returns server and upstream configuration status.
- `GET /api/settings` returns the effective settings.
- `PUT /api/settings` writes persistent settings to `~/.acs/settings.json`.
- `GET /api/logs/access` returns recent JSONL access log entries.
- `ANY /agent/*` proxies requests to the configured local agent.

Access logs are appended to `~/.acs/logs/access.jsonl`.

## Repository Notes

This repository is intended to be public. Do not commit `.env`, generated builds, local logs, or files from `~/.acs`.
