# Промпт: бутстрап централизованного API-сервера Membrana (`background-office`)

> **Это задание для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Скопируй блок «Промпт целиком» в начало диалога с агентом — он содержит всё,
> что нужно для работы. Размер задачи: **L**. Ожидаемый артефакт: 1 PR с готовым
> `packages/background-office/` и Definition of Done пройден.

---

## Контекст этого документа

Membrana — проект пространственной разведки нижнего неба (см. [`../WHITE_PAPER.md`](../WHITE_PAPER.md)).
К моменту, когда этот промпт исполняется, в проекте уже есть:

- Монорепо на TypeScript (Yarn 4, Turbo).
- Клиент `apps/client`, библиотеки `packages/*`, сервисы `packages/services/*`.
- Документированные правила: [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`SERVICES.md`](../SERVICES.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md).
- Виртуальная команда из 5 ролей с персонажами (см. [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md)).
- Локальные скрипты для общения с Anthropic API: `scripts/ask-persona.mjs`, `scripts/_anthropic-env.mjs`, `scripts/code-review.mjs`, `scripts/strategic-plan-*.mjs`.
- Методология задач: [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) — GitHub Issues + Linear, отчёт перед закрытием.

**Чего не хватает:** все интеграции с внешними API живут локально, у каждого разработчика свой `.env` с токенами, нет единой точки для приёма webhook'ов. Этот промпт устраняет именно это: создаёт `packages/background-office/` — единый HTTP-шлюз ко всем внешним API проекта. Имя «background-office» отражает роль пакета — закадровый «офис», в котором сходятся все внешние коммуникации и фоновые задачи проекта.

---

## Промпт целиком (для вставки агенту)

> Всё, что ниже до раздела «Заметки для человека-постановщика», — это **промпт для агента**. Можно копировать без правок.

---

### Кто ты

Ты — **бэкенд-инженер виртуальной команды Membrana**. Действуешь в характере роли **Vesnin** (Teamlead): см. `docs/virtual-team/PROMPT_TEAMLEAD.md`. Принцип конструктивизма «**форма следует функции, каждая деталь оправдана конструкцией, декора без смысла не существует**» — твой код-стиль. Никаких преждевременных абстракций, никаких «архитектурных украшательств» в API; границы модулей оправданы ролью в системе, а не вкусом.

### Что построить

Новый пакет `packages/background-office/` — централизованный HTTP-сервер на **Node.js + TypeScript**, который служит **единым шлюзом ко всем внешним API** проекта Membrana. В этой итерации (один PR) сервер умеет общаться с двумя средами:

- **Anthropic (Claude)** — generation API + persona-aware вызовы (повторение и обобщение логики из `scripts/ask-persona.mjs`).
- **Linear** — чтение тикетов, пост комментариев, приём webhook'ов с проверкой подписи.

Сервер должен быть готов к добавлению новых интеграций (GitHub, Slack, ADS-B, RF-приёмник и т.п.) без переписывания ядра. В перспективе вокруг `background-office` может появиться семейство фоновых пакетов (`packages/background-*/`), которые будут разделять общую инфраструктуру; в v0.1 такого разделения нет — пакет автономен.

### Документы, которые обязательно прочитать перед стартом

1. `WHITE_PAPER.md` — конечная цель Membrana и роль внешних интеграций.
2. `docs/ARCHITECTURE.md` — границы пакетов монорепо. Особенно правило: `apps/*` может зависеть от любых внутренних пакетов; никаких циклов.
3. `docs/SERVICES.md` — конвенции пакетов; `packages/background-office` следует тем же принципам качества (TS strict, README, единая точка входа), но не является «сервисом» в смысле SERVICES.md (он рантайм-сервер на Node, а не vite-react библиотека).
4. `docs/VIRTUAL_TEAM_PROMPT.md` — роли и форматы; ты в роли Vesnin'а.
5. `docs/TASKS_MANAGEMENT.md` — методология; сервер в перспективе заменит ручной `gh` для Linear-интеграции.
6. `docs/virtual-team/PROMPT_TEAMLEAD.md` и `docs/virtual-team/PROMPT_MATHEMATICIAN.md` — образцы persona-промптов (сервер будет их подгружать в `/v1/claude/persona/:name/ask`).
7. `scripts/ask-persona.mjs` и `scripts/_anthropic-env.mjs` — существующая логика persona-вызова, которую сервер должен **повторить и обобщить**. Существующие скрипты при этом **оставить как есть** — они продолжают работать локально как fallback и проверочный канал.
8. `.env.example` — образец для расширения.

