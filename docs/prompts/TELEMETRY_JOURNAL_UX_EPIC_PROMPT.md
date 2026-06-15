# Промпт: live-журнал UX + buffer gate + mic drone plugin (BL1, TJ7–TJ10)

> **Task-промпт для агента-разработчика** · процесс [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Task-эпик** (5 PR) · **Размер:** **L** (фазы BL1, TJ7–TJ10)  
> **Ожидаемый артефакт:** 5 последовательных PR (по одному на фазу), каждый `Closes` подзадачу в [#81](https://github.com/officefish/Membrana/issues/81).  
> **Реестр:** `id` = **`telemetry-journal-ux-hardening`** в [`docs/tasks/registry.json`](../tasks/registry.json)  
> **GitHub Issue:** [#81](https://github.com/officefish/Membrana/issues/81)  
> **Предпосылка:** эпик [`TELEMETRY_JOURNAL_LIVE_EPIC_PROMPT.md`](./TELEMETRY_JOURNAL_LIVE_EPIC_PROMPT.md) (TJ1–TJ6 merged/deployed), `@membrana/sample-playback-service`, `@membrana/media-library-service`, `@membrana/detector-report`, cabinet journal UI (TJ6).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, формат ответа |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы пакетов, MembranaRegistry, hub |
| [`DESIGN.md`](../DESIGN.md) | UI journal / microphone panels |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Регистрация плагинов, activePlugins |
| [`TELEMETRY_JOURNAL_LIVE_EPIC_PROMPT.md`](./TELEMETRY_JOURNAL_LIVE_EPIC_PROMPT.md) | TJ1–TJ6 baseline, задумка `mic-live-drone-analysis` |
| [`SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md`](./SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md) | Эталон `sample-library-drone-analysis` |
| [`DRONE_DETECTOR_DETAIL_REPORT_PROMPT.md`](./DRONE_DETECTOR_DETAIL_REPORT_PROMPT.md) | DTO `DroneDetectionReport`, DDR |

---

## Контекст продукта

После TJ6 live-журнал работает end-to-end, но выявлены пробелы:

1. **Cabinet** не обновляет список автоматически — только по кнопке «Обновить».
2. **Play трека** в журнале — кнопка без waveform; в sample-library уже есть `SampleWaveformScrubber` + preloader (`status: loading`).
3. **Блокировка записи** при **10 / 10 сэмплов** и **4.8 MB / 1024 MB** — неверное поведение: byte-квота не исчерпана, запись должна продолжаться до заполнения буфера по байтам.
4. **Пагинация** — длинные списки без постраничного просмотра; нужно **≤ 50 записей на страницу** (client + cabinet).
5. **Владение отчётами дрона (TJ4 shortcut):** сейчас `journalHubBridge` → `liveJournalDronePipeline` вызывает `analyzeSampleDetectors` **глобально** при каждом импорте mic-клипа, **без activation плагина**. По задумке #79 отчёты должен создавать плагин **`mic-live-drone-analysis`** на модуле «Микрофон» — аналог «Анализ дрона (сэмпл)» из sample-library: DSP-детекторы + template-match, UI только при `activePlugins`, актуальный отчёт в plugin state, запись в live journal при каждом новом клипе в `__buffer__`.

### Диагностика буфера (зафиксировано)

| Показатель UI | Значение | Источник |
|---------------|----------|----------|
| Память буфера | 4.8 MB / 1024 MB | `quota.bufferUsedBytes` / `bufferLimitBytes` (server) |
| Сэмплы в `__buffer__` | 10 / 10 | `maxBufferSamples` |
| Сообщение | «Запись заблокирована» | `isBufferRecordingBlocked()` |

**Корневая причина:** `DEFAULT_MAX_BUFFER_SAMPLES = 10` в `@membrana/media-library-service`. `isBufferRecordingBlocked` блокирует при `sampleCount >= maxBufferSamples` **независимо** от byte-квоты.

**Ожидание заказчика:** блокировать только при исчерпании **byte-квоты буфера**; count-limit — только для `browser-limited-fallback`.

### Out of scope (эпик)

- SSE/WebSocket `journal-stream` (post-v1).
- Перенос **треков** журнала в плагин анализа (треки остаются TJ3: `mic-buffer-recorder` + `appendLiveJournalTrackFromSampleImport`).
- Запись в журнал из `trends-fft-analyzer` (live trends) — legacy writers уже отключены.
- Offline sample-library → live journal (остаётся out of scope #79).
- Новые детекторы / калибровка beyond `analyzeSampleDetectors` + `detectorCalibrationPreset`.

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
5 PR строго по merge-order. BL1 первый — без него live ломается. TJ10 второй — исправить архитектурный
долг TJ4 до UX-полировки; иначе journal refresh показывает отчёты при выключенном плагине. Issue #81,
реестр telemetry-journal-ux-hardening. Каждый PR — отдельная ветка, CI зелёный, отчёт в Issue.

[Структурщик — Ozhegov]:
TJ10: plugins/mic-live-drone-analysis/ + MembranaRegistry на microphone. Переиспользовать analyzeSampleDetectors
(общая pure-функция), не journalHubBridge. journal UI не импортирует плагины. Waveform TJ8 — только sample-playback.

[Математик — Dynin]:
TJ10: один прогон analyzeSampleDetectors на sampleId; link trackId из hub payload или lookup последнего track.
Unit-тест: plugin inactive → appendReport не вызывается. BL1: «10 samples, 4MB/1GB → not blocked» server mode.
TJ9: cursor pagination + mapper tests.

[Музыкант]:
TJ10 smoke: mic live auto 5s, plugin ON → track + report каждые 5s; plugin OFF → только track, без report.
После BL1 — 15+ клипов подряд при свободной byte-квоте. Ручная: тишина / речь / целевой сигнал.

[Верстальщик — Rodchenko]:
TJ10 panel — parity SampleLibraryDroneAnalysisPanel (вердикты + DroneDetectionReportView, loading/empty).
MicrophoneModule: panel только при activeIds. TJ8 waveform как CabinetSampleTable. TJ9 pager: DaisyUI join, a11y.
```

---

## Фазы (merge-order)

| Фаза | ID | PR | Содержание |
|------|-----|-----|------------|
| **BL1** | `bl1-buffer-count-quota-decouple` | 1 | Server buffer: gate по byte-квоте; decouple от `maxBufferSamples=10` |
| **TJ10** | `tj10-mic-live-drone-plugin` | 2 | Плагин `mic-live-drone-analysis`: DSP-отчёты по новым buffer-клипам; убрать global TJ4 shortcut |
| **TJ7** | `tj7-journal-live-refresh` | 3 | Real-time journal: client (hub + interval) + cabinet (poll/visibility) |
| **TJ8** | `tj8-journal-track-waveform` | 4 | Play + waveform + preloader в TrackCard (client + cabinet) |
| **TJ9** | `tj9-journal-pagination` | 5 | Пагинация ≤50: API cursor + UI client + cabinet |

---

## BL1 — buffer gate (детали)

| Слой | Путь | Действие |
|------|------|----------|
| Constants | `packages/services/media-library/src/constants.ts` | `maxBufferSamples` для fallback vs server (`null` = без count cap) |
| Quota | `packages/services/media-library/src/quota-status.ts` | count cap только для `browser-limited-fallback` |
| Service | `packages/services/media-library/src/media-library-service.ts` | `importBlob` в `__buffer__` — не `BUFFER_FULL` по count на server |
| Hub | `apps/client/src/lib/mediaLibraryHubBridge.ts` | актуальный `recordingBlocked` |
| UI | `MicBufferRecorderPanel.tsx` | byte bar primary; не «10 / 10» как hard limit на server |

### DoD BL1

- [ ] Paired + server: 10+ клипов при bufferUsed ≪ bufferLimit — запись **не** блокируется
- [ ] Блокировка только при `bufferUsedBytes >= bufferLimitBytes` (server)
- [ ] Unit-тесты `quota-status` + `media-library-service`
- [ ] Browser-limited fallback сохраняет count cap

---

## TJ10 — mic-live-drone-analysis (детали)

### Проблема (as-is)

```text
mic-buffer-recorder → sample.imported
  → journalHubBridge (always)
    → liveJournalDronePipeline
      → appendTrack + analyzeSampleDetectors + appendReport   ← без проверки plugin active
```

Плагин «Анализ дрона (сэмпл)» зарегистрирован **только** на `sample-library`. На `microphone` есть `trends-fft-analyzer` (live trends по потоку) — это **не** тот же отчёт.

### Целевое поведение (to-be)

```text
mic-buffer-recorder → sample.imported
  → appendLiveJournalTrackFromSampleImport (TJ3, streamLive gate)     ← без изменений
  → mic-live-drone-analysis (если plugin active на moduleId)
      → analyzeSampleDetectors(sampleId, title)
      → plugin state: актуальный отчёт + verdicts
      → appendLiveJournalReportFromDroneDetection({ trackId, report })
```

| Условие | Трек в journal | Отчёт в journal | UI плагина |
|---------|----------------|-----------------|------------|
| Плагин **выключен** | да (TJ3) | **нет** | не отображается |
| Плагин **включён** | да | **да** (после анализа) | panel + актуальный отчёт |

### Изменения

| Слой | Путь | Действие |
|------|------|----------|
| Plugin | `apps/client/src/plugins/mic-live-drone-analysis/` | `createMicLiveDroneAnalysisPlugin`, state, panel, types |
| Shared analysis | `apps/client/src/plugins/sample-library-drone-analysis/analyzeSampleDetectors.ts` | импорт без дублирования логики детекторов |
| Report writer | `apps/client/src/lib/liveJournalReportWriter.ts` | вызов из plugin install (не из hub) |
| Track writer | `apps/client/src/lib/liveJournalTrackWriter.ts` | без изменений контракта |
| Pipeline | `apps/client/src/lib/liveJournalDronePipeline.ts` | удалить `analyzeSampleDetectors` + `appendReport`; оставить только track или удалить файл и перенести track-hook |
| Hub bridge | `apps/client/src/lib/journalHubBridge.ts` | track-only subscribe или делегировать track writer напрямую |
| Registry | `apps/client/src/modules/registerClientModules.ts` | `MembranaRegistry.registerPlugin('microphone', createMicLiveDroneAnalysisPlugin())` |
| UI | `apps/client/src/modules/microphone/MicrophoneModule.tsx` | `MicLiveDroneAnalysisPanel` при `activeIds` |
| Tests | `liveJournalDronePipeline.test.ts`, `mic-live-drone-analysis/*.test.ts` | plugin gate, journal append |

### Контракт plugin

- **ID:** `mic-live-drone-analysis`
- **Name:** «Анализ дрона (live)» (или «Анализ дрона (буфер)» — согласовать с sample-library naming)
- **install:** подписка на `subscribeMediaLibrarySampleImported`; фильтр `sourcePluginId === MIC_BUFFER_RECORDER_PLUGIN_ID` и `payload.moduleId === context.moduleId`
- **resolve trackId:** из результата track append (hub event order) или lookup по `sampleId` в journal service / payload extension — зафиксировать в PR без race: track append completes before analysis starts (sequential in same microtask chain или await track then analyze)
- **state:** `idle | loading | ready | error`; `detectionReport`, `verdicts`, `analyzedSampleId`
- **UI:** `DroneDetectionReportView`, таблица вердиктов — parity `SampleLibraryDroneAnalysisPanel`

### Запрещено

- `journalHubBridge` → прямой вызов `analyzeSampleDetectors` без plugin gate
- journal UI → import плагина microphone
- `new AudioContext()` в plugin UI
- дублирование detector pipeline вне `analyzeSampleDetectors`

### DoD TJ10

- [ ] Плагин зарегистрирован на `microphone`; panel только при active
- [ ] Plugin OFF: клипы → track в journal, **без** report
- [ ] Plugin ON: каждый новый buffer-клип → analyze → report с `trackId` в journal
- [ ] Plugin state показывает актуальный отчёт последнего проанализированного клипа
- [ ] Global TJ4 shortcut удалён; unit-тесты на gate
- [ ] `yarn workspace @membrana/client test` — зелёный (scope TJ10)

---

## TJ7 — live refresh (детали)

### Client

- Модуль `telemetry-journal`: `service.refresh()` каждые **5 s** (tab visible) + после append track/report
- `document.visibilitychange` → refresh

### Cabinet

- `useCabinetLiveJournal`: interval **10 s** + `visibilitychange` + кнопка «Обновить»

### DoD TJ7

- [ ] Новый track+report в cabinet ≤15 s без ручного refresh
- [ ] Client journal обновляется после 5s клипа без F5

---

## TJ8 — track playback + waveform (детали)

Эталон: `apps/cabinet/src/components/sample-library/CabinetSampleTable.tsx` — `SampleWaveformScrubber`, preloader при `status === 'loading'`.

### DoD TJ8

- [ ] Play live-клипа → waveform + scrub + preloader
- [ ] a11y: `aria-busy` на Play при loading

---

## TJ9 — pagination (детали)

`LIVE_JOURNAL_PAGE_SIZE = 50` в `@membrana/telemetry-journal-service`.

API: `GET /v1/telemetry/journal-items?limit=50&cursor=...&mediaDeviceId=...` → `{ items, nextCursor }`.

Server-side filter + page; client-side slice — **не** DoD.

### DoD TJ9

- [ ] ≤50 items на странице UI (client + cabinet)
- [ ] API pagination + тесты
- [ ] Фильтры работают с pagination

---

## Архитектура слоёв

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Buffer quota | `packages/services/media-library` | BL1 |
| Mic drone plugin | `apps/client/src/plugins/mic-live-drone-analysis/` | TJ10 analysis + journal reports |
| Shared detectors | `analyzeSampleDetectors.ts`, `@membrana/detector-report` | TJ10 (reuse) |
| Journal pipeline | `liveJournalTrackWriter`, `liveJournalReportWriter` | TJ3 track / TJ10 report |
| Hub bridge | `journalHubBridge.ts` | TJ2 backend; **не** unconditional analyze |
| Journal service | `packages/services/telemetry-journal` | TJ9 pagination types |
| Client journal UI | `apps/client/src/modules/telemetry-journal/` | TJ7–TJ9 |
| Cabinet journal | `apps/cabinet/.../journal/` | TJ7–TJ9 parity |
| Playback | `@membrana/sample-playback-service` | TJ8 |

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md). Работай **одну фазу за PR** в merge-order.

---

### Что построить

Эпик **telemetry-journal-ux-hardening** ([#81](https://github.com/officefish/Membrana/issues/81)), 5 фаз:

1. **BL1** — server buffer recording gate по bytes, не по count=10.
2. **TJ10** — плагин `mic-live-drone-analysis` на модуле microphone: при activation анализирует каждый новый mic buffer clip (`analyzeSampleDetectors`), пишет report в live journal, показывает UI; убрать global analyze из `journalHubBridge`/`liveJournalDronePipeline`.
3. **TJ7** — auto-refresh journal (client + cabinet).
4. **TJ8** — play + waveform + preloader в journal track cards.
5. **TJ9** — pagination ≤50 (API + UI).

---

### Архитектура / контракт

См. таблицу «Архитектура слоёв» выше. **Запрещено:** journal UI → плагины microphone; unconditional `analyzeSampleDetectors` в hub bridge; `new AudioContext()` в UI.

---

### Тесты

| Фаза | Минимум |
|------|---------|
| BL1 | `quota-status`, `importBlob` server mode |
| TJ10 | plugin inactive → no report; active → report with trackId |
| TJ7 | hook/bridge unit или integration smoke script |
| TJ8 | component test или manual DoD |
| TJ9 | cabinet mapper/service pagination tests |

---

### Definition of Done (эпик)

- [ ] BL1: live 5s не блокируется при свободной byte-квоте
- [ ] TJ10: отчёты только при active `mic-live-drone-analysis`; UI parity sample-library drone panel
- [ ] TJ7: auto-refresh client + cabinet
- [ ] TJ8: waveform + preloader в journal
- [ ] TJ9: pagination 50, API + UI
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (или scope изменённых пакетов)
- [ ] Ручная проверка paired client ↔ cabinet
- [ ] LGTM Teamlead

---

### Out of scope

См. раздел «Out of scope (эпик)» выше.

---

### Порядок работы ролей

1. **Teamlead** — выбор фазы, scope PR, merge-order.
2. **Структурщик** — plugin registry, hub boundaries, без циклов импортов.
3. **Математик** — quota gate, pagination cursor, detector pipeline reuse.
4. **Музыкант** — smoke live mic, plugin on/off matrix.
5. **Верстальщик** — panels, waveform, pager a11y.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: PR фазы <ID>
Definition of Done: чеклист фазы из TELEMETRY_JOURNAL_UX_EPIC_PROMPT.md
```

---

## Definition of Done (эпик, сводный)

- [ ] BL1, TJ10, TJ7, TJ8, TJ9 — все DoD фаз выполнены
- [ ] 5 PR merged в main (или integration branch по регламенту команды)
- [ ] Отчёт в GitHub Issue #81
- [ ] `yarn task:archive telemetry-journal-ux-hardening --notes "PR #…–#…"`

---

## Ручная проверка

1. BL1: live auto 5s → **>10 клипов** при свободных MB на server buffer
2. TJ10: plugin OFF → tracks only; plugin ON → track + report каждые 5s; panel показывает последний отчёт
3. TJ7: journal client/cabinet без F5 / ручного refresh (≤15 s)
4. TJ8: play в journal → waveform + scrub + preloader
5. TJ9: >50 записей → pager, 50 на странице, фильтры OK

---

## Заметки для постановщика

1. Issue [#81](https://github.com/officefish/Membrana/issues/81) + реестр `telemetry-journal-ux-hardening` (`status: active`).
2. Агенту в начале диалога:

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и промпту:
docs/prompts/TELEMETRY_JOURNAL_UX_EPIC_PROMPT.md (блок «Промпт целиком»).
Фаза: <BL1|TJ10|TJ7|TJ8|TJ9>.
```

3. После каждого PR — комментарий в #81 с номером PR и пройденным DoD фазы.
4. После merge всех фаз → `yarn task:archive telemetry-journal-ux-hardening`.

### Проверка после PR

```bash
yarn workspace @membrana/media-library-service test
yarn workspace @membrana/telemetry-journal-service test
yarn workspace @membrana/client test
yarn turbo run lint typecheck test build --continue --filter=@membrana/client
yarn workspace @membrana/cabinet dev
```

---

## Связь с эпиками

| Эпик | Связь |
|------|--------|
| #79 `telemetry-journal-live-refactor` | TJ1–TJ6; TJ10 закрывает архитектурный долг TJ4 |
| #81 `telemetry-journal-ux-hardening` | этот эпик |
| `sample-library-drone-detection` | эталон UI и `analyzeSampleDetectors` |
| MP4/MP5 media | buffer quota bytes |

---

## Команды

```bash
yarn workspace @membrana/media-library-service test
yarn workspace @membrana/telemetry-journal-service test
yarn workspace @membrana/client dev
yarn workspace @membrana/cabinet dev
```
