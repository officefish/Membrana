# Промпт: live-журнал телеметрии (TJ1–TJ6)

> **Task-эпик** (3–4 PR) · регламент [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`telemetry-journal-live-refactor`** в [`docs/tasks/registry.json`](../tasks/registry.json)  
> **Размер:** **L** (фазы TJ1–TJ6)  
> **Предпосылка:** MP5 (cabinet `TelemetryReport` / `TelemetryLiveRecord`), `@membrana/telemetry-service` (RAM-буфер), `@membrana/detector-report`, pairing + media-library backends.

---

## Контекст продукта

Журнал телеметрии — **хронология live-сессии микрофона**, а не общий лог всех плагинов.

### Вводные (зафиксировано заказчиком)

1. **Хранение** — приоритет как у библиотеки сэмплов: **server (cabinet + media)** → **Electron FS** → **ограниченный local** только если иначе нельзя.
2. **Источник записей** — только **live-режим**. Сейчас пишет модуль **микрофон** (позже — device board).
3. **Типы записей** — только **создание треков** (5‑с клипы) и **результаты анализа**. Фильтры UI: **все · треки · отчёты · обнаружения**.

### Целевой сценарий

Пользователь на **paired** client запускает live-микрофон и **авто-запись 5‑с сегментов**. Каждый клип:

1. Сохраняется в media-backend (`__buffer__` / live collection).
2. Появляется в журнале как **запись-трек** (metadata).
3. Анализируется теми же детекторами, что offline sample-library.
4. Результат — **запись-отчёт** (`drone-detection-report/v1`), связанная с `trackId`.

Пользователь в журнале: фильтрует, слушает трек, читает отчёт, экспортирует blob / JSON / TXT.

**Client и cabinet** — идентичный функционал; на server у каждого **deviceId** свой журнал; в мембране устройств может быть несколько.

### Out of scope

- Offline-анализ sample-library → журнал (отключить `droneAnalysisTelemetry`).
- FFT threshold / trends-fft / mic metrics aggregate в журнале (legacy writers удалить).
- Device board как writer (TJ6+ / отдельная задача).
- PCM/waveform в payload journal/cabinet.

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Единый DTO LiveJournalItem (kind: track | report). Cabinet — source of truth при pairing;
client — cache + sync cursor. Blobs — media-server; cabinet — index + metadata + report payload.
Эпик TJ1–TJ6; cabinet UI — TJ6, не блокирует client pipeline.

[Структурщик — Ozhegov]:
Новый foundation @membrana/telemetry-journal-service: port IJournalStorageBackend,
resolveJournalBackend (зеркало resolveMediaLibraryBackend). Hub bridge в apps/client.
UI журнала не импортирует плагины.

[Математик — Dynin]:
Анализ = один прогон analyzeSampleDetectors на sampleId трека. Фильтр «обнаружения» =
report.isDetected (консенсус детекторов).

[Музыкант]:
Auto-сегмент 5 с по умолчанию для live-journal. Play/export через sample-playback + media blob.

[Верстальщик — Rodchenko]:
Фильтры: все / треки / отчёты / обнаружения. TrackCard + ReportCard registry (DroneDetectionReportView).
table-xs, tabular-nums, a11y на play/export.
```

---

## Фазы (merge-order)

| Фаза | ID | PR | Содержание |
|------|-----|-----|------------|
| **TJ1** | `tj1-journal-contract` | 1 | DTO, schemas, `IJournalStorageBackend`, memory backend, filters, unit-тесты |
| **TJ2** | `tj2-journal-backends` | 2 | Server backend (cabinet CRUD + pull/push sync), electron-fs stub, `resolveJournalBackend`, hub bridge |
| **TJ3** | `tj3-live-track-pipeline` | 3 | mic-buffer-recorder → track entry; live gate; auto 5s default; stop legacy journal writers |
| **TJ4** | `tj4-live-drone-reports` | 4 | После track → analyzeSampleDetectors → report; link trackId; убрать offline journal write |
| **TJ5** | `tj5-journal-ui` | 5 | UI фильтры, TrackCard, report registry, play/export per item |
| **TJ6** | `tj6-cabinet-parity` | 6 | Prisma `TelemetryTrack` / unified items; cabinet journal UI per device; client rehydrate |

---

## Каноническая модель (TJ1)

```ts
export const TELEMETRY_TRACK_SCHEMA_VERSION = 'telemetry-track/v1';

export type LiveJournalItemKind = 'track' | 'report';

export interface LiveJournalTrackPayload {
  readonly schema: typeof TELEMETRY_TRACK_SCHEMA_VERSION;
  readonly trackId: string;
  readonly liveSessionId?: string;
  readonly sampleId: string;
  readonly title: string;
  readonly durationSec: number;
  readonly sampleRate: number;
  readonly captureMode: 'auto' | 'manual';
  readonly createdAtIso: string;
}

export interface LiveJournalReportPayload {
  readonly schema: string; // e.g. drone-detection-report/v1
  readonly reportId: string;
  readonly trackId: string;
  readonly isDetected: boolean;
  readonly summaryText?: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface LiveJournalItem {
  readonly id: string;
  readonly kind: LiveJournalItemKind;
  readonly timestamp: number;
  readonly clientEntryId: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly tags: readonly string[];
  readonly track?: LiveJournalTrackPayload;
  readonly report?: LiveJournalReportPayload;
}
```

**Dedupe:** `clientEntryId` (как `reportUniqueId` в telemetry-service).

**Фильтры:**

| UI | Правило |
|----|---------|
| all | все items |
| tracks | `kind === 'track'` |
| reports | `kind === 'report'` |
| detections | `kind === 'report' && report.isDetected` |

---

## Архитектура слоёв

| Слой | Путь | Ответственность |
|------|------|-----------------|
| DTO + service | `packages/services/telemetry-journal/src/` | types, filters, `LiveJournalService`, backends |
| Legacy RAM | `@membrana/telemetry-service` | deprecate writers; bridge позже |
| Client resolve | `apps/client/src/lib/resolveJournalBackend.ts` | TJ2 |
| Hub | `apps/client/src/lib/journalHubBridge.ts` | TJ2 |
| Mic pipeline | `plugins/mic-buffer-recorder/`, `plugins/mic-live-drone-analysis/` | TJ3–TJ4 |
| UI | `apps/client/src/modules/telemetry-journal/` | TJ5 |
| Cabinet | `packages/background-cabinet/.../journal/` | TJ2 API, TJ6 UI |

**Запрещённые импорты:** journal UI → плагины микрофона; `telemetry-journal-service` → `apps/client`.

---

## Definition of Done (эпик)

- [ ] Paired live mic auto 5s → track в journal (server + local cache)
- [ ] Auto drone analysis → report `drone-detection-report/v1` с `trackId`
- [ ] Фильтры: все / треки / отчёты / обнаружения
- [ ] Play трека, export blob; export JSON/TXT отчёта
- [ ] Electron FS backend; browser-limited fallback с предупреждением
- [ ] Offline sample-library **не** пишет в journal
- [ ] Cabinet: journal per device (TJ6)
- [ ] Unit-тесты backends + filters; smoke live pipeline

---

## Ручная проверка

1. Pair client → модуль микрофон → live + auto 5s.
2. Журнал: записи «трек» появляются; после анализа — «отчёт».
3. Фильтры tracks/reports/detections работают.
4. Play и export трека; export отчёта JSON/TXT.
5. Cabinet (TJ6): те же записи на device.

---

## Команды

```bash
yarn workspace @membrana/client dev
yarn workspace @membrana/telemetry-journal-service test
yarn typecheck
```

---

## Связь с другими эпиками

- **DDR** (`drone-detector-detail-report`) — `DroneDetectionReportView` + DTO reuse в TJ4/TJ5.
- **MP5** — базовый cabinet upload; этот эпик = **MP5b live journal parity**.
- **telemetry-journal-report-viz** (#43) — superseded фильтрами/карточками TJ5 для live scope.
