# Промпт: background-media A5a — HTTP-сервер, PostgreSQL, API

> **Task-промпт для агента-разработчика.**
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Эпик: [`BACKGROUND_MEDIA_V1_EPIC_PROMPT.md`](./BACKGROUND_MEDIA_V1_EPIC_PROMPT.md).
> Размер: **L**. Ожидаемый артефакт: **1 PR**.
> Реестр: `id` = `background-media-a5a-server`.

---

## Контекст

Клиент уже имеет `@membrana/media-library-service` (`IStorageBackend`), sample-library UI, trends user templates (zustand + `userTemplatesPersistence.ts` с URL `/api/v1/trends-templates`). Нужен сервер `@membrana/background-media` — отдельный NestJS-пакет по образцу `background-office`, **с состоянием** (PostgreSQL + файловый volume для аудио-blob'ов).

**Зафиксированный стек (не менять без ADR):**

| Компонент | Выбор |
|-----------|--------|
| HTTP | NestJS 10 + **Fastify** (`@nestjs/platform-fastify`) — **не** Express (office остаётся на Express для raw webhook body) |
| ORM | **Prisma** (`schema.prisma`, `prisma migrate`) |
| БД | **PostgreSQL** 16 |
| Multipart | `@fastify/multipart` |
| Метаданные аудио | **`music-metadata`** (wav, mp3, flac, ogg) |
| WAV PCM (опц.) | **`wavefile`** — валидация заголовка / sample rate при `audioFormat === 'wav'` |

**Не путать с `background-office`:** office — Claude/Linear/GitHub; media — blobs + метаданные + шаблоны.

**GitHub Issue:** #58 (эпик).

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana (**Vesnin**). План → реализация → тесты. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).

### Что построить

Новый пакет `packages/background-media/` (`@membrana/background-media`):

1. **NestJS + Fastify** + TypeScript strict + zod env + pino.
2. **Prisma + PostgreSQL** — метаданные устройств, коллекций, сэмплов, шаблонов.
3. **Файловый volume** — аудио blobs в исходном формате (`MEDIA_BLOB_DIR`).
4. **REST API** с префиксом `/v1/devices/:deviceId/...`.
5. **Upload pipeline:** multipart → sniff MIME → `music-metadata` → (wav) `wavefile` validate → persist blob + Prisma row.
6. **Клиент:** `ServerStorageBackend` в `media-library-service` + правка `userTemplatesPersistence` URL.
7. **Клиент:** регистрация `deviceId` (localStorage), заголовок `X-Membrana-Device-Id`.
8. **Клиент:** расширить `MediaSample` полями `audioFormat`, `contentType` (см. [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) §2.1).

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| HTTP API | `packages/background-media/src/modules/*` | Controllers, guards, DTO (Fastify) |
| Prisma | `packages/background-media/prisma/` | `schema.prisma`, migrations, `PrismaService` |
| Blob store | `.../blob/` | read/write/delete; extension по `audioFormat` |
| Audio ingest | `.../audio/` | `music-metadata`, `wavefile` (wav), MIME whitelist |
| Client port | `packages/services/media-library/src/backends/server-storage.ts` | `IStorageBackend` |
| Client templates | `apps/client/.../userTemplatesPersistence.ts` | device-scoped URL |
| Device registry | `apps/client/src/lib/mediaDeviceRegistry.ts` | create/load `deviceId` |

**Запрещено:**

- Зависимость `background-media` от `@membrana/core`, `agenda`, `client`, `trends-detector-service` (только JSON DTO).
- Хранение WAV в PostgreSQL BYTEA (v1).
- Смешивание с модулями Claude/Linear в `background-office`.

### Мульти-узел (обязательно v1)

Каждый клиент — **device**:

```typescript
interface Device {
  id: string;           // uuid
  name: string;
  kind: 'microphone' | 'antenna' | 'other';
  createdAt: string;
}
```

- `POST /v1/devices` — регистрация (auth required).
- Все resource paths: `/v1/devices/:deviceId/collections`, `.../samples`, `.../trends-templates`.
- Уникальность: `(device_id, collection_id)`, `(device_id, sample_id)`, `(device_id, template_key)`.

### Auth

Как `background-office`:

- `X-Membrana-Token: <API_INTERNAL_TOKEN>` на все `/v1/*`.
- `GET /health` — без токена.
- `X-Membrana-Device-Id` — обязателен на resource routes (или в path).

### API v1 (минимум)

**Devices**

| Method | Path | Описание |
|--------|------|----------|
| POST | `/v1/devices` | `{ name, kind }` → `{ id, ... }` |
| GET | `/v1/devices/:deviceId` | метаданные узла |

**Quota**

| GET | `/v1/devices/:deviceId/quota` | `{ usedBytes, limitBytes, backend: 'server' }` |

**Collections** (совместимо с `Collection` в media-library-service)

| GET/POST | `/v1/devices/:deviceId/collections` | list / create user |
| DELETE | `.../collections/:id` | запрет delete buffer/system kinds |
| POST | `.../collections/ensure-reserved` | создать buffer + system benchmark если нет |

**Samples**

