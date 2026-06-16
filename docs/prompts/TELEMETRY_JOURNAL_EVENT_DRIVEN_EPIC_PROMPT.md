# Промпт: event-driven UX журнала и буфера (JE1–JE5)

> **Task-промпт для координатора и агента** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Task-эпик** (5 PR) · **Размер:** **L** (фазы JE1–JE5)  
> **Ожидаемый артефакт:** 5 последовательных PR; каждый `Closes` подзадачу в GitHub Issue эпика.  
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
| **Очистить журнал** | В **той же строке**, что фильтры, **справа** — кнопка «Очистить» по **текущему фильтру** |
| **Нестабильная сеть** | Явные ошибки, предупреждение о недоступности server; UI lock на время запроса + **timeout** разблокировки |

Инфраструктура **уже есть**: `mediaLibraryHub` (`captureStop`, `sampleImported`, `bufferCleared`), `journalHubBridge` (refresh на `sampleImported`), `mic-live-drone-analysis` (подписка на import). Задача — **дожать цепочку**, убрать лишние таймеры и добавить **контекстную очистку** + **устойчивость к сбоям**.

### Диагностика (зафиксировано)

| Компонент | Сейчас | Проблема |
|-----------|--------|----------|
| `useLiveJournalAutoRefresh` | `useVisibleInterval` **5 s** | Дублирует hub; UI «отстаёт» |
| `journalHubBridge` `svc.subscribe` | пустой callback (комментарий TJ5) | UI не слушает snapshot service |
| `useCabinetLiveJournal` | poll **10 s** | Медленно для оператора |
| `MicBufferRecorderPanel` / cabinet sidebar | clear есть | Нужен явный **busy** до ответа server |
| `mic-live-drone-analysis` | `sampleImported` | Проверить порядок: track → report; нет ли race с refresh |
| Журнал UI | нет «Очистить» | Нужна кнопка в строке фильтров (client + cabinet) |
| Remote mutations | `runMediaOp` без timeout | Риск вечного `busy` при зависшем server |

### Out of scope (эпик)

- SSE/WebSocket `journal-stream` (post-v1; отдельный эпик).
- Новые детекторы, MFCC, калибровка stage-gate.
- Смена тарифов / billing enforcement.
- Полный offline sync IndexedDB ↔ server.

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
5 PR строго по merge-order JE1→JE5. Сквозной контракт «remote mutation» вводим в JE1, переиспользуем в JE5.
Не смешивать с indie MFCC. Каждый PR — CI зелёный, ручной smoke paired. Issue #83.

[Структурщик — Ozhegov]:
События — через существующие hub + LiveJournalService.subscribe. clearByFilter — метод
сервиса + port backend; cabinet REST bulk delete. journal UI не импортирует плагины микрофона.

[Математик — Dynin]:
clearByFilter('detections') удаляет только report с isDetected=true (см. filters.ts).
clearByFilter('tracks') — только kind=track; отчёты без track остаются (v1, без cascade).

[Музыкант]:
Smoke: filter «Треки» → clear → только треки исчезли. Server offline → banner + unlock ≤30s.

[Верстальщик — Rodchenko]:
Строка фильтров: `flex` — chips слева, «Очистить» справа (`ml-auto`). Confirm с текстом
«Удалить N …?» по активному фильтру. disabled + spinner на время запроса.
```

---

## Сквозное требование: устойчивость remote-операций (JE1+)

Все мутации к server (clear buffer, clear journal, refresh при paired) проходят через **единый паттерн**:

| Правило | Реализация |
|---------|------------|
| **Блокировка UI** | `busy` / `disabled` на кнопках и опасных действиях на время запроса |
| **Не вечная блокировка** | `Promise.race` с timeout (**30 s** по умолчанию) → разблокировка + ошибка «Сервер не отвечает» |
| **Unmount / закрытие вкладки** | `useEffect` cleanup: сброс `busy`, `AbortController.abort()` |
| **Повторное открытие страницы** | Начальное состояние `busy=false` (без persisted lock) |
| **Server недоступен** | Явный banner/alert: «Media-server / cabinet недоступен» + кнопка «Повторить» |
| **Ошибка сети** | Toast/alert с текстом операции; не глотать в `console.error` |

**Эталон:** вынести `useRemoteMutation` (или расширить `runMediaOp`) в `apps/client` и `apps/cabinet` с тестами на timeout и unmount.

**DoD (сквозной):**
- [ ] Ни одна кнопка clear/refresh не оставляет UI заблокированным > timeout.
- [ ] Закрытие и reopen страницы — интерфейс снова активен.
- [ ] При `storageMode: remote-server` и fetch fail — видимое предупреждение оператору.

---

## Фазы (merge-order)

| Фаза | ID | PR | Содержание |
|------|-----|-----|------------|
| **JE1** | `je1-buffer-clear-event-chain` | 1 | Clear buffer + **remote mutation** паттерн (timeout, errors) |
| **JE2** | `je2-stop-triggers-analysis` | 2 | Цепочка stop → import → track → analyze → report |
| **JE3** | `je3-client-journal-hub-refresh` | 3 | Client journal: hub/snapshot events; ослабить 5 s poll |
| **JE4** | `je4-cabinet-journal-fast-refresh` | 4 | Cabinet poll **1 s** visible + manual «Обновить» |
| **JE5** | `je5-journal-contextual-clear` | 5 | Кнопка «Очистить» по фильтру; API + UI client + cabinet |

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
- [ ] `useRemoteMutation` (или аналог) с timeout 30 s и unmount cleanup.
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

## JE5 — contextual journal clear (по активному фильтру)

### UI (client + cabinet)

В **одной строке** с кнопками фильтра (`Все` / `Треки` / `Отчёты` / `Обнаружения`):

```text
[ Все (12) ] [ Треки (5) ] [ Отчёты (7) ] [ Обнаружения (2) ]     [ Очистить ]
                                                                    ↑ справа
