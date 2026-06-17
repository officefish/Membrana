# Hackathon log — Day H1 (partial)

**Дата:** 2026-06-17  
**Эпики:** `db-h1a`–`db-h1c` ✅, `db-h2b-scenario-runtime` ✅, `db-h2c-mic-journal` ✅

## H1a — core contracts

Пакет `@membrana/core` — `src/contracts/device-board/`:

| Модуль | Содержание |
|--------|------------|
| `device-kind.ts` | `DeviceKind`, `DEVICE_KINDS` |
| `socket-type.ts` | `SocketType`, `SocketSpec`, `isValidSocketConnection`, `D0_SOCKET_TYPES` |
| `node-kind.ts` | `PluginNodeKind` |
| `signal-graph.ts` | `SignalGraph`, nodes/edges |
| `scenario-graph.ts` | `ScenarioGraph`, блоки, системные ветки, subgraph |
| `device-scenario.ts` | `DeviceScenarioDocument` v1, `parseDeviceScenarioDocument` |

Тесты: `device-board.test.ts` (4 pass).  
`yarn workspace @membrana/core` typecheck + test + lint — OK.

## H1b — board shell

Пакет `@membrana/device-board` + `apps/client`:

| Компонент | Содержание |
|-----------|------------|
| `@xyflow/react` | зависимость пакета |
| `DeviceBoardModeProvider` / `useDeviceBoardMode` | вход/выход board mode |
| `DeviceBoardShell` | split layout, вкладки Signal / Scenario, Run/Stop (stub) |
| `BoardFlowCanvas` | XYFlow + placeholder-ноды |
| `BoardInspector` | боковая панель выбранной ноды |
| `DeviceBoardModule` | lazy-модуль `id: device-board` |
| `App.tsx` | переключение Dashboard ↔ shell |

`yarn workspace @membrana/device-board` + `@membrana/client` typecheck + build — OK.

## H1c — graph serialize

Пакет `@membrana/device-board` — `src/graph/`:

| Модуль | Содержание |
|--------|------------|
| `connection-validation.ts` | `isValidBoardConnection` → `isValidSocketConnection` (core) |
| `serialize-signal-graph.ts` | XYFlow ↔ `SignalGraph` |
| `serialize-scenario-subgraph.ts` | XYFlow ↔ `ScenarioSubgraph` (main loop) |
| `build-device-scenario.ts` | сборка `DeviceScenarioDocument` v1 |
| `export-device-scenario.ts` | export JSON + `meta.hash` (SHA-256) |
| `validate-pre-run.ts` | pre-run validation перед Run |
| `DeviceBoardGraphProvider` | controlled graph state, Export JSON |

Тесты: `graph-serialize.test.ts` (5 pass).  
UI: кнопки **Export JSON**, **Run** (pre-run check; runtime — H2b).

## H2b — scenario runtime

Пакет `@membrana/device-board` — `src/runtime/`:

| Модуль | Содержание |
|--------|------------|
| `ScenarioRuntime` | `load` / `start` / `stop`; initial → main loop |
| `exec-subgraph.ts` | проход exec-цепочки подграфа |
| `block-executor.ts` | блоки H2b: mic, stream, journal, chunk, FFT |
| `host.ts` | порты `ScenarioRuntimeHost` |
| `DeviceBoardGraphProvider` | Run/Stop + состояние runtime |
| `createScenarioRuntimeHost` (client) | journal + stub mic/FFT |

Демо-граф: **Initial** (mic→stream→journal), **Main loop** (chunk→FFT→journal→loop).  
Тесты: `scenario-runtime.test.ts` (2 pass) + graph (5 pass).

## Следующий шаг

`db-h2c-mic-journal` — реальный mic → chunks → trends FFT → journal.

## H2c — mic → journal

`apps/client/src/modules/device-board/`:

| Модуль | Содержание |
|--------|------------|
| `scenarioMicJournalBridge.ts` | mic (coordinator или own stream), chunk 5–30 с, journal |
| `analyzeChunkTrendsFft.ts` | `collectMetricSamples` + `classifyTrends` (DRONE_TIGHT) |
| `createScenarioRuntimeHost` | делегирует в bridge |

Журнал main loop (J1): track + report с `detection`, `clipId`, `durationSec`, `templateId`, `rawLevel`, `detectorId: trends-fft`.

## H4 — alarm loop

`packages/device-board/src/runtime/` + `apps/client`:

| Модуль | Содержание |
|--------|------------|
| `detection-front.ts` | фронт детекции main → alarm (V3) |
| `scenario-runtime.ts` | `runAlarmLoop` до `isQuietEnough` |
| `alarm-constants.ts` | RMS-порог 0.018 (B5) |
| `scenarioMicJournalBridge.ts` | `evaluateSoundLevel` (LiveSampler + `frameLoudness`) |
| UI | вкладка Alarm loop, демо-граф evaluate → journal → loop |

Журнал alarm (J2): `scenario:alarm`, `device-board:alarm`, `rawLevel`, `detectorId: sound-level`.

## H3a — onStop trigger

| Модуль | Содержание |
|--------|------------|
| `scenario-runtime.ts` | `stop(user\|system)` → onStop subgraph → teardown |
| `initial-board-state.ts` | journal → handle-disconnect |
| UI | вкладка **On stop**; `beforeunload` + выход из board mode |

## H3b — onDisconnect trigger

| Модуль | Содержание |
|--------|------------|
| `scenario-runtime.ts` | `handleDisconnect` → onDisconnect; `handleReconnect` → initial (T4) |
| `scenarioMicJournalBridge.ts` | `watchConnection` — track `ended` / stream null |
| UI | вкладка **On disconnect** |

## H3c — subgraph / functions v1

| Модуль | Содержание |
|--------|------------|
| `serialize-scenario-function.ts` | `scenario.functions[]` в export |
| `subgraph-ref.ts` | ссылка subgraph-блок → function id |
| `validate-function-depth.ts` | depth ≤ 1, валидные refs |
| `block-executor.ts` | runtime `subgraph` → `runSubgraphOnce(fn)` |
| Main loop | `subgraph(Capture+Detect)` → journal |

## H2a — JSON import + round-trip

| Модуль | Содержание |
|--------|------------|
| `hydrate-board-from-document.ts` | document → все канвасы XYFlow |
| `import-device-scenario.ts` | parse + version gate |
| `device-board-shell.tsx` | Import JSON (file picker) |
| Тесты | export → import → `validatePreRun` (17 pass) |

## H2d — cabinet sync

| Модуль | Содержание |
|--------|------------|
| `background-media` | `GET/PUT /v1/devices/:deviceId/device-scenario` |
| `deviceScenarioPersistence.ts` | client: localStorage + media (LWW по `updatedAt`) |
| `apps/cabinet` | раздел **Device board**, fullscreen editor, sync save |

## Следующий шаг

Деплой на сервер → smoke cabinet + client paired → `yarn hackathon:close`.
