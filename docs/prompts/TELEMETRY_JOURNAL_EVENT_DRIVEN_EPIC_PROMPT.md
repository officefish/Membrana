# Промпт: event-driven UX журнала и буфера (JE1–JE4)

> **Task-промпт для координатора и агента** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Task-эпик** (4 PR) · **Размер:** **L** (фазы JE1–JE4)  
> **Ожидаемый артефакт:** 4 последовательных PR; каждый `Closes` подзадачу в GitHub Issue эпика.  
> **Реестр:** `id` = **`telemetry-journal-event-driven`** в [`docs/tasks/registry.json`](../tasks/registry.json)  
> **Предпосылка:** эпик **#81** `telemetry-journal-ux-hardening` закрыт (BL1, TJ7–TJ10); платформа и журнал работают, но UX опирается на **polling-таймеры** там, где нужны **события**.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md) | Фокус дня 2026-06-16 |
| [`TARIFF_MATRIX.md`](../TARIFF_MATRIX.md) | Retention/export журнала по тарифам |
| [`TELEMETRY_JOURNAL_UX_EPIC_PROMPT.md`](./TELEMETRY_JOURNAL_UX_EPIC_PROMPT.md) | TJ7 polling baseline (заменяем hub-событиями) |
| [`TELEMETRY_JOURNAL_LIVE_EPIC_PROMPT.md`](./TELEMETRY_JOURNAL_LIVE_EPIC_PROMPT.md) | TJ1–TJ6 hub bridge |
| [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) | Client ↔ cabinet journal |
| [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) | Buffer, quota, `clearBuffer` |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Hub, MembranaRegistry |
| [`DESIGN.md`](../DESIGN.md) | Кнопки, loading, a11y |

