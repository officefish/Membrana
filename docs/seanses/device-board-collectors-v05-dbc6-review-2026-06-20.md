# DBC6: Teamlead review — Device-Board Collectors v0.5

**Дата:** 2026-06-20  
**Reviewer:** Vesnin (Teamlead)  
**Эпик:** `device-board-collectors-v05` · Issue [#130](https://github.com/officefish/Membrana/issues/130)  
**Ветка:** `feat/device-board-get-device-stop-runtime` (uncommitted, PR pending)

---

## LGTM

**Статус:** LGTM с оговоркой — merge PR + browser smoke (см. ниже).

---

## CI (2026-06-20)

```bash
yarn turbo run lint typecheck test build \
  --filter=@membrana/core \
  --filter=@membrana/device-board \
  --filter=@membrana/client \
  --continue
```

| Пакет | lint | typecheck | test | build |
|-------|------|-----------|------|-------|
| `@membrana/core` | ✓ | ✓ | 29 | ✓ |
| `@membrana/device-board` | ✓ | ✓ | 186 | ✓ |
| `@membrana/client` | ✓ | ✓ | 144 | ✓ |

Исправлено в review: `prefer-const` в `collect-node-executor.ts`.

---

## Definition of Done (эпик)

| Критерий | Статус |
|----------|--------|
| DBC0: core contracts (RecorderRef, SpectralAnalyserRef, event pin, CollectorConfig, node kinds) | ✓ |
| DBC1: GetRecorder, GetSpectralAnalyser, GetFFTFrame отдельно | ✓ |
| DBC2: host singletons, append/flush, multicast registry | ✓ |
| DBC3: CollectSamples/CollectFftFrames, event-out, sidebar config, serialize | ✓ |
| DBC4: NewTrack, NewFftTrendsAnalysis → journal/trends | ✓ |
| DBC5: event dispatch on flush, E2E test, cookbook MDX | ✓ |
| DBC6: formal review, CI green | ✓ |
| Smoke: Collect → terminal на client с микрофоном | ⏳ manual (checklist ниже) |
| Merge в `main` | ⏳ PR pending |

---

## Архитектурный чеклист

- [x] Границы пакетов: core ← device-board ← client; без циклов
- [x] Web Audio только через `audio-engine-service` (bridge)
- [x] Policy на singleton — **не** реализована (frozen v0.6)
- [x] GetFFTFrame — отдельный transform-узел (не bypass)
- [x] Exec tick ≠ flush event (`event-dispatch.ts`)
- [x] Collect config только на узле (sidebar), не на singleton
- [x] Terminal inputs — `AudioSampleRefList` / `FftFrameRefList`
- [x] `DEVICE_BOARD_CONCEPT.md` §16 collectors

---

## Затронутые пути

**`@membrana/core`:** `socket-type.ts`, `scenario-node-kind.ts`, `collector-config.ts`, `scenario-pin-kind.ts`, `scenario-graph.ts`

**`@membrana/device-board`:** graph (get-recorder, get-spectral-analyser, collect-*, new-track, new-fft-trends), runtime (collector-sessions, collect-node-executor, event-dispatch, resolve-ref-list), UI (sidebar collectorConfig, event pin styling)

**`@membrana/client`:** `scenarioMicJournalBridge.ts`, `createScenarioRuntimeHost.ts`

**`apps/docs`:** `device-board/cookbooks/collect-to-terminal.mdx`

---

## Browser smoke checklist (ручная)

1. `yarn workspace @membrana/client dev` + paired device + микрофон
2. On start: `StartStreaming(mic)`
3. onMainTick: `GetSample → GetFFTFrame → CollectFftFrames` + parallel `CollectSamples`
4. Event-out → `NewFftTrendsAnalysis` / `NewTrack`; `queueCapacity=3` для быстрого flush
5. LiveJournal: track row + trends-fft report после flush
6. StopStreaming — collector registry reset

Headless CI не блокирует LGTM (регламент Музыканта).

---

## Out of scope (подтверждено)

- Policy API на singleton
- Host FFT bypass GetFFTFrame
- Multicast multi-collector QA
- Continuous ring-buffer recorder

---

## Роли (кратко)

**[Teamlead — Vesnin]:** LGTM. Merge-order DBC0→DBC6 соблюдён в одной feature-ветке. PR + smoke — финальный gate.

**[Структурщик — Ozhegov]:** Host ports чистые; collectStore + event dispatch без утечки в agenda.

**[Математик — Dynin]:** Trends path через `analyzeChunkTrendsFft` + DRONE_TIGHT defaults; FFT via `fft-analyzer-service`.

**[Музыкант]:** Concat PCM (StreamWindowCollector pattern); capture через LiveSampler.

**[Верстальщик — Rodchenko]:** Event square handle, collector sidebar — по DESIGN tokens.

---

## Следующие шаги

1. Commit + PR из `feat/device-board-get-device-stop-runtime`
2. Browser smoke по checklist
3. `yarn task:close-github` (Issue #130) после merge