### Технические рамки

#### Где живёт код

- Новый пакет `packages/background-office/` (на одном уровне с `packages/core`, `packages/agenda`, `packages/device-board`). **Не** в `packages/services/*` — те зарезервированы под vite-ts-react библиотеки с React-хуками; здесь же — рантайм-сервис на Node.js.
- Имя пакета: `@membrana/background-office`.
- Пакет **полностью автономен в v0.1**: НЕ зависит от `@membrana/core`, `@membrana/agenda`, `@membrana/device-board`, `packages/services/*`, `apps/client`. Все нужные типы определяются локально внутри пакета. Это сознательное решение — упрощает развёртывание и убирает связь с фронтенд-стеком. Когда (если) появится семейство `packages/background-*/`, можно будет вынести общие контракты в отдельный пакет; сейчас этого не нужно.
- Менеджер пакетов — Yarn 4 (corepack), как в монорепо. Workspace-pattern `packages/*` уже включает `packages/background-office/` без правок корневого `package.json`.
- Зависимости — только внешние npm-пакеты.

#### Стек

- **Фреймворк:** на твой выбор — **NestJS** (рекомендуется: DI, модули, чёткий рост) или **Fastify** (лёгкий, быстрый). Решение зафиксируй в `packages/background-office/README.md` с короткой аргументацией.
- **HTTPS** — обязательно в проде; в dev — HTTP `localhost`.
- **TypeScript strict** (`"strict": true` + `"noUncheckedIndexedAccess": true`).
- **Логи:** `pino` (для Fastify) или `nestjs-pino` (для NestJS). Структурированный JSON, обязательный `request-id` в каждой строке.
- **Валидация env:** `zod` — все обязательные переменные проверяются на старте; при отсутствии — внятная ошибка и `exit 1`.
- **Валидация запросов:** `zod` (для обоих фреймворков) или `class-validator` (если выбран NestJS).
- **HTTP-клиент:** `undici` (уже в монорепо) или `node:fetch`. Не добавляй axios.
- **GitHub-доступ для контекста persona-эндпоинта:** через `@octokit/rest`, НЕ через shell-out на `gh`.
- **Тесты:** Vitest (как в монорепо). Минимум — интеграционные тесты на каждый эндпоинт с моками внешних API через `nock` или `msw/node`.
- **Lint/Format:** наследует root ESLint и Prettier; никаких отдельных конфигов, кроме `tsconfig.json` пакета.

#### Конфигурация (.env, валидируется zod-схемой)

Минимальный набор переменных:

```
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

API_INTERNAL_TOKEN=...               # shared secret для /v1/* эндпоинтов
ANTHROPIC_API_KEY=...                # для /v1/claude/*
ANTHROPIC_MODEL=claude-haiku-4-5-20251001   # опционально

LINEAR_API_KEY=...                   # для /v1/linear/*
LINEAR_WEBHOOK_SECRET=...            # для верификации подписи /webhooks/linear

GITHUB_TOKEN=...                     # для подгрузки тела GitHub Issue (read-only достаточно)
GITHUB_OWNER=officefish
GITHUB_REPO=Membrana
```

**Никаких secrets в логах, никогда.** Уровень `debug` может печатать имена ключей, но не значения. При попытке логгера сериализовать объект с подозрительным ключом (`*key*`, `*secret*`, `*token*`) — маскируй значение.

### Эндпоинты — первая итерация

#### Health

- `GET /health` → `200 { status: "ok", version: <package.json.version>, uptime: <seconds> }`. Без авторизации.

#### Internal API (требует заголовок `X-Membrana-Token: <API_INTERNAL_TOKEN>`)

##### Claude

- **`POST /v1/claude/ask`** — generic Claude-вызов.
  - Тело: `{ model?: string, system?: string, messages: { role: "user"|"assistant", content: string }[], max_tokens?: number }`.
  - Ответ: `{ text: string, model: string, stop_reason: string, usage?: { input_tokens, output_tokens } }`.
  - Ошибки 4xx/5xx Anthropic — **проксируются** с понятным телом, не глотать.

