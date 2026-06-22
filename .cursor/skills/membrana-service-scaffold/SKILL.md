---
name: membrana-service-scaffold
description: >-
  Scaffolds a new @membrana/*-service package in packages/services per docs/SERVICES.md.
  Use when user says /service, new service, foundation or analyzer service, or adding
  packages/services/*. Do NOT use for background-* NestJS servers (membrana-background-servers)
  or editing existing service business logic without scaffold intent.
---

# Membrana service scaffold

Канон: [`docs/SERVICES.md`](../../../docs/SERVICES.md), `.cursorrules` → `/service`.

## Layer choice

| Layer | Depends on | Example |
|-------|------------|---------|
| **foundation** | `@membrana/core` only | `audio-engine` |
| **analyzer** | core + foundation(s) | `fft-analyzer` → `audio-engine` |

Analyzers must **not** depend on other analyzers.

## Steps

1. Pick template: copy `packages/services/audio-engine` (foundation) or `fft-analyzer` (analyzer).
2. Create `packages/services/<name>/`:
   - `package.json` → `"name": "@membrana/<name>-service"`
   - `tsconfig.json`, `vite.config.ts`
   - `src/service.ts` — pure core, no React/DOM/Web Audio
   - `src/hooks.ts` — thin React wrapper
   - `src/types.ts`, `src/index.ts` — public API
3. Root `tsconfig.json` reference.
4. Client aliases: `apps/client/vite.config.ts`, `apps/client/tsconfig.app.json` → `@membrana/<name>-service`.
5. Row in [`packages/services/README.md`](../../../packages/services/README.md).
6. Request **LGTM** from Teamlead before merge.

## Verify

```bash
yarn workspace @membrana/<name>-service test
yarn turbo run lint typecheck --filter=@membrana/<name>-service
```

## Output

List created paths, layer (foundation/analyzer), and upstream dependencies.
