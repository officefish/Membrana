# @membrana/background-office

Централизованный **HTTP-сервер** (единый процесс, один порт) для внешних интеграций Membrana: Anthropic Claude, Linear (GraphQL + webhooks), чтение GitHub Issues через Octokit. Пакет **автономен в v0.1**: не зависит от `@membrana/core`, `apps/client` и других внутренних библиотек — только публичные npm-пакеты.

## Почему NestJS

Выбран **NestJS**: модульная структура (`ClaudeModule`, `LinearModule`, `WebhooksModule`, `GithubModule`), встроенный DI, предсказуемое разрастание маршрутов и guard’ов, поддержка **raw body** для проверки HMAC Linear без обходных путей. Альтернатива Fastify была бы легче по рантайму, но для «офисного» шлюза с несколькими интеграциями и единым конфигом Nest даёт меньше связующего кода при тех же принципах (контроллер → сервис → HTTP-клиент).

## Требования

- Node.js ≥ 20  
- Yarn 4 (как в монорепо)  
- Переменные окружения (см. `.env.example` в этом пакете). При запуске `yarn office:dev` из **корня** репозитория автоматически подмешиваются, если существуют: `./.env`, затем `./packages/background-office/.env` (второй перекрывает совпадающие ключи). Из каталога пакета читается только `./.env`.

## Подготовка промптов

Перед `build` / `test` скрипт `prepare` копирует markdown из `docs/` в `packages/background-office/prompts/` (см. `scripts/copy-prompts.cjs`). В продакшене сервер читает только эту копию, а не живые файлы репозитория.

## Скрипты

| Команда | Назначение |
|---------|------------|
| `yarn workspace @membrana/background-office prepare` | Скопировать промпты в `prompts/` |
| `yarn workspace @membrana/background-office build` | `prepare` + `tsc` |
| `yarn workspace @membrana/background-office dev` | `prepare` + `tsx watch src/main.ts` |
| `yarn workspace @membrana/background-office start` | `node dist/main.js` (после `build`) |
| `yarn workspace @membrana/background-office test` | Vitest, интеграционные тесты с моком `fetch` |
| `yarn workspace @membrana/background-office verify:swagger` | Проверка Swagger UI и `/docs-json` (без реальных API-ключей) |
| `yarn workspace @membrana/background-office lint` | ESLint из корня монорепо |

Из корня репозитория: `yarn office:dev`, `yarn office:build`, `yarn office:verify-swagger`.

## Swagger

При запущенном сервере (`yarn office:dev`):

| URL | Назначение |
|-----|------------|
| `http://localhost:<PORT>/docs` | Swagger UI |
| `http://localhost:<PORT>/docs-json` | OpenAPI JSON |

Быстрая проверка без `.env` и без поднятия порта: `yarn office:verify-swagger` (сборка + HTTP к in-memory приложению).

## Эндпоинты

Все внутренние маршруты `/v1/*` требуют заголовок `X-Membrana-Token: <API_INTERNAL_TOKEN>`. Без токена — **401**.

### `GET /health`

Без авторизации. Ответ: `{ "status": "ok", "version": "…", "uptime": <секунды> }`.

### Claude

**`POST /v1/claude/ask`** — универсальный вызов Messages API.

```bash
curl -sS -X POST "http://localhost:3000/v1/claude/ask" \
  -H "Content-Type: application/json" \
  -H "X-Membrana-Token: $API_INTERNAL_TOKEN" \
  -d '{"messages":[{"role":"user","content":"Привет"}]}'
```

**`POST /v1/claude/persona/:name/ask`** — persona (`vesnin` | `ozhegov` | `dynin` | `boyarskiy` | `rodchenko`), сборка промпта как в `scripts/ask-persona.mjs` (документы из `prompts/`).

```bash
curl -sS -X POST "http://localhost:3000/v1/claude/persona/vesnin/ask" \
  -H "Content-Type: application/json" \
  -H "X-Membrana-Token: $API_INTERNAL_TOKEN" \
  -d '{"question":"Кратко: граница пакета X?","includeStrategicDocs":true,"context":{"source":"raw","text":"…"}}'
```

### Linear

**`GET /v1/linear/issue/:id`** — `:id` в формате `TEC-42`.

**`POST /v1/linear/issue/:id/comment`** — тело `{ "body": "…" }`.

### Webhook Linear

**`POST /webhooks/linear`** — без `X-Membrana-Token`. Подпись заголовка `Linear-Signature` (hex HMAC-SHA256 от **raw** тела, ключ `LINEAR_WEBHOOK_SECRET`), сравнение через `crypto.timingSafeEqual`. Неверная подпись — **403** без деталей. Идемпотентность по заголовку `Linear-Delivery` (LRU ~10 мин). После ответа **200** `{ "received": true }` обработка только логируется в фоне.

## Прод: HTTPS

Слушает HTTP (в dev — `localhost`). В продакшене TLS должен терминироваться на reverse proxy (nginx, Caddy, Cloudflare и т.д.).

## Таймауты

- Anthropic: 60 s  
- Linear GraphQL / Octokit: 30 s  

## Graceful shutdown

`SIGTERM` / `SIGINT`: закрытие HTTP-сервера с ожиданием до 10 s, затем `app.close()`.