- **`POST /v1/claude/persona/:name/ask`** — persona-aware.
  - `:name` ∈ `{ vesnin, dynin }` (зашитая мапа на `PROMPT_*.md`). Невалидное имя → 404.
  - Тело: `{ question: string, context?: ContextRef, includeStrategicDocs?: boolean }`.
  - `ContextRef` — discriminated union:
    - `{ source: "github-issue", issueNumber: number }` — через Octokit грузим issue + комментарии.
    - `{ source: "linear", ticketId: string }` — через Linear API грузим тикет + комментарии.
    - `{ source: "raw", text: string }` — текст приходит как есть.
  - Логика сборки промпта — **та же, что в `scripts/ask-persona.mjs`**: persona-промпт + (опционально) WHITE_PAPER + выдержки ARCH/SERVICES + контекст задачи + вопрос.
  - **Документы (`PROMPT_*.md`, `WHITE_PAPER.md`, `ARCHITECTURE.md`, `SERVICES.md`) встраиваются в сборку.** Сервер не зависит от наличия репозитория в проде. Реализация: `packages/background-office/prompts/` — копия нужных md-файлов; явный `fs.readFile` при старте; кеш в памяти. Скрипт `prepare` копирует свежие версии из `docs/` перед сборкой.
  - Ответ: `{ text: string, persona: string, sources: { document: string, length: number }[] }`.

##### Linear

- **`GET /v1/linear/issue/:id`** — `:id` вида `TEC-42`. Через Linear GraphQL API.
  - Ответ: `{ id, identifier, title, description, state, labels: {name,color}[], comments: {id, body, createdAt, user}[], url }`.
- **`POST /v1/linear/issue/:id/comment`**
  - Тело: `{ body: string }`.
  - Ответ: `{ commentId: string, url: string, createdAt: string }`.

#### Webhooks (без `X-Membrana-Token`, но с HMAC-подписью)

- **`POST /webhooks/linear`**
  - Принимает event от Linear (issue / comment / state change / label change).
  - **Обязательно**: верификация подписи через HMAC-SHA256 от **raw body** с ключом `LINEAR_WEBHOOK_SECRET`. Сравнение — **constant-time** (`crypto.timingSafeEqual`).
  - Если фреймворк парсит body до тебя — обязательно сохрани raw-buffer (для NestJS: `app.use(rawBody({...}))` или собственный middleware; для Fastify: `addContentTypeParser('application/json', { parseAs: 'buffer' }, ...)`).
  - При невалидной подписи → `403`, без раскрытия деталей.
  - При валидной подписи → возврат `200 { received: true }` **в течение 1 секунды**. Реальная обработка события — **в background** (in-memory queue, без БД).
  - **Идемпотентность**: каждое event-id храним в LRU-кеше (10 мин TTL); повторный event с тем же id — отвечаем 200 и игнорируем.
  - В v0.1 background-обработчик — только логирует событие. Маршрутизация (auto-reply от Vesnin'а / Dynin'а на упоминания) — следующая итерация.

### Архитектурные правила

