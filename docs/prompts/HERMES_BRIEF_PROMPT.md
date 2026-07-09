# Промпт: Hermes brief — детерминированный сборщик состояния сессии

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / Codex).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — `scripts/hermes-brief.mjs` + `yarn hermes:brief` + юнит-тест + тонкий `.claude/agents/hermes.md`.
> Реестр: `id` = `hermes-brief` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Источник: инсайт [`insight-hermes-liaison-agent`](../insights/insight-hermes-liaison-agent/INSIGHT.md) (adopted, вес 7.4/10).

---

## Контекст

Каждая агентская сессия начинается «с холода» и вручную пересобирает состояние проекта из
шести разбросанных источников (HANDOFF ночного билда, `MAIN_DAY_ISSUE`, активные карточки
реестра, открытые PR, память агента, git за сегодня). Форсайт-консилиум 2026-07-08 и
review команды (вес **7.4/10**, Teamlead → adopted) решили: **первый шаг — детерминированный
сборщик `yarn hermes:brief`**, который собирает эти источники в один иерархичный документ.
Это **функция ритма**, не 6-я роль команды; бриф **дескриптивный** (ссылается), не нормативный
(не переписывает `plan:day`/`standup`).

Уже есть база (night-build, PR #315): [`scripts/lib/git-day-context.mjs`](../../scripts/lib/git-day-context.mjs)
(`todaysCommits` / `todaysChangedFiles` / `dedupeSortCap`), HANDOFF (`yarn night:close`),
`tasks:archive-closed`. **Переиспользуй `git-day-context.mjs`, не дублируй.**

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`insight-hermes-liaison-agent/INSIGHT.md`](../insights/insight-hermes-liaison-agent/INSIGHT.md) | Scope, риски, форсайт-горизонт |
| [`insight-hermes-liaison-agent/RESEARCH.md`](../insights/insight-hermes-liaison-agent/RESEARCH.md) | Паттерны cross-session handoff (workflow-state ≠ session-state) |
| [`insight-hermes-liaison-agent/REVIEW.md`](../insights/insight-hermes-liaison-agent/REVIEW.md) | Голосование 5 ролей, контракты, запреты |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`scripts/lib/git-day-context.mjs`](../../scripts/lib/git-day-context.mjs) | Готовый сбор git-контекста дня |

