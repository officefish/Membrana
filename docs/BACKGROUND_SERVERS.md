# Фоновые серверы Membrana (`packages/background-*`)

> **Статус:** `background-office` — реализован (v0.1). `background-media` — **в разработке** (эпик [#58](https://github.com/officefish/Membrana/issues/58), промпты A5a–A5c).
>
> Связанные документы: [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1d–§1e, [`MEDIA_LIBRARY_ARCHITECTURE.md`](./MEDIA_LIBRARY_ARCHITECTURE.md), [`INTEGRATIONS_STRATEGY.md`](./INTEGRATIONS_STRATEGY.md) §1.1 (эшелон 2).

---

## Зачем семейство `background-*`

Membrana — прежде всего **клиент** (браузер / Electron) с аудио-анализом на узле. Не всё должно жить в браузере:

| Потребность | Почему не в клиенте |
|-------------|-------------------|
| Секреты внешних API (Claude, Linear) | Нельзя класть ключи в Vite-бандл |
| Webhook'и от Linear/GitHub | Нужен публичный HTTPS-endpoint |
| Крупные WAV-датасеты | IndexedDB ограничен (~100 MB fallback) |
| Персистентные шаблоны trends между устройствами | localStorage не масштабируется на команду/поле |

Поэтому рядом с `apps/client` существуют **автономные Node.js-серверы** в `packages/background-*`. Они **не** входят в граф `packages/services/*` и **не** импортируют `@membrana/core`, `@membrana/agenda`, `apps/client`.

---

## Два сервера — две роли (не смешивать)

```mermaid
flowchart LR
  subgraph client [apps/client]
    UI[React UI]
    MLS[media-library-service]
    TPL[user templates store]
  end

  subgraph office [background-office :3000]
    INT[Claude / Linear / GitHub]
  end

  subgraph media [background-media :3010]
    PG[(PostgreSQL via Prisma)]
    VOL[(audio blob volume)]
  end

  UI --> INT
  MLS --> media
  TPL --> media
  INT -.->|не хранит blobs| X[ ]
```

| Пакет | Порт (dev) | Stateful? | Назначение |
|-------|------------|-----------|------------|
| **`@membrana/background-office`** | 3000 | Нет | **Интеграционный шлюз:** Anthropic Claude, Linear GraphQL, Linear webhooks, GitHub Issues (persona-контекст). Скрипты `yarn ask`, CI, dev-tools. |
| **`@membrana/background-media`** | 3010 | **Да** | **Data-plane веб-клиента:** библиотека сэмплов (коллекции, multipart upload, blob storage), trends-шаблоны (JSON), квота. Изоляция по **`deviceId`** (узел/клиент). Стек: **NestJS + Fastify**, **Prisma + PostgreSQL**. |

### Жёсткие границы

**В `background-office` НЕ добавлять:**

- загрузку/хранение WAV;
- CRUD коллекций сэмплов;
- trends-шаблоны пользователя;
- PostgreSQL / файловые volume под пользовательские данные.

**В `background-media` НЕ добавлять:**

- вызовы Anthropic / Linear / GitHub;
- приём webhook'ов тикет-трекеров;
- persona-промпты из `docs/virtual-team/`;
- тяжёлый inference ML (эшелон 2 для моделей — отдельный пакет в будущем, не office и не media v1).

**Общее для обоих:**

- NestJS + TypeScript strict + zod env + pino + `X-Membrana-Token` на `/v1/*`;
- `GET /health` без авторизации;
- отдельный деплой и DNS (напр. `api.<domain>` vs `media.<domain>`);
- автономность от монорепо-клиента (локальные DTO, без `@membrana/trends-detector-service` в runtime).

**Различие HTTP-адаптеров (намеренное):**

| Пакет | Адаптер | Зачем |
|-------|---------|-------|
| `background-office` | **Express** (`@nestjs/platform-express`) | raw body для HMAC webhook'ов Linear — уже в v0.1 |
| `background-media` | **Fastify** (`@nestjs/platform-fastify`) | multipart upload, стриминг blob'ов, меньше оверхеда на I/O |

Не унифицировать адаптеры без ADR: office и media деплоятся отдельно.

---

## Стек `background-media` (зафиксировано до A5a)

| Слой | Технология | Примечание |
|------|------------|------------|
| HTTP | NestJS 10 + **Fastify** | `@nestjs/platform-fastify`, `@fastify/multipart` |
| ORM | **Prisma** | `schema.prisma`, `prisma migrate` |
| БД | **PostgreSQL** 16 | метаданные: devices, collections, samples, templates |
| Blobs | Файловый volume | оригинальный файл как загружен; путь в `storage_ref` |
| Метаданные аудио | **`music-metadata`** | duration, sampleRate, channels для wav/mp3/flac/ogg на upload |
| WAV (опционально) | **`wavefile`** | разбор/валидация PCM-заголовка WAV, если нужна строгая проверка |
| Логи / env | pino, zod | как в office |

Сырые аудио-байты **не** в PostgreSQL (BYTEA) в v1.

### Мультиформатная библиотека сэмплов

Библиотека **не ограничена WAV**: сервер принимает несколько контейнеров, хранит blob в исходном формате, отдаёт с корректным `Content-Type`.

| Формат (v1) | MIME | Метаданные на upload |
|-------------|------|----------------------|
| WAV | `audio/wav`, `audio/wave` | `music-metadata` + при необходимости `wavefile` (PCM) |
| MP3 | `audio/mpeg` | `music-metadata` |
| FLAC | `audio/flac` | `music-metadata` |
| OGG | `audio/ogg` | `music-metadata` |

Поля сэмпла (расширение `MediaSample`): `audioFormat` (`'wav' \| 'mp3' \| 'flac' \| 'ogg'`), `contentType`. Воспроизведение в клиенте — через `audio-engine` / `decodeAudioData` (форматы, поддерживаемые браузером). Транскодирование на сервере — **out of scope v1** (отдельная задача, если понадобится единый WAV для benchmark).

Whitelist MIME и max upload — в env (`MEDIA_ALLOWED_MIME`, `MAX_UPLOAD_BYTES`). Неизвестный формат → `415 Unsupported Media Type`.

---

## `background-media` — модель данных и мульти-узел

Каждый **узел** (браузер, Electron, полевой ПК с микрофоном или антенной) — отдельный потребитель:

```text
Device (deviceId)
 ├── collections[]     — buffer / user / system benchmark
 ├── samples[]         — метаданные в PG (Prisma), аудио-blob на volume
 └── trend_templates[] — JSON PatternTemplate (ключи user:*)
```

- Регистрация: `POST /v1/devices` → клиент сохраняет `deviceId` (см. будущий `mediaDeviceRegistry`).
- Все resource routes: `/v1/devices/:deviceId/...`.
- Заголовок `X-Membrana-Device-Id` на запросах клиента (дублирует path).
- Узел A **не видит** сэмплы и шаблоны узла B.

Клиентский fallback при недоступности media-server: `BrowserLimitedStorageBackend` (IndexedDB) + localStorage для шаблонов — см. [`MEDIA_LIBRARY_ARCHITECTURE.md`](./MEDIA_LIBRARY_ARCHITECTURE.md) §4.3.

---

## API surface (media v1, план)

| Группа | Примеры | Потребитель |
|--------|---------|-------------|
| Health | `GET /health` | `resolveMediaLibraryStorageMode()` |
| Devices | `POST /v1/devices` | первый запуск клиента |
| Quota | `GET .../quota` | `StorageRuntimeIndicator`, banner |
| Collections / samples | CRUD + multipart | `ServerStorageBackend` → `@membrana/media-library-service` |
| Trends templates | `GET/PUT .../trends-templates` | `userTemplatesPersistence` / zustand store |

Полная спецификация: [`prompts/BACKGROUND_MEDIA_A5A_SERVER_PROMPT.md`](./prompts/BACKGROUND_MEDIA_A5A_SERVER_PROMPT.md).

---

## Куда класть новую функциональность (чеклист для разработчика)

| Вопрос | Куда |
|--------|------|
| Новый внешний API или webhook? | `background-office` (новый Nest-модуль) |
| Пользовательское аудио (wav/mp3/flac/ogg) / коллекция / export manifest? | `background-media` |
| Пользовательский шаблон trends (JSON)? | `background-media` (не office) |
| Чистая математика FFT/детектор? | `packages/services/*` |
| UI плагин? | `apps/client` |
| Синхронизация offline ↔ server | клиент + media API (отдельная задача) |
| Inference нейросети на GPU | будущий `background-inference` или sidecar (не media v1) |

Перед PR, расширяющим `background-*`, обновить этот файл и [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1d–§1e.

---

## Команды и пакеты

| Задача | Команда / путь |
|--------|----------------|
| Dev office | `yarn office:dev` |
| Dev media (после A5a) | `yarn media:dev` (планируется) |
| Docker media (после A5b) | `yarn media:docker:up` (планируется) |
| README office | [`packages/background-office/README.md`](../packages/background-office/README.md) |
| README media | `packages/background-media/README.md` (после A5a) |

---

## Задачи и история решений

| Артефакт | Ссылка |
|----------|--------|
| GitHub Issue (эпик) | [#58](https://github.com/officefish/Membrana/issues/58) |
| Реестр | `background-media-v1`, `background-media-a5a-server`, … |
| Консилиум 2026-06-11 | [`seanses/background-media-v1-consilium-2026-06-11.md`](./seanses/background-media-v1-consilium-2026-06-11.md) |
| Журнал office v0.1 | [`discussions/background-office-v0.1.md`](./discussions/background-office-v0.1.md) |

---

*Версия: 2026-06-11 (стек: NestJS+Fastify, Prisma+PG, мультиформат audio) · LGTM: ожидается при старте A5a*
