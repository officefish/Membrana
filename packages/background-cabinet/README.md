# @membrana/background-cabinet

Identity и domain API для Membrane Platform: login/password, сессии, в перспективе — мембраны, узлы, ключи TTL.

Эпик: [#67](https://github.com/officefish/Membrana/issues/67) · Канон: [`docs/MEMBRANE_PLATFORM.md`](../../docs/MEMBRANE_PLATFORM.md).

## Что делает (MP1)

- `GET /health` — проверка живости
- `POST /v1/auth/register` — регистрация (если `ALLOW_REGISTRATION=true`)
- `POST /v1/auth/login` — вход, выдача Bearer-сессии
- `POST /v1/auth/logout` — отзыв сессии
- `GET /v1/auth/me` — текущий пользователь

Стек: NestJS + Fastify, Prisma + PostgreSQL, bcryptjs, pino.

## Установка (dev)

```bash
yarn install
yarn cabinet:db:up
cp packages/background-cabinet/.env.example packages/background-cabinet/.env
yarn cabinet:migrate
yarn cabinet:seed
yarn cabinet:dev
```

Параллельно SPA: `yarn workspace @membrana/cabinet dev` → http://localhost:5174

## Переменные окружения

См. [`packages/background-cabinet/.env.example`](./.env.example).

| Переменная | Назначение |
|------------|------------|
| `PORT` | HTTP-порт (default `3020`) |
| `DATABASE_URL` | PostgreSQL |
| `API_INTERNAL_TOKEN` | Service-to-service (MP3+) |
| `SESSION_TTL_HOURS` | Срок сессии после login |
| `CABINET_CORS_ORIGINS` | Origins для `apps/cabinet` |
| `ALLOW_REGISTRATION` | Разрешить `POST /v1/auth/register` |

## Демо-пользователь (seed)

| Login | Password |
|-------|----------|
| `demo` | `demo12345` |

## API (кратко)

### Login

```http
POST /v1/auth/login
Content-Type: application/json

{ "login": "demo", "password": "demo12345" }
```

Ответ: `{ "token": "…", "expiresAt": "…", "user": { "id": "…", "login": "demo" } }`

### Me

```http
GET /v1/auth/me
Authorization: Bearer <token>
```

## Команды

| Команда | Действие |
|---------|----------|
| `yarn cabinet:dev` | Dev-сервер с watch |
| `yarn cabinet:build` | Сборка |
| `yarn cabinet:migrate` | `prisma migrate deploy` |
| `yarn cabinet:docker:up` | Docker Compose (API + PG + SPA) |
| `deploy/cabinet-stack.sh` | VPS prod (см. [`docs/deploy/BACKGROUND_CABINET_DEPLOY.md`](../../docs/deploy/BACKGROUND_CABINET_DEPLOY.md)) |

## Границы

Не хранит WAV, не вызывает Claude/Linear — см. [`docs/BACKGROUND_SERVERS.md`](../../docs/BACKGROUND_SERVERS.md).
