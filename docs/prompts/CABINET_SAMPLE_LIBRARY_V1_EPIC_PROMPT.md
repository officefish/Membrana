# Эпик: Cabinet Sample Library v1 — библиотека сэмплов в кабинете

> **Стратегический task-эпик** ([`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)).  
> Размер: **L**. Родитель: Membrane Platform [#67](https://github.com/officefish/Membrana/issues/67).  
> Консилиум: [`cabinet-sample-library-consilium-2026-06-14.md`](../discussions/cabinet-sample-library-consilium-2026-06-14.md).

---

## Цель

В `apps/cabinet` — раздел **«Библиотека сэмплов»** с той же семантикой, что `SampleLibraryModule` в `apps/client`, с разделением:

- **Мембрана:** тарифный датасет (`__tariff_dataset__`) — **один пункт**, read-only, меняется при смене тарифа.
- **Узел (`deviceId`):** буфер + user-коллекции — **per-node**; v1 один узел, UI/API готовы к N.

Удалённые операции: **delete, move, import** (upload) в cabinet. Запись с микрофона — только `apps/client`.

---

## Product rules (зафиксировано)

| Правило | Деталь |
|---------|--------|
| Узлы v1 | 1 узел; sidebar «Узлы» — массив, N-ready |
| Тарифный каталог | Один раз на мембране; `free`=120, `indie`=600, `business`=3000, `state`=12000 сэмплов (ориентир) |
| Offline узел в cabinet | Пустое состояние; данные на полевом ПК (electron / session) |
| Client при разрыве pair | Fallback: server → electron-fs → browser-limited (`resolveMediaLibraryBackend`) |

---

## Слой → путь → ответственность

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Cabinet UI | `apps/cabinet/src/pages/SampleLibraryPage.tsx` | Навигация мембрана/узел, таблица, import |
| Shared UI (extract) | `apps/client/src/components/sample-library/*` или `packages/agenda` | Таблица, quota banner, playback bar — reuse |
| Media service | `@membrana/media-library-service` | `MediaLibraryService`, `ServerStorageBackend` |
| Cabinet backend adapter | `apps/cabinet/src/lib/cabinetMediaLibrary.ts` | Session auth + выбор `deviceId` |
| Identity API | `packages/background-cabinet` | `GET /v1/membranes/:id/nodes`, proxy scope |
| Data-plane | `packages/background-media` | `GET/POST …/devices/:deviceId/*`, membrane catalog endpoint (CSL1) |
| Field client | `apps/client` | Mic write, paired storage; без изменений семантики |

**Запрещено:** blobs в `background-office`; прямой cabinet → media без проверки `membraneId`; Web Audio вне `audio-engine` в client.

---

## Фазы и PR

| Фаза | `id` реестра | Размер | Scope |
|------|--------------|--------|--------|
| **CSL1** | `cabinet-sample-library-csl1-api` | M | Membrane-scoped API: nodes list, catalog samples, cabinet JWT → media |
| **CSL2** | `cabinet-sample-library-csl2-ui` | M | `SampleLibraryPage`, node picker (N-ready), shared components, playback |
| **CSL3** | `cabinet-sample-library-csl3-remote-ops` | M | Remote delete/move/import; empty states; quota per node |

**Порядок:** CSL1 → CSL2 → CSL3.

**Out of scope v1:** catalog blob dedup (ref model), multi-node domain в cabinet DB, mic recording в cabinet, TDOA cross-node library.

---

## CSL1 — API (DoD)

- [ ] `GET /v1/membranes/:membraneId/nodes` — `id`, `label`, `deviceId`, `lastPairedAt`, quota summary.
- [ ] `GET /v1/membranes/:membraneId/catalog` — `catalogId`, `sampleCount`, samples metadata (read-only); не привязан к конкретному узлу в UI.
- [ ] Cabinet session → internal media token (как `media-bridge` при pair); scope: только devices мембраны пользователя.
- [ ] Integration test: два `deviceId` — catalog один, buffers изолированы.

---

## CSL2 — UI (DoD)

- [ ] Route `/library` в `apps/cabinet`; пункт в `CabinetShell`.
- [ ] Sidebar: «Базовый набор ({catalogId})» + «Узлы» → буфер / коллекции.
- [ ] Переиспользование `MediaLibraryQuotaBanner`, таблицы сэмплов (extract из client).
- [ ] Playback сэмпла (blob stream с media).
- [ ] v1: один узел отображается; разметка списка — готова к N (`map(nodes)`).
- [ ] Empty state: «Узел offline — данные на полевом клиенте».

---

## CSL3 — Remote ops (DoD)

- [ ] Delete sample, move между коллекциями узла, multipart import в user-коллекцию.
- [ ] Квота `userStorage` / `buffer` узла блокирует import как в client.
- [ ] Tariff dataset: delete/import запрещены (403 / disabled UI).
- [ ] Ошибки сети — toast + retry; не ломает сессию cabinet.

---

## Тарифные каталоги (roadmap)

| Tariff id | `datasetCatalogId` | Samples |
|-----------|-------------------|---------|
| `free-v1` | `free-v1-catalog` | 120 (done) |
| `indie-v1` | `indie-v1-catalog` | 600 |
| `business-v1` | `business-v1-catalog` | 3000 |
| `state-v1` | `state-v1-catalog` | 12000 |

Смена тарифа: cabinet показывает новый `catalogId`; media re-provision (отдельная задача per tier).

---

## Definition of Done эпика

- [ ] Cabinet: тарифный датасет 1× + per-node buffer/user collections.
- [ ] Remote delete/move/import работают против media-server.
- [ ] UI N-ready (список узлов), v1 с одним узлом.
- [ ] CSL1–CSL3 в архиве реестра; CI green.
- [ ] LGTM Teamlead.

---

## Порядок ролей

1. **Teamlead** — LGTM границ, tariff table в `MEMBRANE_PLATFORM.md`
2. **Структурщик** — CSL1 API + `CabinetScopedBackend`
3. **Верстальщик** — CSL2 IA, DESIGN.md
4. **Музыкант** — playback smoke в cabinet browser
5. **Teamlead** — приёмка
