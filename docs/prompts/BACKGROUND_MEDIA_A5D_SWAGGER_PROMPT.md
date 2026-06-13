# Промпт: background-media A5d — полная Swagger/OpenAPI документация

> **Task-промпт для агента-разработчика.**
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Эпик: [`BACKGROUND_MEDIA_V1_EPIC_PROMPT.md`](./BACKGROUND_MEDIA_V1_EPIC_PROMPT.md).
> Размер: **M**. Ожидаемый артефакт: **1 PR**.
> Реестр: `id` = `background-media-a5d-swagger`.

---

## Контекст

Пакет `@membrana/background-media` (NestJS + Fastify, Prisma, blob volume) уже экспонирует REST API v1 и **частичный** Swagger: `DocumentBuilder` + `@ApiTags` / `@ApiOperation` на контроллерах, UI на `/docs` **только при** `NODE_ENV !== 'production'`.

**Проблема:** OpenAPI-схемы неполные — inline body-классы без `@ApiProperty`, нет `@ApiResponse`, multipart upload не описан для Swagger UI, нет `verify-swagger` как у `background-office`. README упоминает `/docs`, но prod (`https://media.membrana.space`) Swagger не отдаёт.

**Не меняем:** поведение HTTP-контрактов, Prisma schema, клиентские URL — только документация и инфраструктура проверки.

**GitHub Issue:** #64.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) | Граница media vs office |
| [`BACKGROUND_MEDIA_A5A_SERVER_PROMPT.md`](./BACKGROUND_MEDIA_A5A_SERVER_PROMPT.md) | Исходный API-контракт |
| [`packages/background-media/README.md`](../../packages/background-media/README.md) | Таблица маршрутов |
| [`packages/background-office/scripts/verify-swagger.mjs`](../../packages/background-office/scripts/verify-swagger.mjs) | Эталон verify |
| [`LINEAR_GITHUB_SYNC_REGULATION.md`](./LINEAR_GITHUB_SYNC_REGULATION.md) | Linear R1 (неблокирующий) |

---

## Промпт целиком (для вставки агенту)

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). План (1–2 абзаца + файлы) → реализация → verify. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).

---

### Что построить

Довести Swagger/OpenAPI `@membrana/background-media` до уровня `background-office`:

1. **Полные схемы** для всех эндпоинтов (см. таблицу API ниже).
2. **`scripts/verify-swagger.mjs`** в пакете + `yarn media:verify-swagger` в корневом `package.json`.
3. **Политика prod:** env `SWAGGER_ENABLED` (boolean, default: `true` если `NODE_ENV !== 'production'`, иначе `false`). При `true` — монтировать `/docs` и `/docs-json` как в office. Задокументировать в README и `docs/deploy/BACKGROUND_MEDIA_DEPLOY.md`.
4. **README** — раздел Swagger: URL, авторизация `X-Membrana-Token` в UI (`persistAuthorization: true`), список тегов.

---

### Каталог API (канон для OpenAPI)

Авторизация: все `/v1/*` — заголовок `X-Membrana-Token` (guard `ApiTokenGuard`). Опционально `X-Membrana-Device-Id` должен совпадать с `:deviceId` в path (`DeviceGuard`).

| Метод | Path | Tag | Кратко |
|-------|------|-----|--------|
| GET | `/health` | Health | Публичный health |
| POST | `/v1/devices` | Devices | Регистрация device |
| GET | `/v1/devices/:deviceId` | Devices | Метаданные device |
| GET | `/v1/devices/:deviceId/quota` | Devices | Квота хранилища |
| GET | `/v1/devices/:deviceId/collections` | Collections | Список коллекций |
| POST | `/v1/devices/:deviceId/collections` | Collections | Создать user-коллекцию |
| POST | `/v1/devices/:deviceId/collections/ensure-reserved` | Collections | buffer + system коллекции |
| DELETE | `/v1/devices/:deviceId/collections/:collectionId` | Collections | Удалить user-коллекцию |
| GET | `.../collections/:collectionId/samples` | Samples | Список сэмплов |
| POST | `.../collections/:collectionId/samples` | Samples | Multipart upload (`file`, optional `meta` JSON) |
| GET | `.../samples/:sampleId/blob` | Samples | Binary stream |
| DELETE | `.../samples/:sampleId` | Samples | Удалить сэмпл |
| POST | `.../samples/:sampleId/move` | Samples | Body: `{ toCollectionId }` |
| GET | `/v1/devices/:deviceId/trends-templates` | Trends templates | Pack `version: 1` |
| PUT | `/v1/devices/:deviceId/trends-templates` | Trends templates | Replace pack |
| PATCH | `/v1/devices/:deviceId/trends-templates/:key` | Trends templates | Upsert one (`user:*` keys) |

