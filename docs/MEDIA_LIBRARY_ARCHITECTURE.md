# Архитектура: медиа-библиотека (Sample Library)

> Решение консилиума: [`seanses/media-library-dataset-2026-06-09.md`](./seanses/media-library-dataset-2026-06-09.md)  
> Связь с датасетом: [`DATASET.md`](./DATASET.md), [`DETECTOR_BENCHMARK.md`](./DETECTOR_BENCHMARK.md)  
> Ограничения engine/hub: [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1b–1c

Документ задаёт **целевую архитектуру** модуля библиотеки звуков: буфер записи, коллекции пользователя, системная коллекция, web vs Electron vs сервер.

---

## 1. Назначение

| Задача | Как библиотека помогает |
|--------|-------------------------|
| Запись с микрофона | PCM → **буфер** (через engine, не второй `getUserMedia`) |
| Организация сэмплов | Перенос из буфера в **коллекции** с метаданными |
| Benchmark / stage-gate | **Системная коллекция** → export в `manifest.json` |
| Импорт с диска | File → буфер или сразу в коллекцию |
| Web + Electron | Единый доменный API, **разные storage-backend** |

Библиотека — **не** медиаплеер и **не** DAM. Воспроизведение — через `@membrana/audio-engine-service`; каталог — через `@membrana/media-library-service`.

---

## 2. Доменная модель

### 2.1. Сущности

```typescript
/** Уникальный идентификатор сэмпла (uuid v4). */
type SampleId = string;

/** Коллекция — именованный контейнер сэмплов. */
interface Collection {
  id: string;
  name: string;
  kind: 'buffer' | 'user' | 'system';
  createdAt: string;
  updatedAt: string;
  /** Только для kind === 'system'. */
  systemKey?: 'benchmark' | string;
}

/** Метаданные + ссылка на бинарник в storage-backend. */
interface MediaSample {
  id: SampleId;
  collectionId: string;
  title: string;
  class: string;          // drone-multirotor | wind | …
  label: 'drone' | 'not-drone' | 'unlabeled';
  source: 'mic-recording' | 'disk-import' | 'synthetic' | 'move';
  durationSec: number;
  sampleRate: number;
  channels: 1 | 2;
  createdAt: string;
  /** Путь/blob-key в backend; не для UI. */
  storageRef: string;
  notes?: string;
}
```

### 2.2. Три типа коллекций

| kind | ID | Удаление | Назначение |
|------|-----|----------|------------|
| **buffer** | фикс. `__buffer__` | нет (очищается) | **Временная** запись с микрофона; один активный буфер на профиль/устройство |
| **user** | uuid | ✅ пользователем | Произвольные наборы («полевые июнь», «ветер балкон») |
| **system** | фикс. `__system_benchmark__` | ❌ коллекцию | **Benchmark / датасет**; может быть **пустой**; сэмплы добавляются/удаляются |

**Правила:**

- Пользователь **не удаляет** системную коллекцию; может удалить все сэмплы внутри.
- Из **буфера** сэмплы **переносятся** (move), не копируются по умолчанию — буфер освобождается.
- Copy в другую коллекцию — явное действие «дублировать».
- Системная коллекция — единственный источник для **Export manifest** (кнопка в UI / CLI).

### 2.3. Буфер записи

```
[Mic plugin] --hub--> [engine: PCM ring / WAV chunk]
                           |
                           v
                    [Buffer collection]
                     (max N сэмплов или max MB)
                           |
              user: "Сохранить в…" / drag
                           v
              [User collection] or [System collection]
```

- Запись **только** из потока, уже полученного через `audio-engine-service` (hub `microphoneStreamHub`).
- Плагин микрофона шлёт событие `media-library.capture` с `{ start | stop | append-chunk }` — **не** пишет файлы сам.
- Буфер имеет **квоту** (см. §4): при переполнении — FIFO или блокировка с сообщением в UI.

---

## 3. Слои (пакеты)

```
apps/client
  └── modules/sample-library/          # UI: коллекции, буфер, import, quota banner
  └── plugins/microphone-*             # только hub events → media-library

packages/services/media-library/       # @membrana/media-library-service
  ├── domain/                          # Collection, Sample, move/copy rules
  ├── ports/storage-backend.ts         # интерфейс IStorageBackend
  └── hooks/                           # useSampleLibrary, useCollections

packages/background-media/             # опционально, web-сервер файлов (NestJS)
  └── REST: collections, samples, blobs

apps/electron/                         # preload: electronAPI.mediaLibrary.*
```

**Граф зависимостей** (как §1a ARCHITECTURE):

- `media-library-service` → `@membrana/core` (+ типы audio window при export в benchmark через detector-base, без UI).
- **Запрещено:** сервис → agenda, device-board, другие сервисы (кроме явного порта «decode preview» через engine на клиенте).
- Клиент: module → `media-library-service` + `audio-engine-service` (preview/play).

---

## 4. Storage backends (web / Electron / server)

Единый порт:

```typescript
interface StorageQuota {
  usedBytes: number;
  limitBytes: number;
  backend: 'server' | 'browser-limited' | 'electron-fs';
  serverReachable: boolean;
}

interface IStorageBackend {
  getQuota(): Promise<StorageQuota>;
  listCollections(): Promise<Collection[]>;
  createCollection(name: string): Promise<Collection>;
  deleteCollection(id: string): Promise<void>; // запрет для buffer/system

  listSamples(collectionId: string): Promise<MediaSample[]>;
  putSample(collectionId: string, blob: Blob, meta: Omit<MediaSample, 'id' | 'storageRef' | 'collectionId'>): Promise<MediaSample>;
  removeSample(sampleId: string): Promise<void>;
  moveSample(sampleId: string, toCollectionId: string): Promise<MediaSample>;
  readBlob(sampleId: string): Promise<Blob>;
}
```

### 4.1. Матрица runtime

| Runtime | Backend | Где файлы | Лимит |
|---------|---------|-----------|-------|
| **Electron** | `ElectronFsStorageBackend` | `%APPDATA%/Membrana/media-library/` (через `electronAPI`) | диск пользователя (мягкий лимит в настройках) |
| **Web + server OK** | `ServerStorageBackend` | `packages/background-media` → volume на сервере | политика сервера |
| **Web, server недоступен** | `BrowserLimitedStorageBackend` | **IndexedDB** (+ опционально OPFS) | жёсткий cap, напр. **100 MB** |

Выбор backend при старте клиента:

```typescript
type MediaLibraryStorageMode =
  | 'electron-fs'
  | 'remote-server'
  | 'browser-limited-fallback';

function resolveStorageMode(): MediaLibraryStorageMode {
  if (getRuntimeStorageMode() === 'electron-system-files') return 'electron-fs';
  if (await pingMediaServer()) return 'remote-server';
  return 'browser-limited-fallback';
}
```

Существующий [`runtimeStorageMode.ts`](../apps/client/src/lib/runtimeStorageMode.ts) и [`StorageRuntimeIndicator`](../apps/client/src/components/StorageRuntimeIndicator.tsx) расширяются: показывать **три состояния** (Electron / Server / Local limited).

### 4.2. Web-сервер (`background-media`)

Отдельный пакет (по аналогии с `background-office`):

| Endpoint | Назначение |
|----------|------------|
| `GET /health` | ping для `resolveStorageMode` |
| `GET /v1/quota` | used/limit |
| `CRUD /v1/collections` | user + system (system read-only delete) |
| `POST /v1/collections/:id/samples` | multipart upload |
| `DELETE /v1/samples/:id` | удаление blob |
| `POST /v1/samples/:id/move` | смена коллекции |

Auth: тот же паттерн `X-Membrana-Token` / internal gate, что в [`background-office`](../packages/background-office/README.md). **Не** смешивать с Claude/Linear модулями office.

**Fallback:** если `GET /health` fail → `BrowserLimitedStorageBackend` + **persistent banner** в UI (см. §5).

### 4.3. Browser-limited fallback

- Хранить WAV в IndexedDB; метаданные в той же DB.
- `limitBytes` из конфига клиента (env `VITE_MEDIA_LIBRARY_LOCAL_QUOTA_MB`, default 100).
- При `usedBytes >= 0.9 * limit` — warning; при 100% — блок import/record с текстом «Подключите media-server или освободите место».
- **Не** синхронизация с сервером в v1 (ручной export/import ZIP — опционально M2).

---

## 5. UI / UX (требования)

### 5.1. Экран «Библиотека»

- Sidebar или route `/lab/library`:
  - **Буфер** (always visible, badge count)
  - **Системная** «Benchmark» (undeletable, может быть empty)
  - **Мои коллекции** (+ создать)
- Таблица сэмплов: title, class, label, duration, source, actions (play, move, delete, export).

### 5.2. Индикатор ограничений (обязательно)

Расширить `StorageRuntimeIndicator` или banner над библиотекой:

| mode | Текст (пример) |
|------|----------------|
| `remote-server` | «Файлы на media-server · квота X/Y MB» |
| `browser-limited-fallback` | «⚠ Media-server недоступен. Локальное хранилище ограничено **100 MB**. Записи могут быть удалены при очистке браузера.» |
| `electron-fs` | «Файлы на диске (Electron)» |

Использовать DaisyUI `alert alert-warning` для fallback; не скрывать после первого показа, пока mode не сменится.

### 5.3. Микрофон → буфер

- На панели микрофона: **«Запись в буфер»** (toggle) + timer.
- Stop → сэмпл в `__buffer__` с draft metadata (class optional).
- Modal «Сохранить в коллекцию» — выбор user/system + class/label.

### 5.4. Import с диска

- Drag-drop или file input → preview (waveform через engine) → metadata form → target collection.

---

## 6. Связь с benchmark

- **Export manifest** только из системной коллекции `__system_benchmark__`:
  - `yarn media:export-manifest --out data/detectors-benchmark/v0.2/manifest.json`
  - или кнопка UI «Export for benchmark»
- Формат строк manifest совместим с [`data/detectors-benchmark/v0.1/manifest.json`](../data/detectors-benchmark/v0.1/manifest.json).
- WAV на export: symlink/copy в `data/…` для CI **только синтетика**; полевые остаются на backend path + manifest с `storageRef` или relative path при Electron.

---

## 7. Hub-события (контракт)

| Событие | Издатель | Подписчик |
|---------|----------|-----------|
| `media-library.capture.start` | Mic plugin / module | media-library-service |
| `media-library.capture.stop` | Mic plugin | → flush buffer → `MediaSample` in buffer |
| `media-library.sample.moved` | service | UI refresh, telemetry optional |

Плагины **не** импортируют `media-library-service` напрямую — только hub (слабая связанность §1c).

---

## 8. Фазы реализации

| Фаза | Deliverable |
|------|-------------|
| **A0** | Этот документ + типы в `@membrana/core` или `media-library-service/types` |
| **A1** | `IStorageBackend` + `BrowserLimitedStorageBackend` + in-memory buffer; unit tests · task `media-library-a1-storage` |
| **A2** | Client module: коллекции user/system/buffer, quota banner · task `media-library-a2-ui` |
| **A3** | Mic hub → buffer record *(задача — следующие дни)* |
| **A4** | `ElectronFsStorageBackend` + preload API *(следующие дни)* |
| **A5** | `packages/background-media` + `ServerStorageBackend` *(следующие дни)* |
| **A6** | Export manifest → `yarn benchmark:detectors` *(следующие дни)* |

Приоритет: **A1–A3** не блокируют #47; **A5** параллельно infra; **A6** для stage-gate.

---

## 9. Открытые решения (LGTM Teamlead)

| # | Вопрос | Предложение |
|---|--------|-------------|
| 1 | Имя пакета | `@membrana/media-library-service` |
| 2 | Имя server | `@membrana/background-media` |
| 3 | Buffer: один сэмпл или список | **Список** с max N (напр. 10) и max MB |
| 4 | Sync buffer между вкладками | Нет в v1 |
| 5 | OPFS vs IndexedDB | IndexedDB v1; OPFS если quota IDB мала |

---

## 10. Связанные файлы (текущее состояние)

| Уже есть | Роль после внедрения |
|----------|----------------------|
| `AudioFileUploadModule` | Preview/play; позже «Import to library» |
| `loadAudioBuffer` / engine | Decode для preview |
| `datasets/.gitkeep` | Сырьё вне git; server/Electron paths |
| `generate-dataset-synthetics.mjs` | По-прежнему CI; system collection — полевое дополнение |

---

*Версия: 2026-06-09 · статус: draft для LGTM*
