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

## Скрипты

| Команда (корень) | Назначение |
|------------------|------------|
| `yarn media:dev` | dev-сервер (watch) |
| `yarn media:build` | prisma generate + tsc |
| `yarn media:migrate` | `prisma migrate deploy` |

| Workspace | Назначение |
|-----------|------------|
| `yarn workspace @membrana/background-media test` | unit-тесты |
| `yarn workspace @membrana/background-media prisma:migrate:dev` | новая миграция в dev |

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
