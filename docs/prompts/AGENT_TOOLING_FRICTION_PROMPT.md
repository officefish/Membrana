# Промпт: agent-tooling-friction — 4 инструмента против трения агентских сессий

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **до 4 PR** (задачи независимы, мерж по готовности каждой).
> Реестр: `id` = `agent-tooling-friction` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Сессия 2026-07-13 (3 спринта за день) вскрыла четыре повторяющихся источника трения
агентской работы. Пакет прошёл **консилиум**
([`agent-tooling-friction-2026-07-13.md`](../seanses/agent-tooling-friction-2026-07-13.md),
24 реплики): один M-спринт-зонтик, 4 **независимые** задачи (организационная единица,
не архитектурная — ни одна не трогает граф `packages/*`).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| Протокол консилиума (выше) | Спецификация: решения по всем 4 развилкам |
| [`TASK_CLOSURE_REVIEW_REGULATION.md`](./TASK_CLOSURE_REVIEW_REGULATION.md) | ti-1: норма про ревью-артефакты |
| `scripts/hermes-brief.mjs` + `.test.mjs` | ti-2: эталон (IO/чистый рендер, byCodePoint, снапшоты) |
| `packages/background-office/test/setup-env.ts` | ti-3: точка правки |
| `docs/BACKGROUND_SERVERS.md` | ti-3: строка-норма |
| Память `llm-providers-unblock` | ti-4: классы ошибок с живых зондов 2026-07-13 |

**GitHub Issue:** #433.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Перед кодом — краткий план. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).
Спор не переоткрывать: решения уже приняты консилиумом agent-tooling-friction.

---

### Что построить (порядок: дешевле → дороже, вердикт Teamlead)

**ti-1 — ревью-артефакты в .gitignore** (ozhegov + dynin-греп):
`docs/reviews/*/` в `.gitignore` (НЕ логика в `task-closure-review.mjs` — «меньше
механики»); `docs/reviews/README.md` сохранить, если есть; греп закоммиченных
артефактов → `git rm -r --cached` при находках; норма в
`TASK_CLOSURE_REVIEW_REGULATION.md`; временные строки `docs/reviews/*` из
`.git/info/exclude` основного репо можно снять (устаревают).

**ti-3 — proxy-чистка тестового окружения office** (dynin):
в `test/setup-env.ts` удалить ВСЕ формы (`HTTPS_PROXY`/`HTTP_PROXY`/`https_proxy`/
`http_proxy`); комментарий-норма: «тестовое окружение не наследует прокси из шелла;
прокси-зависимый тест объявляет env локально (vi.stubEnv) и снимает в afterEach»;
одна строка-норма в `BACKGROUND_SERVERS.md`. Контекст: undici ProxyAgent читает env
в обход мока `global.fetch` → 2 e2e ложно красные при прокси в шелле.

**ti-2 — `yarn insight:drift`** (dynin):
`scripts/insight-drift.mjs`: чистое ядро `diff(insightsRegistry, tasksRegistry) →
Drift[]` (совпадение по `insightId` И упоминанию id в `notes`; типы дрейфа:
active-задача без sprintPhase; archived-задача без sprintPhase; sprintPhase
указывает на несуществующую задачу; status deferred при active-задаче), exit≠0 при
дрейфе; вывод — выровненная таблица, статус словом (ревью Rodchenko); снапшот-тесты
на фикстурах с искусственным дрейфом; 3 расхождения 2026-07-13 (hermes/comms/
live-neural) — регресс-фикстуры; вызов из `ritual:evening` (не блокирующий шаг),
опционально tooling-doctor.

**ti-4 — `yarn llm:probe [provider]`** (dynin):
`scripts/llm-probe.mjs`: матрица `deepseek | voyage | anthropic | openrouter`,
каждый — прямой запрос И через `HTTPS_PROXY` (если задан); ключи из `.env` БЕЗ
печати значений (маска `sk-...abcd`); минимальный запрос (1 токен / лёгкий
endpoint) — не жечь баланс; классификация: 401/403 → ключ/гео; TLS/handshake fail
direct + ok via-proxy → DPI по отпечатку; 402/quota → баланс; ENOTFOUND/ECONNREFUSED
→ сеть; вывод — таблица `provider | direct | via-proxy | class`, моноширинное
выравнивание, статус словом; чистые функции классификации + юнит-тесты.