```

- Кнопка **«Очистить»** — `btn-outline btn-error btn-sm` (или по DESIGN.md).
- **Disabled**, если `filterCounts[filter] === 0` или `busy`.
- Confirm: «Удалить **N** записей (фильтр: \<метка\>)? Действие необратимо.»
- После success — `refresh()` / hub event; счётчики фильтров обновлены.

### Семантика `clearByFilter(filter)`

Использовать [`matchesLiveJournalFilter`](../../packages/services/telemetry-journal/src/filters.ts) — **тот же предикат**, что и список:

| Активный фильтр | Удаляется |
|-----------------|-----------|
| `all` | все items журнала (tracks + reports) |
| `tracks` | только `kind === 'track'` |
| `reports` | все `kind === 'report'` |
| `detections` | только reports с `isDetected === true` |

v1: **без cascade** — при очистке треков связанные отчёты **остаются** (orphan reports допустимы; зафиксировать в UI-hint при необходимости).

### Слои

| Слой | Путь | Действие |
|------|------|----------|
| Service | `@membrana/telemetry-journal-service` | `clearByFilter(filter): Promise<{ deleted: number }>` |
| Port | `IJournalStorageBackend` | `deleteMatching(predicate)` или per-backend bulk |
| Cabinet API | `background-cabinet` journal module | `DELETE …/journal/items?filter=&deviceId=` |
| Sync backend | `sync-journal-storage-backend` | вызов cabinet API |
| UI client | `TelemetryJournalModule.tsx` | кнопка в строке фильтров |
| UI cabinet | `JournalPage.tsx` / hook | то же + `useRemoteMutation` |

**DoD JE5:**
- [ ] Кнопка справа в строке фильтров (client + cabinet parity).
- [ ] Каждый фильтр удаляет правильное подмножество (unit-тесты на predicate).
- [ ] Remote: ошибка server → alert + UI разблокирован ≤ timeout.
- [ ] Export JSON не затрагивается (экспорт — read-only снимок до clear).

---

## Definition of Done (эпик целиком)

- [ ] JE1–JE5 merged; Issue #83 закрыт.
- [ ] Ручной smoke: paired client запись → journal client + cabinet без F5.
- [ ] Clear buffer remote → UI client + cabinet согласованы.
- [ ] Contextual journal clear работает по всем 4 фильтрам.
- [ ] Remote mutation: timeout + unmount + server-unavailable banner.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный по затронутым пакетам.
- [ ] `yarn task:archive telemetry-journal-event-driven --notes "PR #…"`.

---

## Промпт целиком (для вставки агенту)

Ты — координатор Membrana (Vesnin). Реализуй эпик **telemetry-journal-event-driven** фазами **JE1→JE5** (по одному PR). Читай этот файл и [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md). Не добавляй детекторы. Используй hub + `useRemoteMutation` для всех server-мутаций. После каждой фазы — smoke paired + отчёт в Issue #83.

---

## Заметки для постановщика

1. Создать GitHub Issue (wish), ссылка на этот промпт.
2. Запись в `registry.json` + `yarn task:sync-readme`.
3. Обновить `MAIN_DAY_ISSUE.md` → `primaryFocusId: telemetry-journal-event-driven`.
