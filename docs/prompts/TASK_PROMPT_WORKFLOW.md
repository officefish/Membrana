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
| PR + CI | Реализация и LGTM |

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
UI-задачи ссылаются на DESIGN.md; референс из `packages/temp/` — только wireframe,
не копировать цвета/классы демо. a11y и состояния loading/empty — в DoD.

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

### Шаг 4. Triage (Teamlead)

- Создать Linear ticket, `status:linear` на Issue.
- В комментарии Issue — Linear-ID.
- Уточнить `size` и `package:*` labels.

### Шаг 5. Реализация

- Ветка: по [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) (персонаж / `cursor/*` / `feature/*`).
- PR: `Closes #N`, Linear-ID в описании.
- Агент не расширяет scope без нового Issue / промпта.

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
| **S** | &lt; 1 день, 1–3 файла, без нового контракта API | Желателен; допускается только Issue |
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
