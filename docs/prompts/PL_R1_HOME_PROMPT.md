# Промпт: Р1: дом процедурного слоя docs/procedures + validateProcedure + жилец ritual-evening

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **N PR** — <одна фраза>.
> Реестр: `id` = `pl-r1-home` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Р1 — фундамент цепи. Канон: протокол m1-home-r2 (docs/seanses/procedural-layer-m1-home-r2-2026-07-21.md) + паттерн GROUP_CONTAINERIZATION (подвид manifest-only — добавить в чеклист паттерна). Дом слоя не существует — создаётся с нуля; scripts/ не перекраивается (T11).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы модулей |
| [`DESIGN.md`](../DESIGN.md) | UI (если есть) |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |
| <другие> | … |

**Референс (только идеи UX, не копировать код):** `packages/temp/...` — если есть.

**GitHub Issue:** [#782](https://github.com/officefish/Membrana/issues/782)

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

- [ ] Создан docs/procedures/ + контейнер ritual-evening/ (README.md + MANIFEST.json: id, leadPersona=angelina, kitVersion, engines[] — только резолвящиеся ссылки в scripts/, precedents[])
- [ ] MANIFEST.json имеет фиксированную машиночитаемую схему; кода и тестов в контейнере нет
- [ ] Чистая validateProcedure(dir): resolvable ∧ readmeNonEmpty ∧ manifestSchemaOk; юнит-тесты; вызов в CI (test:scripts)
- [ ] README жильца фиксирует различие «определение (procedures) ↔ прогон (storm/meeting)»
- [ ] Чеклист GROUP_CONTAINERIZATION расширен подвидом manifest-only

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
