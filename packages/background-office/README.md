# @membrana/background-office

Централизованный **HTTP-сервер** (единый процесс, один порт) для внешних интеграций Membrana: Anthropic Claude, Linear (GraphQL + webhooks), чтение GitHub Issues через Octokit. Пакет **автономен в v0.1**: не зависит от `@membrana/core`, `apps/client` и других внутренних библиотек — только публичные npm-пакеты.

> **Соседний сервер:** пользовательские WAV, коллекции сэмплов и trends-шаблоны — **`@membrana/background-media`** (`docs/BACKGROUND_SERVERS.md`). В office **не** добавлять blob storage, PostgreSQL под медиа и CRUD шаблонов trends.

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

## Docker Compose (локальный/staging)

Stateless образ (без PostgreSQL). Нужен Docker Engine + Compose v2.

```bash
# из корня репозитория
cp packages/background-office/.env.docker.example packages/background-office/.env.docker
# при smoke Claude/Linear — подставьте реальные ключи в .env.docker

yarn office:docker:build
yarn office:docker:up
curl http://localhost:3000/health
```

| Команда (корень) | Назначение |
|------------------|------------|
| `yarn office:docker:build` | собрать образ `membrana/background-office:local` |
| `yarn office:docker:up` | поднять `office-api` |
| `yarn office:docker:down` | остановить контейнер |
| `yarn office:docker:logs` | логи API |

Порт по умолчанию **3000** (не конфликтует с media `3010`). Плейсхолдеры в `.env.docker.example` достаточны для `/health`; для `POST /v1/claude/ask` нужен настоящий `ANTHROPIC_API_KEY`.

Прод VPS + TLS: [`docs/deploy/BACKGROUND_OFFICE_DEPLOY.md`](../../docs/deploy/BACKGROUND_OFFICE_DEPLOY.md).  
**Fly (Night Hunt) + когда переезжать на VPS:** [`DEPLOY.md`](./DEPLOY.md) · [`docs/deploy/BACKGROUND_OFFICE_FLY_DEPLOY.md`](../../docs/deploy/BACKGROUND_OFFICE_FLY_DEPLOY.md).

Smoke VPS: `node scripts/_ssh-office-smoke.mjs` (если скрипт есть в checkout).

## Production deployment

| Параметр | Fly (Night Hunt пилот) | VPS (prod) |
|----------|------------------------|------------|
| URL | `https://membrana-office-night-hunt.fly.dev` | `https://office.membrana.space` |
| Роль | cron Night Hunt → OpenRouter → GitHub PR | Claude, Linear, webhooks, RAG |
| Деплой | `fly deploy` — см. [`DEPLOY.md`](./DEPLOY.md) | `deploy/office-stack.sh` |
| Env | `fly secrets` | `/etc/membrana/office.env` |

Полная матрица, пороги миграции Fly → VPS: **[`DEPLOY.md`](./DEPLOY.md)**.

### VPS (`office.membrana.space`)

| Параметр | Значение |
|----------|----------|
| Health | `GET /health` (без токена) |
| Env | `/etc/membrana/office.env` (mode `600`, не в git) |
| Compose | `deploy/office-stack.sh` + `deploy/background-office.prod.compose.yml` |
| TLS | Caddy + Let's Encrypt (`deploy/Caddyfile.office.template`, домен из `OFFICE_DOMAIN`) |
| Linear webhook | `POST https://office.membrana.space/webhooks/linear` |

### Секреты на VPS (`/etc/membrana/office.env`)

| Переменная | Назначение |
|------------|------------|
| `API_INTERNAL_TOKEN` | `X-Membrana-Token` для `/v1/*` (генерируется `deploy/generate-office-env.sh`) |
| `ANTHROPIC_API_KEY` | исходящие вызовы Claude |
| `LINEAR_API_KEY` | исходящий GraphQL Linear |
| `LINEAR_WEBHOOK_SECRET` | **другой** секрет — подпись входящих webhook'ов |
| `GITHUB_TOKEN` | чтение Issues (Octokit); для Night Hunt на Fly — **repo** write |

Показать `API_INTERNAL_TOKEN` с VPS (локально, не коммитить): `node scripts/_ssh-office-show-token.mjs`.

### Деплой и smoke

```bash
# первичный деплой (из Windows, пока office не в remote git)
node scripts/_ssh-office-prod-up.mjs

# TLS site block
node scripts/_ssh-office-tls-setup.mjs

# приёмка O4
node scripts/_sync-office-env-from-root.mjs --restart
node scripts/_ssh-office-smoke.mjs
node scripts/_ssh-office-smoke.mjs --external
```

### Ротация секретов (кратко)

1. Сгенерировать новый секрет (или в UI провайдера — новый API key / webhook secret).
2. `nano /etc/membrana/office.env` на VPS → заменить значение.
3. `cd /root/membrana && ./deploy/office-stack.sh up` (перечитать env).
4. Для `LINEAR_WEBHOOK_SECRET` — обновить тот же secret в Linear → Webhooks → Edit.
5. Для `API_INTERNAL_TOKEN` — обновить у всех клиентов/скриптов с `X-Membrana-Token`.

### Troubleshooting

| Симптом | Что проверить |
|---------|----------------|
| DNS не резолвится | A `office.membrana.space` → IP VPS; `node scripts/_ssh-office-tls-setup.mjs --check-dns` |
| HTTPS 502 / timeout | `node scripts/_ssh-office-check.mjs`; контейнер healthy? Caddy reload? |
| Cert не выдаётся | порты 80/443, DNS пропагация; `journalctl -u caddy -n 50` на VPS |
| `401` на `/v1/*` | неверный `X-Membrana-Token`; `node scripts/_ssh-office-show-token.mjs` |
| `403` на webhook | неверный `LINEAR_WEBHOOK_SECRET` или подпись; unsigned POST должен давать 403 |
| Claude `5xx` | `ANTHROPIC_API_KEY` в `office.env`, лимиты API |

Старый эпик: [`BACKGROUND_OFFICE_V1_EPIC_PROMPT.md`](../../docs/prompts/BACKGROUND_OFFICE_V1_EPIC_PROMPT.md).

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

### Outbound self-check (Intern T1)

Сетевой пинг Anthropic / Linear / GitHub / Perplexity **без API-ключей** (достижимость хоста).
Недостижимый эндпоинт помечается; процесс не падает.

```bash
yarn office:self-check
```

Логика: `src/lib/outbound-self-check.ts` (переиспользуется `/ready` в T2).

### Claude

**`POST /v1/claude/ask`** — универсальный вызов Messages API.

```bash
curl -sS -X POST "http://localhost:3000/v1/claude/ask" \
  -H "Content-Type: application/json" \
  -H "X-Membrana-Token: $API_INTERNAL_TOKEN" \
  -d '{"messages":[{"role":"user","content":"Привет"}]}'
```

**`POST /v1/claude/persona/:name/ask`** — persona (`vesnin` | `dynin`), сборка промпта как в `scripts/ask-persona.mjs` (документы из `prompts/`).

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
