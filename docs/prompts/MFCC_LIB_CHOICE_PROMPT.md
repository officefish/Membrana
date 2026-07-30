# Промпт: Выбор MFCC-библиотеки: обоснование до нарезки блоков

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **S**.
> Ожидаемый артефакт: **N PR** — <одна фраза>.
> Реестр: `id` = `mfcc-lib-choice` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

<1–2 абзаца: зачем задача, что уже есть в репозитории, что не трогаем.>

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы модулей |
| [`DESIGN.md`](../DESIGN.md) | UI (если есть) |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |
| <другие> | … |

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

## Вопросы для research (Q1–Q3)

> Заполнить ДО `yarn research mfcc-lib-choice`. Вопрос — конкретный и самодостаточный:
> Perplexity ответит на что угодно, включая обрывок (инцидент 2026-07-12, #402).

1. **Landscape:** Which JavaScript/TypeScript libraries compute MFCC (mel-frequency cepstral coefficients) from audio and work both in the browser (Web Audio API) and in Node.js? Compare Meyda, essentia.js and any other maintained options as of 2025-2026 on: license, package size, whether they require WebAssembly, maintenance activity, and whether MFCC parameters (number of mel filters, number of coefficients, FFT size, hop size) are configurable.
2. **Fit:** For detecting low-frequency mechanical and propeller sounds such as drones — not speech — which MFCC parameter values are recommended, and how do they differ from speech defaults (typically 26 mel filters, 13 coefficients, 25 ms window)? Does the mel scale remain appropriate for sources whose energy sits below 1 kHz, or do practitioners use linear or bark scaling instead?
3. **Risk:** What are the known failure modes of MFCC for non-speech acoustic detection compared with raw spectral features such as spectral flux or harmonic analysis? Specifically: sensitivity to background noise and wind, behaviour under varying distance and Doppler shift, loss of harmonic structure information, and which preprocessing steps (pre-emphasis, normalisation, denoising) practitioners consider mandatory.
