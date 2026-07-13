# CURRENT_TASK

> **Буфер** — при конфликте проигрывает [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md) и реестру.

## UI-панель «Дрейф-якоря» — финал эпика #396 (2026-07-14)

**Решения владельца 2026-07-13 (вечерний бриф):**

1. UI-панель — **завтра**, свежей сессией (не в марафоне 13.07).
2. Размещение: **владелец поднял архитектурную развилку** — возможно НЕ в кабинете,
   а **отдельный операторский UI** (например, поддомен `panel.mmbrn.tech`).
   ⚠️ **Это консилиум-гейт ДО кода**: новая UI-поверхность/приложение (кабинет vs
   отдельный panel-app) — вопрос границ, деплоя, auth. НЕ начинать компонент, пока
   консилиум не вынес вердикт по месту.
3. Эпик #396 после панели — **закрыть** (`task:archive drift-anchor-contour`);
   полевой data-anchor по реальным записям → backlog **#420** (privacy-развилка,
   не начинать без отдельного консилиума + LGTM владельца).

### Старт (вставить в начало новой сессии)

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md. Эпик #396, финальная фаза: UI-панель
«Дрейф-якоря». Шаг 0 (ОБЯЗАТЕЛЬНО ДО КОДА): yarn consilium --save-as drift-panel-placement
— развилка «кабинет vs отдельный операторский UI (panel.mmbrn.tech)» (поднял владелец
2026-07-13). Затем реализация по вердикту. Контекст: memory project_drift_anchor_contour,
ADR 0004 (транспорт готов и жив).
```

### Что уже готово (не переделывать)

- Данные: `GET https://office.mmbrn.tech/v1/drift-anchor/digest` — публичный, живой,
  отдаёт записи `code:schedule` + `data:schedule` (+ `code:ci` после первого PR в detectors).
- Чистая математика: `evaluateProdMainDivergence` (@membrana/core) — danger-строка
  «Прод ≠ main» считается на потребителе, office — тупой транспорт (ADR 0004).
- Требования консилиума drift-anchor-triggers к самой панели: 3 строки
  (code/CI · code/schedule · data/schedule), возраст baseline/записи, danger-строка
  иконка+текст (не только цвет), `tabular-nums`, `aria-live="polite"`, DESIGN.md.
- Устаревание после редеплоя office ВИДИМО (takenAt): «нет свежей записи» ≠ «ok».

**Реестр:** `id: drift-anchor-contour` (эпик #396, финальная фаза)
**ADR:** [`0004-drift-anchor-journal-transport.md`](./adr/0004-drift-anchor-journal-transport.md) (ACCEPTED, E2E жив)
**Backlog после закрытия:** #420 (полевой data-anchor, privacy)

---

## Второй трек: Persona Memory фаза 1 (owner override 2026-07-13)

Инсайт `insight-persona-persistent-memory` (adopted 5.4) отправлен в разработку
решением владельца (вес <6.0 — осознанный override, зафиксирован в meta.json).
Спринт `persona-memory-phase1` зарегистрирован (lead dynin). Отдельная сессия /
отдельный worktree — не смешивать с drift-panel.

### Старт (вставить в начало новой сессии)

```text
Следуй docs/prompts/PERSONA_MEMORY_PHASE1_PROMPT.md (реестр: persona-memory-phase1).
Фаза 1 инсайта insight-persona-persistent-memory: детерминированный extractor
(docs/seanses/*-PROTOCOL.md + docs/insights/*/REVIEW.md → docs/virtual-team/memory/dynin.md,
provenance+дата), токен-бюджет <5K, plain Markdown БЕЗ векторов и БЕЗ LLM в экстракции,
инъекция в yarn ask/consilium за флагом (default off), человек-гейт на запись.
Эталон — hermes-brief (PR #316). Merge только после LGTM Vesnin.
Scope review НЕ переоткрывать; фазы 2-3 — см. секцию «Фазы» в INSIGHT.md.
```
