# Промпт: Эпик: ассортимент веток в docs/audit/git под рефактор спринта и code review

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **L**.
> Ожидаемый артефакт: **несколько PR** — по фазам Ф0–Ф5, squash в main.
> Реестр: `id` = `branch-assortment-sprint` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Контейнер [`docs/audit/git/`](../audit/git/README.md) уже умеет hygiene (7 категорий,
Scenario A/B). Нужен второй орган — **ассортимент веток**, которым можно покрыть
любую работу при рефакторинге спринта и code review. Опоры: история ~500 merged PR,
форматы (`FORMATS.md`), грамматика Р4 (канон, не реализуем здесь), паттерн
`GROUP_CONTAINERIZATION`. Сессия: [`SESSION_CONTEXT.md`](../audit/git/SESSION_CONTEXT.md).

Фазы-дети: `ba-f0-brief` … `ba-f5-closure` (#802–#807). Цепь Ф0→Ф5.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, leadPersona |
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Постановка / archive |
| [`docs/audit/git/AGENT_PROMPT.md`](../audit/git/AGENT_PROMPT.md) | Hygiene Scenario A/B |
| [`docs/patterns/GROUP_CONTAINERIZATION.md`](../patterns/GROUP_CONTAINERIZATION.md) | Органы контейнера |
| [`docs/FORMATS.md`](../FORMATS.md) | Жанры работы |
| [`docs/storm/storm-branch-taxonomy-2026-07-21/REPORT.md`](../storm/storm-branch-taxonomy-2026-07-21/REPORT.md) | Тезисы T10–T13 |

**GitHub Issue:** [#801](https://github.com/officefish/Membrana/issues/801)

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Фазы исполняет `leadPersona` карточки. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md)
и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md). Перед работой — [`SESSION_CONTEXT.md`](../audit/git/SESSION_CONTEXT.md).

---

### Что построить (продуктовое описание)

1. Свежий hygiene-реестр (Scenario A) + понимание истории пушей.
2. Карту покрытия жанров работы живыми ветками (дыры явны).
3. Орган ассортимента в контейнере `docs/audit/git/` (контракт + артефакт).
4. Линзу для code review / ship — как читать ассортимент.
5. CLOSURE спринта и handoff.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Контейнер | `docs/audit/git/` | registry / analysis / AGENT_PROMPT / README |
| Tooling | `yarn repo:branches:decompose` | Scenario A (не переизобретать) |
| Реестр задач | `docs/tasks/registry.json` | эпик + фазы, leadPersona |

**Запрещено:**

- Реализация грамматики Р4 / шип-гейта (`procedural-layer-impl`).
- `yarn repo:clean --execute` без явного ok владельца.
- Scenario B без номера категории в текущем сообщении (HARD GATE).
- Класть audit-cache вне `docs/audit/git/cache/`.

---

### Definition of Done

- [ ] Все фазы Ф0–Ф5 архивированы со свидетельствами (PR/SHA).
- [ ] В контейнере есть орган ассортимента + карта покрытия.
- [ ] `SESSION_CONTEXT` / README контейнера согласованы с фактом.
- [ ] LGTM Teamlead (vesnin) на эпик.

---

### Out of scope

- Движок `resolveHolder` / CI-зуб грамматики веток.
- Массовая чистка веток.
- Миграция ритуалов в `docs/procedures/` (чужой спринт).

---

### Порядок фаз и ролей

| Фаза | id | leadPersona |
|------|-----|-------------|
| Ф0 | `ba-f0-brief` | vesnin |
| Ф1 | `ba-f1-inventory` | ozhegov |
| Ф2 | `ba-f2-coverage` | dynin |
| Ф3 | `ba-f3-assortment` | ozhegov |
| Ф4 | `ba-f4-review-lens` | rodchenko |
| Ф5 | `ba-f5-closure` | angelina |

---

## Acceptance criteria

- [ ] Эпик и фазы в реестре `active` с Issues #801–#807
- [ ] Промпты фаз заполнены до кода соответствующей фазы
- [ ] Цепь Ф0→Ф5 соблюдена
- [ ] Linear (R1) привязан к Issues, когда доступен — `linearId` в реестре
- [ ] После всех фаз: `yarn task:archive branch-assortment-sprint`

## Заметки для человека-постановщика

1. Issues #801–#807 созданы через `yarn task:start`.
2. Linear — неблокирующий R1; команда Druid.
3. Ветка работы: `docs/audit-git-container-followup` (уже есть).
