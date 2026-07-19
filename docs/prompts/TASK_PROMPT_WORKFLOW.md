# Стандарт постановки задач (task prompt workflow)

> **Обязательный процесс** для любой крупной задачи агента в Membrana.
> Перед созданием нового `docs/prompts/*_PROMPT.md` прочитай этот файл целиком.
> Координатор следует [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).

---

## Зачем отдельный стандарт

Удачный цикл «постановка → PR → приёмка» требует **одного артефакта спецификации** (task-промпт), **трекинга статуса** (реестр задач) и **явного закрытия** (архивация). Чат с агентом не заменяет промпт; промпт не заменяет GitHub Issue.

| Артефакт | Назначение |
|----------|------------|
| GitHub Issue | Вход, triage, `Closes #N`, формальный отчёт |
| Linear ticket | Декомпозиция, статусы, исполнитель (после triage) |
| **Task-промпт** | Полная спецификация для агента (DoD, out of scope, архитектура) |
| **Реестр** [`docs/tasks/`](../tasks/) | Какие задачи **активны** / **в архиве** |
| **`MAIN_DAY_ISSUE.md`** | Один обязательный фокус дня (`yarn main-day-issue`) |
| PR + CI | Реализация и LGTM |

---

## MAIN_DAY_ISSUE и CURRENT_TASK (фокус дня)

Два разных документа; не путать при работе агента и при закрытии задачи.

| Документ | Как появляется | Роль |
|----------|----------------|------|
| [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md) | `yarn main-day-issue` после `yarn standup` | **Канон:** одна центральная задача дня, DoD, «не делаем сегодня» |
| [`CURRENT_TASK.md`](../CURRENT_TASK.md) | вручную человеком / агентом | **Буфер:** черновики, детали, ссылки; **может содержать мусор и устаревшее** |

**Порядок чтения перед кодом (M/L):**

1. `MAIN_DAY_ISSUE.md` — что делаем **сегодня**.
2. Task-промпт из реестра (`docs/prompts/*_PROMPT.md`) — полная спецификация.
3. GitHub Issue — triage и отчёт.
4. `CURRENT_TASK.md` — **только** если нужны доп. детали и они **не противоречат** п.1–3.

**Для постановщика:** в Issue и в промпте ссылайтесь на `id` реестра; утром после ритуала проверяйте, что `primaryFocusId` в `MAIN_DAY_ISSUE` совпадает с активной задачей.

**Для агента:** не трактовать `CURRENT_TASK` как источник приоритетов. При конфликте — побеждают `MAIN_DAY_ISSUE`, реестр, task-промпт.

Подробнее: [`DEVELOPER_RHYTHM.md`](../DEVELOPER_RHYTHM.md).

---

## Мнения виртуальной команды (зафиксировано на v1 процесса)