**Enum (из Prisma, отразить в схемах):**

- `DeviceKind`: `microphone` \| `antenna` \| `other`
- `CollectionKind`: `buffer` \| `user` \| `system`
- `SampleLabel`: `drone` \| `not_drone` \| `unlabeled`
- `SampleSource`: `mic_recording` \| `disk_import` \| `synthetic` \| `move`
- `AudioFormat`: `wav` \| `mp3` \| `flac` \| `ogg`

**MIME upload:** `audio/wav`, `audio/mpeg`, `audio/flac`, `audio/ogg` (см. `MEDIA_ALLOWED_MIME`).

**Типичные ошибки в OpenAPI:** `401` (нет/неверный token), `404` (device/collection/sample), `400` (валидация upload/meta/templates).

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Bootstrap | `packages/background-media/src/main.ts` | DocumentBuilder, `SWAGGER_ENABLED`, setup `/docs` |
| DTO | `packages/background-media/src/modules/**/**.dto.ts` | `@ApiProperty` request/response |
| Controllers | `.../modules/*/*.controller.ts` | `@ApiResponse`, `@ApiSecurity('api-token')`, multipart `@ApiBody` |
| Config | `src/config/env.schema.ts` | `SWAGGER_ENABLED` zod |
| Verify | `packages/background-media/scripts/verify-swagger.mjs` | In-memory Nest (Fastify), GET `/docs/`, `/docs-json`, path count |
| Root scripts | `package.json` | `media:verify-swagger` |

**Запрещено:**

- Зависимости media → client / agenda / office.
- Менять URL-пути или семантику API без ADR.
- Коммитить реальные токены в generated JSON.
- Подключать Express-only `swagger-ui-express` (пакет на Fastify).

**Multipart в Swagger:** использовать `@ApiConsumes('multipart/form-data')` + `@ApiBody` с `schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, meta: { type: 'string', description: 'JSON UploadMetaOverride' } } }` (или эквивалент Nest decorator).

**verify-swagger:** не требовать живой PostgreSQL — мок `PrismaService` / `overrideProvider` как в unit-тестах, либо минимальный in-memory stub; цель — OpenAPI document + HTTP 200 на `/docs-json`.

---

### Тесты

| Область | Минимум |
|---------|---------|
| verify-swagger | `yarn media:verify-swagger` exit 0, ≥ 15 paths в OpenAPI |
| Существующие vitest | не ломать |
| lint/typecheck | `yarn workspace @membrana/background-media typecheck` |

---

### Definition of Done

- [ ] Все 16 v1-маршрутов + `/health` в `/docs-json` с request/response схемами.
- [ ] DTO вынесены в `*.dto.ts` с `@ApiProperty`; enum — `@ApiProperty({ enum: ... })`.
- [ ] `SWAGGER_ENABLED` в env schema + `.env.example` + README.
- [ ] `yarn media:verify-swagger` в корне; скрипт в `packages/background-media/package.json`.
- [ ] `docs/deploy/BACKGROUND_MEDIA_DEPLOY.md` — строка про `/docs` (если enabled).
- [ ] `yarn workspace @membrana/background-media lint typecheck test` — зелёный.
- [ ] LGTM Teamlead.

---

### Out of scope

- Публичный Swagger без token-gate на `/v1` (только описание auth в OpenAPI).
- Изменение `background-office` Swagger.
- Клиентский UI для API explorer в `apps/client`.
- Автогенерация TS-клиента из OpenAPI.

---

### Порядок работы ролей

1. **Teamlead** — утвердить `SWAGGER_ENABLED` и паритет с office.
2. **Структурщик** — DTO-модули, verify script, env.
3. **Математик** — —
4. **Музыкант** — схемы MIME/format enum для upload/blob.
5. **Верстальщик** — —

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: PR packages/background-media + docs
Definition of Done: verify-swagger OK, /docs-json полный
```

---

## Заметки для человека-постановщика

1. GitHub Issue **#64** (`enhancement`, `documentation`, `status:triage`).
2. Реестр: `background-media-a5d-swagger`, `status: active`.
3. Linear R1 (неблокирующий): привязать ticket к #64 — [`LINEAR_GITHUB_SYNC_REGULATION.md`](./LINEAR_GITHUB_SYNC_REGULATION.md).
4. После merge: отчёт в Issue → `yarn task:archive background-media-a5d-swagger --notes "PR #…"`.

### Проверка после PR

```bash
yarn workspace @membrana/background-media build
yarn media:verify-swagger
# dev:
yarn media:dev
# http://localhost:3010/docs — Authorize X-Membrana-Token
```

---

## Связь с дорожной картой

Подзадача эпика `background-media-v1` (#58), логически после A5a (API) и A5b (docker). Улучшает DX интеграторов и агентов, работающих с `ServerStorageBackend`.
