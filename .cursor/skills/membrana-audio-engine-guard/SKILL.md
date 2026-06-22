---
name: membrana-audio-engine-guard
description: >-
  Enforces Membrana audio integration rules: no direct Web Audio API outside
  @membrana/audio-engine-service; MembranaRegistry for modules/plugins. Use when
  editing apps/client modules, plugins, microphone, detectors, or any audio capture/
  playback code. Do NOT use for pure math in packages/services without DOM (membrana
  mathematician path) or background-server HTTP APIs.
---

# Membrana audio engine guard

Канон: `docs/ARCHITECTURE.md` §1b, `.cursorrules`, [`docs/INTEGRATIONS_STRATEGY.md`](../../../docs/INTEGRATIONS_STRATEGY.md) for new ML/DSP detectors.

## Forbidden outside `@membrana/audio-engine-service`

- `new AudioContext()`
- `navigator.mediaDevices.getUserMedia(...)`
- `createAnalyser()`, `decodeAudioData()`, `enumerateDevices()`

**Reference integration:** `apps/client/src/modules/microphone/`.

## Module / plugin registration

Use **`MembranaRegistry`** from `@membrana/agenda` only:

- `MembranaRegistry.registerLazyModule({...})`
- `MembranaRegistry.registerPlugin(moduleId, factory())`
- `MembranaRegistry.finalizeRegistration()`

**Forbidden:** direct `useMembranaStore.getState().registerModule(...)`.

See `docs/MODULE_AND_PLUGIN_UI.md` §0, `docs/ARCHITECTURE.md` §1c.

## Before editing client modules/plugins

1. Read catalog prompt: `docs/catalog/client/registry.json` → `promptPath` for the module/plugin.
2. Run `yarn catalog:verify-client` after catalog contract changes.

## Services layer

- DSP **pure functions** in `packages/services/*` — no React, no DOM, no Web Audio.
- Analyzers depend on foundation (e.g. `audio-engine`), not other analyzers.
- New detectors: read `INTEGRATIONS_STRATEGY.md` — prefer tier 0 local → own server → external API.

## Checklist (PR)

- [ ] No forbidden Web Audio imports in modules/plugins/other services
- [ ] Registry path used for new module/plugin
- [ ] Headless CI without mic device is OK; note manual mic test in DoD for audio UI

## vesnin branch

Changes to `audio-engine` core, `MembranaRegistry`, or `@membrana/core` contracts → branch **`vesnin`**, Teamlead LGTM.
