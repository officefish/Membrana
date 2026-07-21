# Промпт: Р5: миграция процедур — реестр процедур, валидатор, донор meeting

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **N PR** — <одна фраза>.
> Реестр: `id` = `pl-r5-migration` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Р5 — сток цепи, после Р4. Канон: протокол m5-migration-manual. Общая легаси-база вне скоупа (решение владельца). Первый донор (ritual-evening) закрыт в Р1; здесь — реестр и второй донор.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы модулей |
| [`DESIGN.md`](../DESIGN.md) | UI (если есть) |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |
| <другие> | … |

**Референс (только идеи UX, не копировать код):** `packages/temp/...` — если есть.

**GitHub Issue:** [#786](https://github.com/officefish/Membrana/issues/786)

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. …
2. …

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| … | … | … |

**Запрещено:**

- …

---

### Визуальный дизайн (если есть UI)

- …

---

### Тесты

| Область | Минимум |
|---------|---------|
| … | … |

---

### Definition of Done

- [ ] …
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (или указать scope).
- [ ] LGTM Teamlead.

---

### Out of scope

- …

---

### Порядок работы ролей

1. **Teamlead** — …
2. **Структурщик** — …
3. **Математик** — …
4. **Музыкант** — …
5. **Верстальщик** — …

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: …
Definition of Done: …
```

---

---

## Acceptance criteria

> Источник: вердикты заседания procedural-layer (см. Контекст). Чеклист приёмки:

- [ ] docs/procedures/registry.json: все существующие процедуры записями {holder, container, vocabulary, grammar, homePath}; немигрированные — статус legacy
- [ ] migrated — производный предикат (container ∧ vocabulary ∧ grammar), не хранимое поле; каждое true с провенансом <persona>@<hash>
- [ ] Валидатор реестра в test:scripts: container ⟺ homePath; migrated ⟺ конъюнкция; непустой провенанс; ключи не пересекаются с реестром задач
- [ ] Донор meeting мигрирован (держатель vesnin): контейнер docs/procedures/meeting/ с precedents[] = 8 rejected-черновиков 21.07 + фикс #777
- [ ] Человекочитаемая проекция реестра генерится, руками не правится

## Заметки для человека-постановщика

1. GitHub Issue (`wish` / `bug` / `imperfection`) + ссылка на этот файл.
2. Запись в `docs/tasks/registry.json` (`status: active`).
3. После merge: отчёт в Issue → `yarn task:archive <slug> --notes "…"`.

### Проверка после PR

```bash
# команды проверки
```

---

## Связь с дорожной картой

- …
