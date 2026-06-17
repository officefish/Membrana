# Регламент хакатона (Hackathon Sprint)

> **Хакатон** — много-дневный спринт внедрения **осевой фичи** с несколькими эпиками в день, без обычных утренних/вечерних ритуалов дня.  
> Первый кейс: [`prompts/DEVICE_BOARD_HACKATHON_BRIEF.md`](./prompts/DEVICE_BOARD_HACKATHON_BRIEF.md).  
> Связано: [`DEVELOPER_RHYTHM.md`](./DEVELOPER_RHYTHM.md), [`NIGHT_SPRINT_REGULATION.md`](./NIGHT_SPRINT_REGULATION.md), [`TASK_PROMPT_WORKFLOW.md`](./prompts/TASK_PROMPT_WORKFLOW.md).

---

## Когда использовать

| Режим | Когда | Пример |
|-------|--------|--------|
| **Дневной M/L** | Обычный ритм, один фокус | Детектор, hotfix журнала |
| **Night Build** | Одна ночь, один эпик | DRY, lint gate |
| **Хакатон** | 3–5 дней, несколько эпиков/день, заморозка повестки | device-board v1 |

**Хакатон не заменяет:**

- архитектурные изменения без ветки **`vesnin`** и LGTM Vesnin;
- prod-deploy (отдельный PR после закрытия);
- triage посторонних Issue — только блокеры из handoff.

**Не смешивать:** Night Build и хакатон в одну календарную ночь.

---

## Сводная таблица ритуалов

| Момент | Команды / действия | Артефакт |
|--------|-------------------|----------|
| **Подготовка** | Brief владельца + бриф-интервью (≥20 вопросов) | `docs/prompts/*_HACKATHON_BRIEF.md`, `docs/seanses/hackathon-brief-interview-*.md` |
| **Старт** | `yarn hackathon:open --id <hackathon-id>` *(или чеклист вручную)* | `docs/HACKATHON_ACTIVE.md` |
| **В течение дня** | Эпики по реестру; консилиум при блокере | `docs/HACKATHON_LOG_DAY_N.md` |
| **Закрытие дня** | Дневное интервью (≥20 вопросов) + handoff | `docs/archive/hackathon/<date>/DAY_N_HANDOFF.md` |
| **Финал** | `yarn hackathon:close --id <hackathon-id>` | `docs/archive/hackathon/<date>/CLOSURE.md` |
| **После** | Возобновить `yarn ritual:day` | — |

### Что приостановлено пока `HACKATHON_ACTIVE.md` → `status: open`

- `yarn ritual:day`, `yarn ritual:evening`
- `yarn plan:day`, `yarn standup`, `yarn main-day-issue`
- `yarn archive:daily-day` (опционально; handoff хакатона важнее)

**Допустимо:** `yarn consilium`, `yarn ask`, `yarn task:archive` для эпиков хакатона, scoped CI.

---

## Жизненный цикл (7 шагов)

```
Brief → бриф-интервью → hackathon:open → дни (эпики + handoff) → hackathon:close → ritual:day
```

### Шаг 0. Предусловия

1. Brief утверждён владельцем (`docs/prompts/*_HACKATHON_BRIEF.md`).
2. Бриф-интервью проведено; протокол в `docs/seanses/`.
3. Эпики зарегистрированы в [`docs/tasks/registry.json`](./tasks/registry.json) с `"sprintKind": "hackathon"`, `"parentHackathonId": "<id>"`.
4. Рабочая ветка: `hackathon/<id>-<YYYY-MM-DD>` от **`vesnin`** (если есть core) или `techies68`.

### Шаг 1. Открытие

`HACKATHON_ACTIVE.md` содержит:

- `hackathonId`, даты, ветку;
- ссылку на brief и протокол интервью;
- таблицу дней H1…Hn и эпиков;
- stop rules.

**Запрещено открывать**, если brief или интервью отсутствуют.

### Шаг 2. Замороженный scope

В brief обязательны: **In scope**, **Out of scope**, **Stop rules**, **DoD**.

Агент не меняет `MAIN_DAY_ISSUE`, не добавляет Issue вне parentHackathonId.

### Шаг 3. День хакатона

- Утро: читать `HACKATHON_ACTIVE.md` + handoff вчера (не `standup`).
- Работа по эпикам дня в порядке brief.
- Append в `HACKATHON_LOG_DAY_N.md` после каждого эпика.
- Середина дня: `yarn consilium` только при блокере scope/контрактов.

Чекпоинт (минимум):

```bash
git status -sb
yarn turbo run lint typecheck test --continue --filter='…'
```

### Шаг 4. Закрытие дня

1. **Дневное интервью** (команда → владелец, ≥20 вопросов): что пошло не так, нужен ли пересмотр эпиков.
2. `DAY_N_HANDOFF.md`: сделано / не сделано / блокеры / план на завтра.
3. Протокол интервью: `docs/seanses/hackathon-day-N-close-interview-<date>.md`.

### Шаг 5. Роли (эвристика device-board)

| Фаза | Lead | Support |
|------|------|---------|
| Контракты core | Vesnin | Ozhegov, Dynin |
| Board shell / XYFlow | Ozhegov | Rodchenko |
| Scenario runtime | Ozhegov | Музыкант |
| Интеграция mic/journal | Музыкант | Ozhegov |
| Board mode UI | Rodchenko | Vesnin |

### Шаг 6. Закрытие хакатона

1. Финальное дневное интервью.
2. Scoped CI по brief.
3. `CLOSURE.md`: merge status, отложено, рекомендация следующего хакатона.
4. `HACKATHON_ACTIVE.md` → `status: closed`.
5. Батч `yarn task:archive` для эпиков хакатона.

### Шаг 7. Возврат к обычному ритму

`yarn ritual:day` — с учётом `CLOSURE.md` и handoff.

---

## Типы сессий (не путать)

| Сессия | Участники | Цель |
|--------|-----------|------|
| **Консилиум** | 5 ролей спорят | Архитектурный консенсус → `yarn consilium` |
| **Бриф-интервью** | Команда → владелец | Уточнить brief до старта |
| **Дневное интервью** | Команда → владелец | Закрытие дня, коррекция курса |

---

## Скрипты (целевые)

| Команда | Статус |
|---------|--------|
| `yarn hackathon:open --id <id>` | Запланировано |
| `yarn hackathon:day-close --day N` | Запланировано |
| `yarn hackathon:close --id <id>` | Запланировано |

До реализации скриптов — ручной чеклист по этому документу.

---

## Артефакты

| Файл | Назначение |
|------|------------|
| `docs/HACKATHON_ACTIVE.md` | Текущий хакатон |
| `docs/HACKATHON_LOG_DAY_N.md` | Лог дня |
| `docs/archive/hackathon/<date>/DAY_N_HANDOFF.md` | Handoff |
| `docs/archive/hackathon/<date>/CLOSURE.md` | Итог |
| `docs/seanses/hackathon-*-interview-*.md` | Протоколы интервью |

---

*Версия: 0.1 · 2026-06-17 · Источник: консилиум формата хакатона.*