| GET | `.../collections/:collectionId/samples` | list |
| POST | `.../collections/:collectionId/samples` | `multipart/form-data`: `file` + optional JSON meta override |
| GET | `.../samples/:sampleId/blob` | stream audio; `Content-Type` из `contentType` |
| DELETE | `.../samples/:sampleId` | meta + blob |
| POST | `.../samples/:sampleId/move` | `{ toCollectionId }` |

Meta поля: как `MediaSample` / `NewSampleMeta` в `@membrana/media-library-service`, плюс `audioFormat`, `contentType`, `sizeBytes`. При upload сервер **сам** заполняет duration/sampleRate/channels из `music-metadata`, если клиент не передал.

**Поддерживаемые форматы v1:** `wav`, `mp3`, `flac`, `ogg` (whitelist `MEDIA_ALLOWED_MIME`). Иное → `415`. Транскодирование на сервере — out of scope.

**Trends templates**

| GET | `/v1/devices/:deviceId/trends-templates` | `{ version: 1, templates: PatternTemplate[] }` |
| PUT | `.../trends-templates` | replace pack (JSON body) |
| PATCH | `.../trends-templates/:key` | upsert one (`user:*` keys only) |

Валидация payload — JSON Schema / zod, скопировать поля из `PatternTemplate` (без импорта пакета).

### Prisma schema (стартовая схема)

Файл `packages/background-media/prisma/schema.prisma`. Миграции: `yarn workspace @membrana/background-media prisma migrate dev`.

Модели (минимум):

- `Device` — id, name, kind, createdAt
- `Collection` — deviceId, kind, name, systemKey?
- `Sample` — deviceId, collectionId, title, class, label, source, durationSec, sampleRate, channels, **audioFormat**, **contentType**, sizeBytes, storageRef, notes?
- `TrendTemplatePack` + `TrendTemplate` **или** одна таблица `TrendTemplate` (deviceId, key, payload Json)

Индексы: `(deviceId)`, `(deviceId, collectionId)`, unique `(deviceId, sampleId)`, unique `(deviceId, templateKey)`.

`storageRef` — относительный путь в `MEDIA_BLOB_DIR`, напр. `{deviceId}/{sampleId}.wav`.

### Env (`.env.example`)

```
PORT=3010
NODE_ENV=development
LOG_LEVEL=info
API_INTERNAL_TOKEN=
DATABASE_URL=postgresql://membrana:membrana@localhost:5432/membrana_media
MEDIA_BLOB_DIR=./data/blobs
MEDIA_QUOTA_BYTES_PER_DEVICE=1073741824
MAX_UPLOAD_BYTES=52428800
MEDIA_ALLOWED_MIME=audio/wav,audio/wave,audio/mpeg,audio/flac,audio/ogg
```

### Клиентская интеграция

1. `resolveMediaLibraryStorageMode()` — ping `GET {VITE_MEDIA_SERVER_URL}/health`.
2. `ServerStorageBackend` — реализовать все методы `IStorageBackend`.
3. `userTemplatesPersistence` — URL `.../v1/devices/${deviceId}/trends-templates`.
4. `mediaDeviceRegistry` — при первом запуске `POST /v1/devices`, сохранить id.
5. `StorageRuntimeIndicator` — режим `remote-server` + имя узла.

Env клиента: `VITE_MEDIA_SERVER_URL` (default `http://localhost:3010`).

### Тесты

| Область | Минимум |
|---------|---------|
| Server | Vitest e2e: testcontainers PostgreSQL + `supertest` / inject Fastify |
| Upload | fixture wav + mp3: metadata extracted, blob round-trip |
| media-library | Unit на `ServerStorageBackend` с mocked fetch |
| Prisma | smoke `prisma migrate deploy` на чистой БД |

### Definition of Done

- [ ] `packages/background-media` build + dev на **Fastify** (`yarn workspace @membrana/background-media dev`)
- [ ] Prisma migrations применяются на чистой PostgreSQL
- [ ] CRUD collections/samples + multipart upload (≥ wav + один lossy) + blob download с верным `Content-Type`
- [ ] GET/PUT trends-templates per device
- [ ] Два deviceId не видят чужие сэмплы (integration test)
- [ ] Client `ServerStorageBackend` + device registry; sample-library работает против local server
- [ ] README пакета: эндпоинты, env, `yarn media:dev` в root package.json
- [ ] Swagger `/docs` (как office)
- [ ] `yarn turbo run lint typecheck test build --continue` зелёный
- [ ] LGTM Teamlead

### Out of scope (этот PR)

- Docker Compose (→ A5b)
- Прод-деплой (→ A5c)
- Export manifest для benchmark (A6)
- JWT / per-device tokens (v2)

### Порядок ролей

1. **Teamlead** — границы пакета, LGTM
2. **Структурщик** — Nest modules, client backend, device scoping
3. **Математик** — валидация JSON шаблонов, квота bytes
4. **Музыкант** — smoke: upload WAV + MP3, playback в client через engine
5. **Верстальщик** — device name в StorageRuntimeIndicator

---

## Заметки для постановщика

```bash
yarn workspace @membrana/background-media test
yarn workspace @membrana/client dev
# + local PG + MEDIA_SERVER_URL
```

После merge: `yarn task:archive background-media-a5a-server --notes "PR #…"`.