```text
[Teamlead — Vesnin]:
Любая задача размером M и выше обязана пройти через реестр и task-промпт до первого коммита кода.
Issue — для triage и истории; промпт — для исполнения. Без блока «Промпт целиком» агент
не стартует. Закрытие = merge PR + отчёт в Issue + `yarn task:archive <id>`.

[Структурщик]:
В промпте заранее таблица «слой → путь → ответственность». Запрещённые импорты — отдельным
списком. Если два плагина делят hub — указать это явно, чтобы не плодить второй AudioContext.

[Математик — Dynin]:
Всё, что можно выразить формулой, — в `packages/services/*`, pure TS, unit-тесты в том же PR
или явно в DoD следующего PR. В промпте — типы входа/выхода, не «как в демо на глаз».

[Музыкант]:
Для аудио-задач в DoD — ручная проверка с микрофоном (тишина / речь / целевой сигнал).
Указать известные ограничения headless (нет устройства — не считать блокером CI).

[Верстальщик]:
UI-задачи ссылаются на DESIGN.md; live-детектор и demo — также LIVE_DETECTION_UI.md
(сглаживание isDrone/confidence, статические строки, h-full без прыгающего scrollbar).
Референс из `packages/temp/` — только wireframe, не копировать цвета/классы демо.
a11y и состояния loading/empty — в DoD.

Итоговый артефакт процесса: task-промпт + запись в docs/tasks/registry.json + Issue.
Definition of Done процесса: задача в архиве, промпт остаётся в docs/prompts/ как спецификация.
```

---

## Жизненный цикл (7 шагов)

```
Идея → GitHub Issue → Реестр (active) → Task-промпт → Работа агента → PR → Архивация
         │                │                  │              │           │
         │                │                  │              └── Closes #N
         │                │                  └── блок «Промпт целиком»
         │                └── registry.json + README
         └── wish / bug / imperfection
```

### Шаг 0 (гейт). Консилиум для архитектурных задач

**До первой строчки кода** задача проходит консилиум (`yarn consilium --save-as <slug>`,
протокол ≥20 реплик в `docs/seanses/`, скилл `membrana-consilium`), если она содержит
**архитектурную развилку**: новые контракты `@membrana/core` (типы/сокеты/node kinds),
новый пакет, новые узлы палитры device-board, L-эпик, спор value-vs-ref / границ слоёв.

Исполнение по **уже готовому канону** (контракты утверждены, паттерн есть) консилиума
не требует — достаточно inline-обсуждения пяти ролей в диалоге.

> Прецедент (2026-07-09, эпик #323): консилиум ИЗМЕНИЛ черновые контракты трёх узлов
> из пяти (fusion ref→value; proximity host→core-лемма; отчёт async→sync-конструктор).
> Inline-роли этих ошибок не поймали. Протокол коммитится вместе с поправками промпта.

### Шаг 1. GitHub Issue

По [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md): шаблон `wish` | `bug` | `imperfection`, заголовок «глагол + цель», 2–5 acceptance criteria.

В Issue **обязательно** добавить ссылку на будущий промпт (после шага 3) и на реестр.

### Шаг 2. Запись в реестр (status: `active`)

Отредактировать [`docs/tasks/registry.json`](../tasks/registry.json) или выполнить (когда появится):

```bash
yarn task:register --id <slug> --title "..." --prompt docs/prompts/<SLUG>_PROMPT.md --issue <N> --size M
```

Поля:

| Поле | Правило |
|------|---------|
| `id` | kebab-case, стабильный (`fft-indices-viz`) |
| `promptPath` | `docs/prompts/<NAME>_PROMPT.md` |
| `githubIssue` | номер Issue или `null` до создания |
| `size` | `S` \| `M` \| `L` |
| `status` | `active` |
| `createdAt` | ISO date `YYYY-MM-DD` |

После изменения реестра: `yarn task:sync-readme` (или архив/регистрация вызывают sync автоматически).

### Шаг 3. Task-промпт

Скопировать [`TASK_PROMPT_TEMPLATE.md`](./TASK_PROMPT_TEMPLATE.md) → `docs/prompts/<SLUG>_PROMPT.md`.

Обязательные разделы шаблона:

1. Шапка (task-промпт, размер S/M/L, ожидаемый артефакт PR).
2. Контекст + таблица связанных документов.
3. **Промпт целиком** — блок для копирования агенту в начало диалога.
4. Математический / архитектурный контракт (если применимо).
5. Definition of Done (чеклист).
6. Out of scope.
7. Порядок ролей.
8. Заметки для постановщика (Issue, проверка после PR).

В начале диалога с агентом пользователь вставляет:

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и промпту:
docs/prompts/<SLUG>_PROMPT.md (блок «Промпт целиком»).
```

### Шаг 4. Triage (Teamlead) + Linear (неблокирующий)

**Обязательно для M/L:** уточнить `size` и `package:*` labels.

**Linear (рекомендуется, не блокирует старт кода):** см. [`LINEAR_GITHUB_SYNC_REGULATION.md`](./LINEAR_GITHUB_SYNC_REGULATION.md) — этап **R1**.

- При наличии `githubIssue` — ticket в Linear **привязывается** к Issue, **не дублирует** его.
- Записать `linearId` в `registry.json`; комментарий в Issue с URL Linear.
- По желанию: `status:linear` на Issue.

Отсутствие Linear **не** блокирует шаги 5–7.

### Шаг 5. Реализация

- Ветка: по [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) (персонаж / `cursor/*` / `feature/*`).
- PR: `Closes #N`, Linear-ID в описании.
- Агент не расширяет scope без нового Issue / промпта.
- **Логи deploy/recover** не пишем в корень репо (`cabinet-recover*.txt`, `deploy-*.txt`, …) — только `%TEMP%` / `$TMPDIR` или `docs/archive/`; см. [`CONTRIBUTING.md`](../CONTRIBUTING.md) → VPS deploy.

### Шаг 6. Приёмка

- CI зелёный.
- DoD из промпта выполнен.
- Формальный отчёт в GitHub Issue ([`TASKS_MANAGEMENT.md` §6](../TASKS_MANAGEMENT.md)).
- Teamlead LGTM.

### Шаг 7. Закрытие задачи

Полный чеклист — **[`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md)** (DoD, PR, отчёт в Issue, архив).

Кратко:

```bash
yarn task:archive <id> --notes "PR #…, краткий итог"
```

Скрипт:

- переводит запись в `status: archived`, проставляет `archivedAt`;
- создаёт карточку `docs/tasks/archive/<id>.md`;
- обновляет [`docs/tasks/README.md`](../tasks/README.md).

**Промпт-файл не удаляется** — остаётся спецификацией; архивируется только **работа по задаче** в реестре.

---

## Размер задачи

| Размер | Когда | Промпт обязателен? |
|--------|--------|-------------------|
| **S** | &lt; 1 день, 1–3 файла, без нового контракта API | Не нужен — issue с эпизодами достаточно; для **тулинг-спринтов карточка реестра обязательна** (трекинг; слово владельца 19.07, токен `s-tooling-sprint-card-required-prompt-optional`) |
| **M** | 1 PR, новый модуль/плагин, заметная UI | **Да** |
| **L** | Несколько PR, новый пакет, миграция | **Да** + разбиение в Linear |

---

## Связь с другими документами

| Документ | Роль |
|----------|------|
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue ↔ Linear ↔ PR |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли и формат ответа координатора |
| [`docs/tasks/README.md`](../tasks/README.md) | Активные и архивные задачи (авто/ручной sync) |
| [`docs/prompts/README.md`](./README.md) | Каталог файлов промптов |

---

## Команды

| Команда | Действие |
|---------|----------|
| `yarn task:list` | Список active / archived |
| `yarn task:sync-readme` | Пересобрать `docs/tasks/README.md` из registry |
| `yarn task:archive <id>` | Архивировать задачу (после [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md)) |
| `yarn task:archive <id> --notes "..."` | + заметка в карточке архива |
| `yarn main-day-issue` | Сгенерировать канон дня → `docs/MAIN_DAY_ISSUE.md` |

### Night Build

Эпики с `"sprintKind": "night-build"` — [`NIGHT_SPRINT_REGULATION.md`](../NIGHT_SPRINT_REGULATION.md).

| Команда | Действие |
|---------|----------|
| `yarn night:open --id <epic-id>` | Старт ночного sprint → `NIGHT_BUILD_ACTIVE.md` |
| `yarn night:checkpoint --phase NB<n> --status pass\|fail` | Append в `NIGHT_BUILD_LOG.md` |
| `yarn night:close --id <epic-id>` | Handoff → `docs/archive/night-build/` |

---

## Чего не делать

- Не начинать M/L задачу только с чата — без промпта и реестра.
- Не архивировать без merge / без отчёта в Issue (исключение: `wontfix` с пометкой в `--notes`).
- Не дублировать длинный план реализации в Issue — только в промпте или Linear.
- Не удалять `*_PROMPT.md` при архивации.

---

## Версия процесса

- **v1.0** (2026-05-15) — реестр, архивный скрипт, шаблон промпта, связка с TASKS_MANAGEMENT.

Изменения процесса — PR с пометкой `/architect` и LGTM Vesnin.