1. **Один порт, один процесс.** Никаких отдельных воркеров в v0.1.
2. **Модули по интеграциям:** `claude.module.ts`, `linear.module.ts`, `webhooks.module.ts`. Каждый изолирован, общается через явные интерфейсы. Контроллер → сервис → external client.
3. **Никаких прямых вызовов** `process.env` в бизнес-коде — только через `ConfigService` / `ConfigModule` (или эквивалент для Fastify).
4. **Graceful shutdown:** на `SIGTERM` сервер дожидается inflight-запросов (timeout 10s), потом выходит.
5. **Ошибки наружу — без stack trace и без имён переменных окружения.** Внутри логи — полные.
6. **Все time-sensitive операции** имеют явный timeout: Anthropic — 60s, Linear — 30s, Octokit — 30s.
7. **Структура `packages/background-office/`** (для NestJS-варианта; для Fastify — аналогично, без классов):
   ```
   packages/background-office/
   ├── src/
   │   ├── main.ts                       # bootstrap, graceful shutdown
   │   ├── app.module.ts                 # root module (NestJS)
   │   ├── config/
   │   │   ├── env.schema.ts             # zod
   │   │   └── config.module.ts
   │   ├── modules/
   │   │   ├── claude/
   │   │   │   ├── claude.module.ts
   │   │   │   ├── claude.service.ts     # внешний клиент Anthropic
   │   │   │   ├── claude.controller.ts  # /v1/claude/*
   │   │   │   └── persona-loader.ts     # читает встроенные PROMPT_*.md
   │   │   ├── linear/
   │   │   │   ├── linear.module.ts
   │   │   │   ├── linear.service.ts     # внешний клиент Linear (GraphQL)
   │   │   │   └── linear.controller.ts  # /v1/linear/*
   │   │   ├── github/
   │   │   │   ├── github.module.ts
   │   │   │   └── github.service.ts     # Octokit, чтение Issues
   │   │   └── webhooks/
   │   │       ├── webhooks.module.ts
   │   │       └── linear-webhook.controller.ts
   │   ├── common/
   │   │   ├── guards/                   # ApiKeyGuard для internal API
   │   │   ├── interceptors/             # request-id, logging
   │   │   ├── filters/                  # exception filters
   │   │   └── pipes/                    # zod validation
   │   └── types/                        # локальные типы пакета; в v0.2 можно вынести в shared
   ├── prompts/                          # копии PROMPT_*.md, WHITE_PAPER.md, ARCH/SERVICES — встраиваются в build
   ├── test/                             # vitest, e2e
   ├── package.json
   ├── tsconfig.json
   ├── README.md
   └── .env.example
   ```

### Definition of Done для этого PR

- [ ] `packages/background-office/` создан в монорепо, `yarn install --immutable` без ошибок.
- [ ] `yarn workspace @membrana/background-office build` зелёный.
- [ ] `yarn workspace @membrana/background-office test` зелёный.
- [ ] `yarn workspace @membrana/background-office lint` зелёный.
- [ ] `yarn workspace @membrana/background-office dev` запускает сервер на `localhost:3000`. `curl http://localhost:3000/health` → 200.
- [ ] Все эндпоинты `/v1/*` работают при правильном `X-Membrana-Token`; без токена → 401.
- [ ] `/webhooks/linear` отвергает запросы с неверной подписью → 403; валидные → 200 за < 1 с.
- [ ] Идемпотентность webhook'ов: повторный event с тем же id не приводит к повторной обработке.
- [ ] `.env.example` в корне репо дополнен новыми переменными (PORT, API_INTERNAL_TOKEN, LINEAR_API_KEY, LINEAR_WEBHOOK_SECRET, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO).
- [ ] `packages/background-office/README.md` — что это, как запустить (dev / prod), список эндпоинтов с примерами `curl`, выбор фреймворка с аргументацией.
- [ ] В `docs/ARCHITECTURE.md` — короткий раздел про `packages/background-office` (где в графе зависимостей, какие границы; пакет автономен в v0.1).
- [ ] В корневой `package.json` — алиасы `"office:dev": "yarn workspace @membrana/background-office dev"`, `"office:build": "yarn workspace @membrana/background-office build"`.
- [ ] Все интеграционные тесты используют моки внешних API; никаких реальных вызовов в тестах.
- [ ] Пакет **не импортирует** ничего из `@membrana/core`, `@membrana/agenda`, `@membrana/device-board`, `packages/services/*`, `apps/client`. Грепом `grep -r "@membrana/" packages/background-office/src` не должно быть совпадений (кроме комментариев).

### Out of scope для этого PR (НЕ делать сейчас)

- GitHub webhooks (приём событий от GitHub, не использование Octokit для чтения) — следующая итерация.
- Slack / Telegram / Email — позже.
- БД / persistent storage — нет, сервер stateless (event-id LRU в памяти достаточно для v0.1).
- Multi-turn streaming Claude — нет, обычный JSON-ответ.
- Полная OpenAPI/Swagger спецификация — README достаточно.
- Docker / k8s / деплой-скрипт — отдельный PR.
- Метрики (Prometheus / OpenTelemetry) — позже.
- Аутентификация пользователей — нет, только shared secret для internal API.
- Reactive auto-reply от Vesnin'а / Dynin'а на упоминания в Linear-комментариях — это вариант B из обсуждения, отложен.

### Подсказки и риски

