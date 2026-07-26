# Промпт: insight review принимает готовый REVIEW.md из чата (как консилиум — протокол)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **S**.
> Ожидаемый артефакт: **1 PR — insight review принимает готовый REVIEW.md и переставляет статусы сам**.
> Реестр: `id` = `insight-review-from-file` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

yarn insight review жёстко ходит в Anthropic; при исчерпанном лимите канон сам объявляет фолбэк «ревью в чате по INSIGHT_REVIEW_PROMPT, REVIEW.md руками» (CREDIT_FALLBACKS), но принять готовый файл нечем. У консилиума есть --secretary-file, у task:review:run --review-file, у insight review — ничего: статусы meta.json и registry переставлялись однострочником (вещдок 26.07, insight-cast-carrier-contract).

Попутно: детектор исчерпания ищет «credit balance is too low», а лимит пришёл как «specified API usage limits» — подсказка фолбэка не напечаталась ровно там, где написана.

Не трогаем: состав ролей ревью и формат REVIEW.md.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы модулей |
| [`DESIGN.md`](../DESIGN.md) | UI (если есть) |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |


**Референс (только идеи UX, не копировать код):** `packages/temp/...` — если есть.

**GitHub Issue:** — (не заведён)

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
