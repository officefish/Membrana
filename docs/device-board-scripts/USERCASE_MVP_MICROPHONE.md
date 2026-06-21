# UserCase MVP — microphone (device-board)

> **id:** `usercase-mvp-microphone`  
> **Статус:** **LGTM 2026-06-21** — UserCase выполнен через device-board runtime · [`USERCASE_MVP_MICROPHONE_LGTM.md`](./USERCASE_MVP_MICROPHONE_LGTM.md)  
> **Канон:** [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §16.5  
> **Main loop:** MakeRecordingPolicy + MakeFftTrendsPolicy → gate → track + `trends-fft/v0.1` report  
> **Дальше:** [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](../prompts/DEVICE_BOARD_POST_USERCASE_ROADMAP.md)

Когда persist сбрасывает граф, доска раньше откатывалась к D0-заглушкам (`select-microphone`, `write-journal`). С **v0.8** bundled usercase — дефолт в `@membrana/device-board`; JSON ниже — для ручного re-import.

---

## Файлы (bundle)

| # | Обработчик UI | branch | JSON |
|---|---------------|--------|------|
| 1 | **On connect** | `onConnect` | [`usercase-mvp-microphone/01-onConnect.json`](./usercase-mvp-microphone/01-onConnect.json) |
| 2 | **On start** | `initial` | [`usercase-mvp-microphone/02-onStart.json`](./usercase-mvp-microphone/02-onStart.json) |
| 3 | **onMainTick** | `main` | [`usercase-mvp-microphone/03-onMainTick.json`](./usercase-mvp-microphone/03-onMainTick.json) |
| 4 | **onAlarmTick** | `alarm` | [`usercase-mvp-microphone/04-onAlarmTick.json`](./usercase-mvp-microphone/04-onAlarmTick.json) |
| 5 | **On stop** | `onStop` | [`usercase-mvp-microphone/05-onStop.json`](./usercase-mvp-microphone/05-onStop.json) |
| 6 | **On disconnect** | `onDisconnect` | [`usercase-mvp-microphone/06-onDisconnect.json`](./usercase-mvp-microphone/06-onDisconnect.json) |

Те же JSON дублируются в корень `device-board-scripts/` (`device-scenario-microphone-*.json`) для старых ссылок.

Пересборка:

```bash
yarn usercase:build-mvp-microphone
```

После сборки embedded-документ попадает в `@membrana/device-board` и используется как **дефолт** для новых пользователей microphone (без ручного import).

---

## Импорт на доску (ручной)

> **Не обязателен** для первого открытия: `@membrana/device-board` уже гидрирует этот usercase по умолчанию и сохраняет в localStorage / media-server при первом визите.

Если нужно **перезаписать** текущий граф (или восстановить после сбоя persist):

1. Hard refresh client (`vesnin`), device-board → microphone, **online**.
2. Для **каждой** вкладки слева: Import → выбрать JSON из таблицы → сопоставить ref-переменные:
   - `device1` → DeviceRef
   - `microphone1` → MicrophoneRef
   - `audiostream1` → AudioStreamRef
   - `journal1` → JournalRef
   - `server1` → ServerRef (onConnect)
   - `datetime1` → DateTime (onStart)
3. **Порядок импорта** (рекомендуется): On start → On connect → onMainTick → onAlarmTick → On stop → On disconnect.
4. Проверка main: узел **MakeRecordingPolicy** (5s · WAV) → **StartRecording**; **нет** CollectSamples / legacy `new-track`.
5. Run ≥ 60 s → chain-log: [`SCENARIO_CHAIN_LOG_COOKBOOK.md`](./SCENARIO_CHAIN_LOG_COOKBOOK.md) § v0.8.

---

## Что в каждом обработчике

### On connect

`Event(server)` → isValid(ServerRef) → GetJournal(server) → set journal1.

### On start

`Event` → isValid(journal1)? → GetJournal / set refs → GetMicrophone → set microphone1 → StartStreaming → set audiostream1. **Без** StartRecording (gate только в main).

### onMainTick (§16.5)

```text
onTick → mic/stream valid → GetSample → GetFFTFrame → GetSpectralAnalyser → CollectFftFrames
  → gate: IsRecordingWindowFull → StopRecording → MakeTrack
  → MakeRecordingPolicy → MakeFftTrendsPolicy → StartRecording → FlushSpectralAnalyser
  → MakeFftTrendsAnalysis → MakeReportFromAnalysis → PublishReport → ∞
```

Policy: **MakeRecordingPolicy** `{ windowSec: 5, captureFormat: 'wav' }` и **MakeFftTrendsPolicy** `{ 20×500ms, catalog: DRONE_TIGHT + WIND/QUIET/TRAFFIC/BIRDS/VOICE }`.

### onAlarmTick

MVP stub: `onTick → ∞` (наблюдение и запись — в main; alarm journal out of scope P0).

### On stop

isValid(microphone1) → StopStreaming.

### On disconnect

GetJournal(device) → set journal1 (invalidate on disconnect semantics).

---

## Не использовать

| Файл | Причина |
|------|---------|
| `device-scenario-microphone-main-mvp.json` | legacy CollectSamples + `new-track` |
| `device-scenario-microphone-initial (1).json` | StartRecording ошибочно в onStart |
| `device-scenario-microphone-main (1..5).json` | черновики до v0.7 gate |

---

## Связанные промпты

- Recording parity v0.8: [`DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md)
- UserCases (будущий UI): § Future в том же промпте
