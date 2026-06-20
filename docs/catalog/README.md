# Каталог модулей и плагинов (catalog)

Живые **продуктово-архитектурные спецификации** для `apps/client` (и в перспективе `apps/cabinet`). Отдельный слой от task-реестра и от общих правил UI.

## Зачем

| Артефакт | Вопрос | Жизненный цикл |
|----------|--------|----------------|
| [`docs/tasks/registry.json`](../tasks/registry.json) | Что делаем **сейчас**? | `active` → `archived` |
| [`docs/prompts/*_PROMPT.md`](../prompts/) | Как **построить** фичу (разовая задача)? | Промпт остаётся после архивации задачи |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | **Как** регистрировать и верстать? | Стратегический регламент |
| **Этот каталог** | **Что** за модуль/плагин и как его **трогать**? | `draft` → `stable` → `deprecated` |

Task-промпт описывает PR и DoD. Catalog-промпт описывает **текущую правду** о сущности: UX, потоки данных, сервисы, запреты.

## Структура

```text
docs/catalog/
├── README.md                    # этот файл
├── _templates/
│   ├── MODULE_PROMPT.template.md
│   └── PLUGIN_PROMPT.template.md
└── client/
    ├── registry.json            # машиночитаемый индекс
    └── prompts/
        ├── modules/<id>.md
        └── plugins/<id>.md
```

Фаза 2 (отдельный эпик): `docs/catalog/cabinet/`.

## Статусы записей

| Статус | Значение |
|--------|----------|
| `draft` | Каркас заполнен; возможны пробелы; не блокирует merge |
| `stable` | Ревью Teamlead; обязателен к чтению агентом перед правками |
| `deprecated` | Сущность выводится из эксплуатации; в промпте — замена |

## Правила для людей и агентов

1. **Перед правками** в `apps/client/src/modules/<…>` или `apps/client/src/plugins/<…>` — прочитать catalog-промпт из `registry.json` → `promptPath`.
2. **После существенного PR** по модулю/плагину — обновить catalog-промпт (секция Changelog) в том же PR или follow-up.
3. **Не дублировать** task-реестр: новая фича → Issue + task-промпт; после merge — дистилляция в catalog.
4. **Не копировать** бизнес-логику в markdown — ссылаться на `@membrana/*-service` и пути в `apps/client`.
5. **Web Audio** только через `@membrana/audio-engine-service` ([`ARCHITECTURE.md`](../ARCHITECTURE.md) §1b).

## Связанные документы

- Эпик: [`MODULE_CATALOG_V1_EPIC_PROMPT.md`](../prompts/MODULE_CATALOG_V1_EPIC_PROMPT.md) · GitHub [#90](https://github.com/officefish/Membrana/issues/90)
- Процесс задач: [`TASK_PROMPT_WORKFLOW.md`](../prompts/TASK_PROMPT_WORKFLOW.md)
- Регистрация UI: [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md)

## Команды (после MC-7)

| Команда | Действие |
|---------|----------|
| `yarn catalog:verify-client` | Сверка `registry.json` с `registerClientModules.ts` |