---

### Запрещено (проголосованные ограничения консилиума)

- Межпакетные зависимости, правки графа `packages/*` (кроме точечной ti-3 в тестах office).
- Логика auto-exclude в `task-closure-review.mjs` (решение: .gitignore).
- Печать значений ключей в `llm:probe`; запись в `.env`; пополнение балансов.
- Смешивать в спринт worktree-бутстрап / `pr:ship --worktree` (отдельная зона git-flow).
- Перепроверку хвостов #424/#425 включать в DoD (это применение инструмента, не спринт).

---

### Тесты

| Задача | Минимум |
|--------|---------|
| ti-2 | снапшот: фикстуры с дрейфом каждого типа → детерминированный отчёт; 3 кейса 2026-07-13 как регресс; чистое ядро — одинаковый вход → байт-в-байт |
| ti-4 | юнит классификации ошибок (mock-ответы каждого класса); маскирование ключей |
| ti-3 | 2 ранее ложно-красных e2e зелёные при выставленном в шелле HTTPS_PROXY; полный сьют office не сломан |
| ti-1 | `git status` чист от ревью-артефактов после prepare/run |

---

### Definition of Done

- [ ] ti-1: .gitignore + норма в регламенте + грепы; `git status` чист.
- [ ] ti-3: setup-env чистит все формы; норма-комментарий + строка в BACKGROUND_SERVERS.md; office-сьют зелёный при прокси в шелле.
- [ ] ti-2: `yarn insight:drift` (exit≠0 при дрейфе) + снапшот-тесты + вызов из ritual:evening; скан текущих реестров — 0 (после бэкфилла PR #432).
- [ ] ti-4: `yarn llm:probe` — таблица с классами, ключи маскированы, юнит-тесты классификации.
- [ ] `yarn test:scripts` + office-сьют зелёные; LGTM Teamlead (closure review) по задачам.

---

### Out of scope

- worktree-бутстрап (`worktree:new`, env-синк) и `pr:ship --worktree` — отдельный будущий спринт.
- Автозапуск llm:probe по cron; интеграция insight:drift в CI-гейт (только ritual:evening/tooling-doctor).
- Пополнение балансов провайдеров; закрытие хвостов #424/#425.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — держит порядок ti-1→ti-3→ti-2→ti-4 и запреты; LGTM перед мержем каждой.
2. **Структурщик (Ozhegov)** — ti-1 (топология артефактов, нормы в регламентах); границы скриптов.
3. **Математик (Dynin)** — ti-2/ti-3/ti-4: чистые ядра, детерминизм, классификация ошибок, тесты.
4. **Музыкант (Kuryokhin)** — смоук llm:probe перед ночными прогонами (без кода).
5. **Верстальщик (Rodchenko)** — ревью читаемости вывода ti-2/ti-4 (выравнивание, статус словом, не только цвет).

---

## Заметки для человека-постановщика

1. GitHub Issue **#433** (enhancement, package:infra).
2. Запись в `docs/tasks/registry.json` — сделана (`agent-tooling-friction`, active).
3. Консилиум-гейт пройден ДО кода: [`agent-tooling-friction-2026-07-13.md`](../seanses/agent-tooling-friction-2026-07-13.md).
4. После merge всех задач: `yarn task:archive agent-tooling-friction --notes "…"`.

### Проверка после PR

```bash
yarn insight:drift            # exit 0 на чистых реестрах
yarn llm:probe                # таблица 4 провайдеров, ключи маскированы
yarn test:scripts
$env:HTTPS_PROXY='http://127.0.0.1:1'; yarn workspace @membrana/background-office test   # зелёный
```

---

## Связь с дорожной картой

- Прямое следствие ретроспективы тулинга сессии 2026-07-13 (3 спринта/день — трение стало измеримым).
- ti-2 питает скилл `membrana-insight-overview` (крест-проверка занятости) и вечерний ритуал.
- ti-4 нужен к владельческим хвостам #424/#425 («пополнил баланс → yarn llm:probe»).
