# background-office v0.1 — журнал разработки

> **Назначение этого файла.** Хронологический журнал работы над пакетом
> `packages/background-office/` от первого упоминания идеи до момента, когда
> локальный сервер ответил `200` на `GET /health`. Дублирующая копия для
> Linear-ticket'а: каждый раздел `## N. …` можно вставить как отдельный
> комментарий к ticket'у, либо весь файл — как длинное описание.
>
> **Линки.** Готов к привязке к будущему Linear ID (например, `MEM-API-1`).
> На GitHub эта работа отслеживается через PR #15, #17 и последующий PR с
> реализацией.

---

## 0. Шапка ticket'а (для копирования в Linear)

**Title:** `Бутстрап централизованного API-сервера background-office (v0.1)`

**Labels:** `vesnin` (роль), `package:background-office` (после добавления в схему).

**Связанные документы:**

- [`docs/prompts/API_SERVER_BOOTSTRAP_PROMPT.md`](../prompts/API_SERVER_BOOTSTRAP_PROMPT.md) — task-промпт, по которому шла работа.
- [`docs/WHITE_PAPER.md`](../WHITE_PAPER.md) — стратегическая мотивация.
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — границы пакетов монорепо.
- [`docs/TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) — методология задач.

**GitHub-артефакты:**

- PR #15 — `docs(prompts): task-prompt для бутстрапа packages/background-office (Claude + Linear)` (merged).
- PR #17 — `docs(prompts): GitHub App вместо PAT и две Linear-секции — уточнение модели секретов` (**draft, отложен**: постановщик хочет вернуться к модели секретов позже).
- PR реализации — пока **не открыт**; сервер собран и запущен локально, не запушен.

---

## 1. Почему вообще завели этот пакет

До `background-office` все внешние интеграции жили локально:

- Anthropic API key — в `.env` у каждого разработчика, использовался скриптами `scripts/ask-persona.mjs`, `scripts/code-review.mjs`, `scripts/strategic-plan-*.mjs`.
- Linear — никак не подключён программно; работа с ticket'ами руками через UI.
- GitHub — через CLI `gh` под аккаунтом разработчика, никаких webhook'ов.

Это нормально для prototype-фазы, но дальше не масштабируется по трём причинам:

1. **Нет точки приёма webhook'ов.** Linear-webhook не на что направить — нет публичного HTTPS-эндпоинта. Значит, реактивные сценарии (Vesnin отвечает на упоминание в комментарии тикета, авто-обновление статуса при merge PR) — невозможны.
2. **Ключи рассыпаны.** Anthropic key у каждого разработчика свой; нет ни ротации, ни общего использования. Linear personal key, если выпустить, тоже привязан к человеку.
3. **Нет общей логики работы с внешними API.** `scripts/ask-persona.mjs` — это локальный CLI; чтобы тот же promp-flow вызвал, например, GitHub Action или будущий клиент-UI, нужно дублировать код.

`background-office` — это «закадровый офис»: один процесс, в котором сходятся все внешние коммуникации проекта. Имя сознательно не «api-gateway» и не «integrations-service» — оно про **функцию** (фоновая обработка), а не про **архитектурный паттерн**.

---

## 2. Этап 1 — task-промпт (PR #15)

**Что сделано.** Создан стратегический task-промпт [`docs/prompts/API_SERVER_BOOTSTRAP_PROMPT.md`](../prompts/API_SERVER_BOOTSTRAP_PROMPT.md). Этот файл — спецификация задачи, а не код. Он определяет:

- Где живёт пакет (`packages/background-office/`, не в `packages/services/*` — там vite-react библиотеки, не Node-сервер).
- Стек: Node + TypeScript strict, NestJS либо Fastify (выбор за исполнителем, обоснование — в README), `pino` для логов, `zod` для валидации env и тел запросов, `undici` для HTTP, Vitest для тестов.
- Эндпоинты v0.1:
  - `GET /health` (без авторизации).
  - `POST /v1/claude/ask` и `POST /v1/claude/persona/:name/ask` (за `X-Membrana-Token`).
  - `GET /v1/linear/issue/:id` и `POST /v1/linear/issue/:id/comment`.
  - `POST /webhooks/linear` (HMAC-проверка подписи, идемпотентность по event-id).
- Архитектурный принцип: **пакет автономен**, не зависит от `@membrana/core` / `@membrana/agenda` / `@membrana/device-board` / `packages/services/*` / `apps/client`. Все типы — локально.
- Definition of Done: 11 пунктов, включая build/test/lint зелёные, `.env.example` дополнен, README покрывает запуск.

**Почему так сформулировано.** Из принципа конструктивизма «форма следует функции»: каждый элемент промпта оправдан конструкцией, никаких архитектурных украшательств в v0.1.

**Затраченное.** Один PR (промпт), мерж сразу — потому что промпт не блокирует ничего, а уточняется через дальнейшие PR.

---

## 3. Этап 2 — уточнение модели секретов (PR #17, отложен)

**Триггер.** При планировании, как фактически получать `LINEAR_API_KEY` и `GITHUB_TOKEN`, постановщик заметил два нюанса:

- Linear выпускает **два разных** секрета (personal API key для исходящих вызовов и webhook signing secret для входящих) — их легко перепутать, потому что в env они оба строки и оба «от Linear».
- Для GitHub в сценарии, когда сервер принимает webhook'и, статичный Personal Access Token — антипаттерн. Правильно — GitHub App с динамическими installation access tokens (JWT → `POST /app/installations/:id/access_tokens`, TTL ~1 час).

**Что предложено в PR #17.**

- В env: убрать `GITHUB_TOKEN`, добавить `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID` + зарезервированный пустой `GITHUB_WEBHOOK_SECRET`.
- В стеке: `@octokit/auth-app` для подписи JWT и обмена на installation token + `@octokit/rest` для запросов.
- Разделить `github/` модуль на `github-auth.service.ts` (JWT + кеш токенов) и `github.service.ts` (Octokit-вызовы).
- Зафиксировать «три семьи секретов» во введении к разделу конфигурации:
  1. internal API gate (`API_INTERNAL_TOKEN`),
  2. outbound credentials (Anthropic / Linear personal key / GitHub App),
  3. inbound signing secrets (Linear / GitHub webhook secrets).
- Пошаговая инструкция для постановщика — как получить четыре независимых секрета.

**Текущий статус.** **Отложено.** Постановщик прямо сказал: «Я не уверен совсем на счёт секретов. Мы к этому вернёмся, но позже». PR #17 остаётся **draft**, ничто из него ещё не вошло в `main`. Соответственно, исполнитель этапа 3 опирался на **исходную** версию промпта из этапа 1 (со статичным `GITHUB_TOKEN`).

**Открытые вопросы для возвращения к теме.**

1. **GitHub.** Действительно ли v0.1 нужен GitHub App, или для v0.1 (когда GitHub webhook'и out of scope, а используем только read Issue) достаточно fine-grained PAT с правом `issues:read`? Главный аргумент «нужно сразу App» — мы не хотим переписывать auth-слой в v0.2; контр-аргумент — преждевременная сложность.
2. **Linear.** Зачем держать сервисную учётку для `LINEAR_API_KEY` (как в PR #17), если на старте достаточно personal key одного разработчика? Можно отложить сервисную учётку до момента, когда персональный ключ начнёт мешать (например, кто-то уйдёт из команды).
3. **Хранение PEM/secret'ов.** Если переходим на App — где живёт PEM в проде? `.env` хостинг-провайдера? Vault? Это вопрос этапа 5 (deployment), не v0.1.

**Решение.** Не блокировать этап 3 уточнением. Когда вернёмся к секретам — либо merge PR #17, либо пересмотр + новый PR.

---

## 4. Этап 3 — реализация пакета (локальная)

**Состояние.** Исполнитель построил `packages/background-office/` согласно промпту этапа 1. Сервер запускается на `localhost:3000`. `GET /health` отвечает `200`.

**Чего пока нет в репозитории.** Код реализации **не запушен** в `main`/публичную ветку на момент написания этого журнала. То есть `packages/background-office/` в репо ещё отсутствует — артефакт живёт у исполнителя локально. Это нормально для предъявления факта работоспособности, но **должно** материализоваться в PR прежде, чем переходить к этапу 5 (деплой).

**Что нужно зафиксировать в PR реализации, когда он будет открыт.**

- Все 11 пунктов DoD из промпта этапа 1 — отметить чек-боксы.
- Какой фреймворк выбран (NestJS / Fastify) и почему — в README пакета.
- Какие npm-зависимости добавлены (`@octokit/rest`, `@linear/sdk` или собственные GraphQL-запросы через `undici`, `pino`, `zod` и т.д.).
- Скриншот / лог `curl http://localhost:3000/health` для подтверждения.
- Ссылка на этот журнал и на task-промпт.

**Smoke-тесты, которые надо прогнать в PR.**

```bash
curl http://localhost:3000/health
# ожидаемо: 200 { "status": "ok", "version": "...", "uptime": ... }

# с заглушечным API_INTERNAL_TOKEN
curl -H "X-Membrana-Token: $TOKEN" -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"ping"}]}' \
  http://localhost:3000/v1/claude/ask

# без токена → 401
curl -X POST http://localhost:3000/v1/claude/ask

# webhook с неправильной подписью → 403
curl -X POST -H "X-Linear-Signature: deadbeef" \
  -H "Content-Type: application/json" \
  -d '{}' \
  http://localhost:3000/webhooks/linear
```

---

## 5. Что НЕ сделано в v0.1 (и это нормально)

Прямой перенос из «Out of scope» промпта этапа 1 — с пометками, куда какой пункт уходит:

| Пункт | Куда идёт |
|-------|-----------|
| GitHub webhooks (приём событий от GitHub) | Следующий этап после деплоя — `MEM-API-3` (TBD) |
| Slack / Telegram / Email | Намного позже, по мере появления реальной необходимости |
| Persistent storage (БД) | Пока не нужно: сервер stateless, event-id LRU в памяти достаточно |
| Streaming-режим Claude | Когда появится UI, требующий чанков |
| OpenAPI / Swagger | README достаточно в v0.1; OpenAPI — когда появится сторонний потребитель |
| Docker / k8s / деплой-скрипт | **Следующий ticket (`MEM-API-2` — этап 5 этого журнала)** |
| Метрики (Prometheus / OTel) | После того как сервер реально начнёт принимать webhook'и в проде |
| Аутентификация пользователей | Не планируется; внутренний инструмент за shared secret |
| Reactive auto-reply от Vesnin/Dynin на упоминания в Linear | Следующая итерация после стабильного приёма webhook'ов |

---

## 6. Открытые вопросы и решения, требующие пересмотра

1. **Модель секретов** (см. этап 2). Возврат запланирован.
2. **Выбор фреймворка** — зафиксировать в README пакета и в этом журнале как комментарий к ticket'у, когда PR реализации откроется. Если выбран Fastify — описать, как решён вопрос raw-body для HMAC-проверки webhook'а.
3. **Persona-prompt copy.** Промпт требует, чтобы `PROMPT_*.md`, `WHITE_PAPER.md` и т.д. **встраивались** в build (`packages/background-office/prompts/`), а не читались live. Проверить, что это действительно так в реализации — иначе в проде сервер будет падать без репозитория.
4. **Идемпотентность webhook'ов.** LRU 10 мин TTL — достаточно ли? На пиках Linear может бомбить retries дольше. Решать после первого боевого инцидента.
5. **Логи в проде.** Сейчас pino пишет в stdout. Куда они уйдут в проде? Решать в этапе 5.

---

## 7. Что дальше — следующий ticket (этап 5)

**Статус: выполнено (2026-06).** Деплой вынесен в эпик O1–O4; итог — §9 ниже. Промпт [`SERVER_DEPLOYMENT_PROMPT.md`](../prompts/SERVER_DEPLOYMENT_PROMPT.md) частично заменён чеклистом [`BACKGROUND_OFFICE_DEPLOY.md`](../deploy/BACKGROUND_OFFICE_DEPLOY.md).

Кратко, что **было** запланировано (для истории ticket'а):

- Регистрация домена под Membrana (выбор зоны + регистратор).
- DNS-записи (A/AAAA, CAA).
- Выбор хостинга: PaaS (Render / Railway / Fly.io / DigitalOcean App Platform) либо VPS (Hetzner / DigitalOcean Droplet) — с обоснованным сравнением в README.
- HTTPS через Let's Encrypt (или managed-cert у PaaS), auto-renewal.
- Секреты — в env hosting-провайдера, не в git.
- Боевой `https://<domain>/health` → `200`.
- Боевой Linear webhook, направленный на `https://<domain>/webhooks/linear`.
- README с воспроизводимой процедурой деплоя.

---

## 9. Этап 5 — деплой (O1–O4)

**Дата:** 2026-06. **Эпик:** `background-office-v1` (GitHub #60–#61).

### Платформа и домен

| Параметр | Решение |
|----------|---------|
| Хостинг | VPS `72.56.27.58` (тот же узел, что `background-media`) |
| Домен | `membrana.space` |
| Office URL | `https://office.membrana.space` |
| Media URL | `https://media.membrana.space` |
| TLS | Caddy v2 + Let's Encrypt (site blocks в `/etc/caddy/Caddyfile.d/`) |
| Office bind | `127.0.0.1:3000` → Caddy reverse proxy |
| Stateful storage | не нужен (office stateless) |

### Стоимость (оценка)

| Статья | Порядок величины |
|--------|------------------|
| VPS | уже оплачен под media + office (два compose на одном хосте) |
| Домен `membrana.space` | регистратор (годовая плата за зону) |
| Anthropic API | pay-per-use по `ANTHROPIC_API_KEY` |
| Linear / GitHub | бесплатные tier'ы для webhook + read API |

Отдельный VPS для office **не** понадобился — stateless API делит машину с media.

### Артефакты в репозитории

- O1: Docker (`packages/background-office/Dockerfile`, compose)
- O2: `deploy/office-stack.sh`, `deploy/generate-office-env.sh`, SSH prod-up
- O3: `deploy/Caddyfile.office.membrana.space`, `_ssh-office-tls-setup.mjs`
- O4: `_ssh-office-smoke.mjs`, README Production deployment, §9–§10 deploy doc

### Smoke (проверено)

```bash
curl -s https://office.membrana.space/health
# → {"status":"ok",...}

curl -s -o /dev/null -w "%{http_code}" -X POST https://office.membrana.space/webhooks/linear -d '{}'
# → 403 (без подписи — ожидаемо)

node scripts/_ssh-office-smoke.mjs
```

### Осталось вручную (O4)

1. ~~Заменить `REPLACE_BEFORE_PROD`~~ — выполнено (`_sync-office-env-from-root.mjs`).
2. ~~Linear webhook~~ — создан, smoke signed → 200.
3. ~~Чеклист §10~~ — выполнен (2026-06-12).
4. **Linear R1/R3:** привязать tickets к #60 / #61 — [`LINEAR_GITHUB_SYNC_REGULATION.md`](../prompts/LINEAR_GITHUB_SYNC_REGULATION.md) (неблокирующий).
5. **PR + merge** в `main` — по готовности; затем `yarn task:close-github`.

---

## 8. Чем заменяется существующее после этого ticket'а

Сравнение «до — после v0.1 background-office» (минимально, более полная таблица — в task-промпте):

| Сейчас (до v0.1) | После merge PR реализации + смежных |
|------------------|-------------------------------------|
| `yarn ask vesnin --gh-issue 12` локально | `POST /v1/claude/persona/vesnin/ask` (тот же контракт + Linear как источник контекста) |
| `gh issue view` руками | `GET /v1/linear/issue/MEM-42` |
| Linear-события никак не принимаются | `POST /webhooks/linear` (HMAC, идемпотентность, лог) |
| Anthropic key в личном `.env` каждого | Только в env сервера; клиенты ходят через `X-Membrana-Token` |