**GitHub Issue:** `null` (заводится при закрытии или по желанию постановщика).

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Владелец этой задачи — **Математик (Dynin)**. Перед кодом — краткий план (1–2 абзаца +
список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и
[`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. **`scripts/hermes-brief.mjs`** — детерминированный сборщик, собирающий **6 источников** в
   один документ `docs/HERMES_BRIEF.md`. Каждый источник — с **graceful fallback** (нет
   источника → блок «н/д», а не падение):
   1. **HANDOFF** ночного билда (последний `HANDOFF*.md` / артефакт `night:close`).
   2. **`docs/MAIN_DAY_ISSUE.md`** — канон дня (если есть).
   3. **Активные карточки** `docs/tasks/registry.json` (`status: active`).
   4. **Открытые PR** — `gh pr list --json number,title,headRefName` (нет `gh` / не авторизован →
      блок «н/д», не падение).
   5. **Память агента** — `MEMORY.md` (индекс, если доступен).
   6. **Git за сегодня** — через `git-day-context.mjs` (`todaysCommits`, `todaysChangedFiles`).
2. **`docs/HERMES_BRIEF.md`** — жёсткая стабильная иерархия: **«Сейчас»** (короткий блок:
   фокус дня, открытые PR, активные карточки) → **«Контекст»** (HANDOFF, git дня, память) →
   **«Метаданные»** (commit-hash + ISO-timestamp генерации — «датчик возраста» брифа).
3. **`yarn hermes:brief`** в `package.json` → запускает скрипт.
4. **Тонкий read-only `.claude/agents/hermes.md`** — subagent-обёртка: читает/запускает бриф,
   **не** пишет прод-код, **не** голосует. Шаг 1.5, минимальный.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Скрипт-сборщик | `scripts/hermes-brief.mjs` | Чистые функции сбора + рендер markdown; CLI-обёртка внизу |
| Переиспользование | `scripts/lib/git-day-context.mjs` | git-контекст дня — **импортировать, не дублировать** |
| Юнит-тест | `scripts/hermes-brief.test.mjs` | Детерминизм на фикстуре (см. Тесты); в `test:scripts` |
| Subagent | `.claude/agents/hermes.md` | Тонкий read-only вестник |
| Выход | `docs/HERMES_BRIEF.md` | Генерируемый бриф (в `.gitignore`? — см. заметку) |

**Детерминизм (контракт Математика):** одинаковый вход (commit hash + набор файлов-источников)
→ **побайтово одинаковый** выход, кроме явного блока «Метаданные» с timestamp. Сортировка
источников и записей — **стабильная** (по id/пути), иначе детерминизм ломается на порядке.

**Разграничение (контракт Структурщика):** `hermes-brief.mjs` **читает выходные артефакты**
`plan:day`/`standup`/`night`, но **не импортирует их логику** и **не владеет данными** — он
агрегатор ссылок. Смена раннера не должна ломать контракт `state→brief`.

**Запрещено:**

- **LLM-резюме своими словами** — на первом шаге только сбор фактов (research Q2: LLM «врёт»
  ровно там, где заполняет пропуски инференсом).
- **Паковщик handoff** (`session-diff→handoff`) и **оркестратор сабагентов** (`tasks→plan`) —
  отложенные гипотезы форсайт-горизонта, **не** в этом PR.
- **UI-панель** — выход только markdown, не React-компонент.
- **Переписывание** `plan:day` / `standup` — бриф дескриптивный, ссылается, не нормативный.
- Расширять scope без нового Issue/промпта.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Детерминизм | Два прогона рендера на фиксированной фикстуре-состоянии → **идентичный markdown**, кроме блока «Метаданные» (timestamp вынесен отдельно и мокается/вырезается в сравнении) |
| Fallback | Отсутствующий источник (нет HANDOFF / нет `gh`) → блок «н/д», функция не бросает |
| Сортировка | Перемешанный вход карточек/PR → стабильный порядок в выходе |

Тест в `scripts/hermes-brief.test.mjs`, добавить в `test:scripts` (`node --test …`).

---

### Definition of Done

- [ ] `scripts/hermes-brief.mjs` + `yarn hermes:brief` генерирует `docs/HERMES_BRIEF.md` (6 источников, graceful fallback).
- [ ] Иерархия «Сейчас» → «Контекст» → «Метаданные» (commit-hash + timestamp) стабильна.
- [ ] `.claude/agents/hermes.md` — тонкий read-only.
- [ ] `scripts/hermes-brief.test.mjs` (детерминизм + fallback + сортировка) в `test:scripts`, зелёный.
- [ ] Переиспользован `git-day-context.mjs` (нет дубля git-логики).
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (или scope scripts + `yarn test:scripts`).
- [ ] LGTM Teamlead.

---

### Out of scope

- LLM-резюме / обобщение своими словами.
- Паковщик handoff, оркестратор сабагентов (форсайт-горизонт — гипотезы, не код).
- UI-панель брифа.
- Переписывание `plan:day` / `standup` / `main-day-issue`.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — держит scope на одном шаге; не пускает LLM/оркестратор/UI.
2. **Математик (Dynin, владелец)** — детерминизм, стабильная сортировка, юнит-тест, блок метаданных как «датчик возраста».
3. **Структурщик** — разграничение чтение-артефактов ≠ импорт-логики; graceful fallback каждого источника; переиспользование `git-day-context.mjs`.
4. **Музыкант** — держать блок «Сейчас» коротким и читаемым (форма важна, «без клиппинга»).
5. **Верстальщик** — жёсткая стабильная иерархия документа под будущий тривиальный парсинг (панель — after MVP).

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: 1 PR — hermes-brief.mjs + yarn hermes:brief + тест + .claude/agents/hermes.md
Definition of Done: чеклист выше выполнен, CI/scripts зелёные, LGTM Teamlead
```

---

## Заметки для человека-постановщика

1. GitHub Issue (`wish`) + ссылка на этот файл — по желанию (можно завести при закрытии).
2. Запись в `docs/tasks/registry.json` уже сделана при переходе инсайт→спринт (`id: hermes-brief`, `status: active`, `insightId`).
3. Реши судьбу `docs/HERMES_BRIEF.md`: генерируемый артефакт — вероятно в `.gitignore` (как отчётные документы), либо коммитить снимок. Отметить в PR.
4. После merge: отчёт → `yarn task:archive hermes-brief --notes "PR #…, hermes:brief собирает 6 источников"`.

### Проверка после PR

```bash
yarn hermes:brief && sed -n '1,40p' docs/HERMES_BRIEF.md
node --test scripts/hermes-brief.test.mjs
```

---

## Связь с дорожной картой

- Реализует **первый шаг** инсайта `insight-hermes-liaison-agent` (adopted, вес 7.4/10).
- Форсайт-горизонт (одна ветка контракта, **не** этот PR): брифинг `state→brief` → паковщик
  `session-diff→handoff` → оркестратор `tasks→subagent-plan`.
- После merge — новая сессия испытывает Hermes на входе (заявленная цель постановщика).
