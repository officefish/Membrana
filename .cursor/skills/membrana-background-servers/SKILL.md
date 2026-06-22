---
name: membrana-background-servers
description: >-
  Routes Membrana work to the correct background-* NestJS package: office (integrations),
  media (blobs, trends), cabinet (auth, membranes). Use when adding Claude/Linear,
  WAV storage, sample library API, pairing, or choosing which background server to extend.
  Do NOT use for packages/services/* analyzer services or client-only IndexedDB fallback.
---

# Membrana background servers

Канон: [`docs/BACKGROUND_SERVERS.md`](../../../docs/BACKGROUND_SERVERS.md).

## Three roles — do not mix

| Package | Port | Stateful | Put here |
|---------|------|----------|----------|
| `@membrana/background-office` | 3000 | No | Claude, Linear, GitHub integrations |
| `@membrana/background-media` | 3010 | Yes | Sample blobs, trends templates, `deviceId` scope |
| `@membrana/background-cabinet` | 3020 | Yes | Users, membranes, nodes, keys, tariffs |

## Hard boundaries

**Never in office:** WAV storage, user templates, media blobs.  
**Never in media:** Anthropic/Linear integration logic.  
**Never import** `@membrana/core`, `@membrana/agenda`, or `apps/client` from `background-*`.

## Dev commands

```bash
yarn office:dev          # :3000
yarn media:db:up && yarn media:migrate && yarn media:dev   # :3010
yarn cabinet:db:up && yarn cabinet:migrate && yarn cabinet:dev  # :3020
yarn office:verify-swagger
yarn media:verify-swagger
```

## Client without media

Client works with IndexedDB/localStorage fallback until `remote-server` mode.

## Output

Recommend target package + why; list forbidden cross-boundary imports if user proposal violates table.
