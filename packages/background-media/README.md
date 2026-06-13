# @membrana/background-media

Web **data-plane** для Membrana: библиотека сэмплов (мультиформат audio), trends-шаблоны, изоляция по `deviceId`.

Стек: **NestJS + Fastify**, **Prisma + PostgreSQL**, blob volume.

> Не путать с `@membrana/background-office` (Claude / Linear / GitHub). Канон границ: [`docs/BACKGROUND_SERVERS.md`](../../docs/BACKGROUND_SERVERS.md).

## Быстрый старт (локально)

### 1. PostgreSQL

```bash
cd packages/background-media
docker compose -f docker-compose.dev.yml up -d
```

Порт **5433** → `postgresql://membrana:membrana@localhost:5433/membrana_media`

### 2. Env

```bash
cp .env.example .env
# при необходимости поправьте API_INTERNAL_TOKEN
```

Из **корня** репозитория при `yarn media:dev` подмешиваются `./.env` и `packages/background-media/.env`.

### 3. Миграции и запуск

```bash
# из корня
yarn install
yarn media:migrate
yarn media:dev
```

- Health: http://localhost:3010/health  
- Swagger: http://localhost:3010/docs  

### 4. Smoke (curl)

```bash
curl http://localhost:3010/health

curl -X POST http://localhost:3010/v1/devices \
  -H "Content-Type: application/json" \
  -H "X-Membrana-Token: dev-token-change-me" \
  -d "{\"name\":\"lab-node\",\"kind\":\"microphone\"}"
```

## Docker Compose (полный стек, A5b)

API + PostgreSQL + persistent blob volume. Нужен Docker Desktop / Engine.

```bash
# из корня репозитория
cp packages/background-media/.env.docker.example packages/background-media/.env.docker
# задайте API_INTERNAL_TOKEN и POSTGRES_PASSWORD

yarn media:docker:build
yarn media:docker:up
curl http://localhost:3010/health
```

| Команда (корень) | Назначение |
|------------------|------------|
| `yarn media:docker:build` | собрать образ `membrana/background-media:local` |
| `yarn media:docker:up` | поднять `postgres` + `media-api` |
| `yarn media:docker:down` | остановить (volumes сохраняются) |
| `yarn media:docker:logs` | логи API |

При старте контейнера `media-api` автоматически выполняется `prisma migrate deploy`.

**Только PostgreSQL для dev** (без API в Docker): `yarn media:db:up` → `docker-compose.dev.yml` (порт **5433**).

## Production deployment (VPS, A5c)

Целевая схема: **VPS + Docker Compose + Caddy (TLS)**. Office (`:3000`) и media (`:3010`) — отдельные upstream'ы.

| Шаг | Действие |
|-----|----------|
| 1 | DNS `media.<domain>` → A-record VPS |
| 2 | `deploy/generate-media-env.sh` → `/etc/membrana/media.env` |
| 3 | `deploy/media-stack.sh build && deploy/media-stack.sh up` |
| 4 | Caddy: `deploy/Caddyfile.media.example` |
| 5 | `curl https://media.<domain>/health` |

Полный чеклист: [`docs/deploy/BACKGROUND_MEDIA_DEPLOY.md`](../../docs/deploy/BACKGROUND_MEDIA_DEPLOY.md).

| Env (сервер) | Назначение |
|--------------|------------|
| `API_INTERNAL_TOKEN` | `X-Membrana-Token` для всех `/v1/*` |
| `DATABASE_URL` | задаётся в compose из `POSTGRES_*` |
| `MEDIA_BLOB_DIR` | `/data/blobs` в контейнере; на хосте — `MEDIA_BLOB_HOST_DIR` |
| `MEDIA_QUOTA_BYTES_PER_DEVICE` | квота на устройство (default 1 GiB) |
| `SWAGGER_ENABLED` | `false` в prod (default); `true` — `/docs` и `/docs-json` для интеграторов |

| Env (клиент, Vite build) | Пример |
|---------------------------|--------|
| `VITE_MEDIA_SERVER_URL` | `https://media.<domain>` |
| `VITE_MEDIA_API_TOKEN` | тот же `API_INTERNAL_TOKEN` |

Секреты — только на сервере и в CI/build env клиента, **не в git**.

## Скрипты

| Команда (корень) | Назначение |
|------------------|------------|
| `yarn media:dev` | dev-сервер (watch) |
| `yarn media:build` | prisma generate + tsc |
| `yarn media:migrate` | `prisma migrate deploy` |
| `yarn media:db:up` / `media:db:down` | только PG (dev) |
| `yarn media:verify-swagger` | OpenAPI smoke (`/docs`, `/docs-json`) без живой БД |

| Workspace | Назначение |
|-----------|------------|
| `yarn workspace @membrana/background-media test` | unit-тесты |
| `yarn workspace @membrana/background-media verify:swagger` | то же, из пакета |
| `yarn workspace @membrana/background-media prisma:migrate:dev` | новая миграция в dev |

## Swagger / OpenAPI

| URL | Назначение |
|-----|------------|
| `/docs` | Swagger UI |
| `/docs-json` | OpenAPI 3 JSON |

**Включение:** `SWAGGER_ENABLED` (default: `true` в development/test, `false` в production). В Swagger UI нажмите **Authorize** и введите `API_INTERNAL_TOKEN` как `X-Membrana-Token`.

Теги: Health, Devices, Collections, Samples, Trends templates — полное описание request/response и multipart upload.

Проверка без поднятия порта:

```bash
yarn media:verify-swagger
```

## API (v1)

Все `/v1/*` требуют `X-Membrana-Token`. Resource routes — `deviceId` в path.

| Группа | Префикс |
|--------|---------|
| Devices | `POST /v1/devices`, `GET /v1/devices/:deviceId`, `GET .../quota` |
| Collections | `/v1/devices/:deviceId/collections` |
| Samples | `.../collections/:id/samples`, `.../samples/:id/blob` |
| Trends | `/v1/devices/:deviceId/trends-templates` |

Поддерживаемые audio MIME: `audio/wav`, `audio/mpeg`, `audio/flac`, `audio/ogg` (см. `MEDIA_ALLOWED_MIME`).

## Env

См. [`.env.example`](./.env.example).