- При вызовах Anthropic — проксируй ошибки 4xx/5xx с понятным телом и **сохраняй `request_id`** в ответе для поддержки.
- HMAC-проверка Linear: длина буфера подписи должна совпадать с длиной HMAC; иначе `timingSafeEqual` бросит — используй try/catch и отвечай 403.
- Сборка persona-промптов: `packages/background-office/prompts/` копируется из корня репо через `yarn workspace @membrana/background-office prepare` скрипт. Не читать live из `../../docs/` в проде — продакшен может работать без репозитория.
- Linear API — GraphQL, не REST. Используй официальный `@linear/sdk` либо собственные запросы через `undici`. SDK даёт типы.
- При выборе **Fastify** обрати внимание, что `@fastify/raw-body` несовместим с body-parser плагином по умолчанию — порядок регистрации плагинов важен.
- При выборе **NestJS** используй `NestFactory.create(AppModule, { rawBody: true })` для корректной работы с raw body на webhook-роуте.

### Формат финального PR

1. Заголовок: `feat(background-office): bootstrap packages/background-office with Claude + Linear integrations`.
2. Описание: что сделано / Definition of Done чек-листом / что НЕ сделано / как ревьюить.
3. Один коммит или серия логически разделённых (squash в один — твой выбор; финальная ветка соответствует заголовку PR).
4. LGTM — у роли Teamlead (Vesnin) на основе принципов конструктивизма.

При конфликте этих правил с существующими конвенциями монорепо выигрывают конвенции и `docs/ARCHITECTURE.md`. Любое отступление — обоснуй в PR-описании.

---

## Заметки для человека-постановщика

Эти заметки — **не для агента**, а для тебя как постановщика задачи. Агент их игнорирует.

### Что я (постановщик) делаю **до** запуска промпта

1. **Заведи Linear-ticket** (например `TEC-API-1`) с label'ом `vesnin` (архитектура / инфра). В описании — короткая выжимка из этого промпта и ссылка на файл `docs/prompts/API_SERVER_BOOTSTRAP_PROMPT.md`.
2. **Создай GitHub Issue** через шаблон `wish` (см. `.github/ISSUE_TEMPLATE/`). Опять же — ссылка на этот файл в теле.
3. **Заведи ветку** `vesnin` (или продолжи существующую), от свежего `main`.
4. **Получи API-ключи** заранее: Linear personal API key, Linear webhook secret (при создании webhook'а в Linear settings), GitHub token с правами `repo:read`. Anthropic уже есть.

### Что я делаю **после** того, как агент сдал PR

1. Прохожу Definition of Done руками — все чек-боксы должны быть зелёные.
2. Запускаю боевые smoke-тесты:
   ```bash
   curl http://localhost:3000/health
   curl -H "X-Membrana-Token: $TOKEN" -X POST \
     -H "Content-Type: application/json" \
     -d '{"question":"одной фразой: что главное в принципе конструктивизма?"}' \
     http://localhost:3000/v1/claude/persona/vesnin/ask
   ```
3. Создаю реальный webhook в Linear → settings → API → Webhooks, направляю на `https://<your-host>/webhooks/linear`, проверяю, что приходят валидные подписи.
4. Закрываю Linear-ticket и GitHub Issue с формальным отчётом по форме из [`TASKS_MANAGEMENT.md` § 6](../TASKS_MANAGEMENT.md#этап-56-pr-отчёт-закрытие).

### Что не нужно класть в этот промпт

- **Деплой:** Render / Railway / Fly / Cloudflare Workers — отдельный разговор после v0.1.
- **Domain / DNS / TLS-сертификат:** мы делаем код, не инфру. Если нужен HTTPS для приёма webhook'ов — поднимай `ngrok` или Cloudflare Tunnel локально.
- **CI для `packages/background-office`:** существующий `ci.yml` сам подхватит новый workspace через `turbo run lint typecheck test build`. Никакой отдельной правки workflow.

### Чем этот сервер заменяет существующее

| Сейчас | После v0.1 `background-office` |
|--------|---------------------|
| Локальный `yarn ask vesnin --gh-issue 12` | `POST /v1/claude/persona/vesnin/ask` с тем же контрактом + теперь и Linear как источник |
| `gh issue view` руками | `GET /v1/linear/issue/TEC-42` |
| Никак не принимаются Linear-события | `POST /webhooks/linear` (приём, валидация подписи, лог) |
| Anthropic-ключ в личном `.env` каждого разработчика | Только в `.env` сервера; клиенты ходят через `X-Membrana-Token` |