**GitHub Issue:** [#83](https://github.com/officefish/Membrana/issues/83).

---

## Контекст продукта

После merge PR #82 оператор тестирует paired-сценарий и видит **рассинхрон UX**:

| Наблюдение | Ожидание product |
|------------|------------------|
| Кнопки «Обновить» / буфер в cabinet | **Очистить буфер** = один запрос `clearBuffer` → ответ сервера → UI обновлён; без «фейкового» refresh по таймеру |
| Live-анализ дрона | **Стоп записи** (или завершение auto-сегмента) → импорт клипа → **один** прогон анализа; не периодический interval |
| Журнал client | Новый track/report виден **сразу** после события hub, без ожидания 5 s poll |
| Журнал cabinet | Обновление ~**1 s** при открытой вкладке (poll fallback) или по событию sync |

Инфраструктура **уже есть**: `mediaLibraryHub` (`captureStop`, `sampleImported`, `bufferCleared`), `journalHubBridge` (refresh на `sampleImported`), `mic-live-drone-analysis` (подписка на import). Задача — **дожать цепочку** и убрать лишние таймеры из hot path.

### Диагностика (зафиксировано)

| Компонент | Сейчас | Проблема |
|-----------|--------|----------|
| `useLiveJournalAutoRefresh` | `useVisibleInterval` **5 s** | Дублирует hub; UI «отстаёт» |
| `journalHubBridge` `svc.subscribe` | пустой callback (комментарий TJ5) | UI не слушает snapshot service |
| `useCabinetLiveJournal` | poll **10 s** | Медленно для оператора |
| `MicBufferRecorderPanel` / cabinet sidebar | clear есть | Нужен явный **busy** до ответа server |
| `mic-live-drone-analysis` | `sampleImported` | Проверить порядок: track → report; нет ли race с refresh |

### Out of scope (эпик)

- SSE/WebSocket `journal-stream` (post-v1; отдельный эпик).
- Новые детекторы, MFCC, калибровка stage-gate.
- Смена тарифов / billing enforcement.
- Полный offline sync IndexedDB ↔ server.

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
4 PR строго по merge-order JE1→JE4. Не смешивать с indie MFCC. Каждый PR — CI зелёный,
ручной smoke paired. Issue отдельный от #79/#81.

[Структурщик — Ozhegov]:
События — через существующие hub + LiveJournalService.subscribe. Не плодить второй
event bus. journal UI не импортирует плагины микрофона.

[Математик — Dynin]:
Анализ — ровно один analyzeSampleDetectors на sampleId после import. Unit-тест:
inactive plugin → 0 reports.

[Музыкант]:
Smoke: auto 5s × 3 клипа → 3 track + 3 report (plugin ON). Clear buffer → quota 0,
запись снова доступна.

[Верстальщик — Rodchenko]:
Кнопка clear: loading/disabled, confirm, ошибка сети. Убрать путаницу «Обновить» vs
«Очистить» в cabinet (переименовать или развести действия).
```

---

## Фазы (merge-order)

| Фаза | ID | PR | Содержание |
|------|-----|-----|------------|
| **JE1** | `je1-buffer-clear-event-chain` | 1 | Clear buffer: event-driven UI client + cabinet; busy state; hub `bufferCleared` |
| **JE2** | `je2-stop-triggers-analysis` | 2 | Цепочка stop → import → track → analyze → report; тесты race/inFlight |
| **JE3** | `je3-client-journal-hub-refresh` | 3 | Client journal: hub/snapshot events; ослабить или убрать 5 s poll |
| **JE4** | `je4-cabinet-journal-fast-refresh` | 4 | Cabinet journal: poll **1 s** visible + manual «Обновить»; silent refresh |

---

## JE1 — buffer clear event chain

| Слой | Путь | Действие |
|------|------|----------|
| Hub | `apps/client/src/lib/mediaLibraryHub.ts` | Уже есть `bufferCleared` — убедиться, что все clear-пути публикуют |
| Bridge | `mediaLibraryHubBridge.ts` | `requestClearMediaLibraryBuffer` → await server → publish |
| UI client | `MicBufferRecorderPanel`, `SampleLibraryModule` | loading на clear; список буфера сбрасывается по hub |
| UI cabinet | `useCabinetSampleLibrary`, sidebar | то же; переименовать «Обновить» при ошибке load ≠ clear buffer |
| Service | `@membrana/media-library-service` | `clearBuffer` remote: дождаться 204/200 |

**DoD JE1:**
- [ ] Clear buffer: клик → disabled + spinner → success/error toast.
- [ ] После success: `sampleCount=0`, quota snapshot актуален без ручного F5.
- [ ] Unit/integration test на `publishMediaLibraryBufferCleared`.

---

## JE2 — stop triggers analysis

| Слой | Путь | Действие |
|------|------|----------|
| Recorder | `micBufferRecorderPlugin.ts` | `finishActiveRecorder` → `captureStop` → bridge `importBlob` → `sampleImported` |
| Bridge | `mediaLibraryHubBridge.ts` | порядок: import → journal track → publish imported |
| Plugin | `mic-live-drone-analysis` | анализ **только** на `sampleImported` с `journalTrackId`; guard `inFlight` |
| Tests | `micLiveDroneAnalysisPlugin.test.ts` | stop/import mock → ровно 1 analyze; plugin off → 0 |

**DoD JE2:**
- [ ] Нет `setInterval` для анализа дрона (grep по `mic-live-drone`, `droneDetection`).
- [ ] Auto 5 s: каждый сегмент → 1 report при plugin ON.
- [ ] Report ссылается на track id из того же import.

---

## JE3 — client journal hub refresh

| Слой | Путь | Действие |
|------|------|----------|
| Bridge | `journalHubBridge.ts` | В `svc.subscribe`: publish `journalSnapshotUpdated` (новый hub или reuse telemetry-journal event) |
| Module | `telemetry-journal/` | `useLiveJournalAutoRefresh`: poll **fallback** (например 30 s) или off при hub |
| Hub | опционально `liveJournalHub.ts` | `reportAppended` / `trackAppended` для явной инвалидации |

**DoD JE3:**
- [ ] Новый report виден в UI client < 500 ms после append (локально).
- [ ] Paired: после sync refresh без ожидания 5 s poll.
- [ ] Тест на subscribe → re-render списка.

---

## JE4 — cabinet journal fast refresh

| Слой | Путь | Действие |
|------|------|----------|
| Hook | `useCabinetLiveJournal.ts` | `CABINET_LIVE_JOURNAL_REFRESH_MS = 1_000`; `silent: true` на interval |
| Page | `JournalPage.tsx` | Кнопка «Обновить» → `reloadItems()` (уже есть) |

**DoD JE4:**
- [ ] При открытой вкладке journal список подтягивается ~1 s.
- [ ] `document.hidden` → interval paused (`useVisibleInterval`).
- [ ] Ручной refresh не дублирует loading flash (silent mode).

---

## Definition of Done (эпик целиком)

- [ ] JE1–JE4 merged; Issue закрыт.
- [ ] Ручной smoke: paired client запись → journal client + cabinet без F5.
- [ ] Clear buffer remote → UI client + cabinet согласованы.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный по затронутым пакетам.
- [ ] `yarn task:archive telemetry-journal-event-driven --notes "PR #…"`.

---

## Промпт целиком (для вставки агенту)

Ты — координатор Membrana (Vesnin). Реализуй эпик **telemetry-journal-event-driven** фазами **JE1→JE4** (по одному PR). Читай этот файл и [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md). Не добавляй детекторы. Используй hub (`mediaLibraryHub`, `LiveJournalService.subscribe`). После каждой фазы — smoke paired + отчёт в Issue.

---

## Заметки для постановщика

1. Создать GitHub Issue (wish), ссылка на этот промпт.
2. Запись в `registry.json` + `yarn task:sync-readme`.
3. Обновить `MAIN_DAY_ISSUE.md` → `primaryFocusId: telemetry-journal-event-driven`.
