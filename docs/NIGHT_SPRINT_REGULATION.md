# Регламент ночных спринтов (Night Build)

> **Night Build** — автономный цикл разработки **между вечерним и утренним ритуалом**: агент (Cursor Cloud / локальный) выполняет **замороженный эпик** без расширения scope, с фиксированными чекпоинтами и утренней передачей (handoff).
>
> Связано: [`DEVELOPER_RHYTHM.md`](./DEVELOPER_RHYTHM.md), [`TASK_PROMPT_WORKFLOW.md`](./prompts/TASK_PROMPT_WORKFLOW.md), [`VIRTUAL_TEAM_PROMPT.md`](./VIRTUAL_TEAM_PROMPT.md).

---

## Когда использовать

| Режим | Когда | Пример |
|-------|--------|--------|
| **Дневной M/L** | Рабочие часы, LGTM человека, prod-smoke | MP1–MP6 Membrane Platform |
| **Night Build** | После `yarn ritual:evening`; до `yarn ritual:day` | Рефакторинг, DRY, lint gate, UI polish без prod |

**Night Build не заменяет:**

- prod-deploy и prod-smoke (только утром или отдельным дневным PR);
- архитектурные изменения `@membrana/core` / `agenda` / `MembraneRegistry` — только ветка **`vesnin`** и явное LGTM Vesnin;
- triage новых Issue «по ходу» — только блокеры из чекпоинта.

---

## Сводная таблица ритуалов

| Момент | Команды | Артефакт |
|--------|---------|----------|
| **Старт ночи** | `yarn night:open --id <epic-id>` | `docs/NIGHT_BUILD_ACTIVE.md` |
| **Во время ночи** | агент по epic-промпту, чекпоинты каждые ~90 мин | `docs/NIGHT_BUILD_LOG.md` (append) |
| **Утро (до day ritual)** | `yarn night:close --id <epic-id>` | `docs/archive/night-build/<date>/HANDOFF.md` |
| **Утро (канон)** | `yarn ritual:day` | `MAIN_DAY_ISSUE` учитывает handoff |

---

## Жизненный цикл Night Build (6 шагов)

```
Вечер code-review → night:open → агент (NB0→NBn) → CI checkpoints → night:close → утро merge/review
```

### Шаг 0. Предусловия (вечер)

1. Выполнен **`yarn ritual:evening`** (или минимум `code-review` + архив ревью).
2. Эпик зарегистрирован в [`docs/tasks/registry.json`](./tasks/registry.json) с `"sprintKind": "night-build"`.
3. Epic-промпт содержит блок **«Night Build — промпт целиком»** и таблицу фаз NB0…NBn.
4. Рабочая ветка создана: `night/<epic-id>-<YYYY-MM-DD>` от актуального **`origin/main`**.

### Шаг 1. Открытие (`yarn night:open`)

Скрипт фиксирует:

- `epicId`, время старта (ISO), ветку, список активных подзадач NB*;
- чеклист предусловий (lint baseline, чистое дерево или явный waiver в комментарии);
- ссылку на epic-промпт.

**Запрещено открывать night build**, если:

- нет epic-промпта или подзадач NB0 в реестре;
- в `NIGHT_BUILD_ACTIVE.md` уже висит незакрытый sprint (без `--force`).

### Шаг 2. Замороженный scope

В epic-промпте обязательны:

| Блок | Содержание |
|------|------------|
| **In scope** | Только фазы NB0–NBn |
| **Out of scope** | Явный список (prod, новые фичи, core/agenda) |
| **Stop rules** | При 2 падениях CI подряд — стоп, handoff с блокером |
| **Роли по фазам** | Кто lead / support (Vesnin, Ozhegov, …) |

Агент **не** добавляет Issue, не меняет `MAIN_DAY_ISSUE`, не архивирует задачи без явной фазы NB.

### Шаг 3. Чекпоинты (каждые ~90 мин или после каждой фазы)

Минимальный набор:

```bash
git status -sb
yarn turbo run lint typecheck test --continue --filter='!@membrana/client'  # или scope из промпта
git add -A && git commit -m "night(<epic-id>): NB<n> <кратко>"   # если есть изменения
git push origin HEAD
```

Append в `docs/NIGHT_BUILD_LOG.md`:

```markdown
## Checkpoint NB<n> — <ISO time>
- Фаза: …
- CI: pass | fail (лог: …)
- Следующий шаг: …
- Блокер: — | описание
```

**Ночью не делаем:** `yarn task:close-github`, prod SSH, `--force` push.

### Шаг 4. Роли виртуальной команды (ночной порядок)

| Фаза | Lead | Support | Фокус |
|------|------|---------|--------|
| NB0 Gate | Vesnin | Ozhegov | lint/test, граф зависимостей |
| NB1 DRY | Ozhegov | Dynin, Музыкант | shared playback package |
| NB2 Facade | Ozhegov | Rodchenko | hooks, split page, session reset |
| NB3 Quality | Rodchenko | Dynin, Vesnin | a11y, cache, OpenAPI sketch |

Музыкант подключается только если фаза трогает `BufferPlayer` / seek / clipping.

### Шаг 5. Закрытие ночи (`yarn night:close`)

1. Финальный scoped CI (команда из epic-промпта).
2. Генерация **`docs/archive/night-build/<YYYY-MM-DD>/HANDOFF.md`**:
   - что сделано по NB0…NBn;
   - что не успели;
   - блокеры;
   - рекомендация для `yarn main-day-issue` (продолжить night / merge PR / prod-smoke).
3. Очистка `docs/NIGHT_BUILD_ACTIVE.md` → `status: closed`.
4. **Не** архивировать подзадачи автоматически — только после утреннего LGTM и merge PR (`yarn task:archive <nb-id>`).

### Шаг 6. Утро (Teamlead)

1. Прочитать `HANDOFF.md`.
2. `yarn ritual:day` — standup подмешивает handoff (если скрипт видит свежий архив night-build).
3. Решение: PR `night/*` → `main`, или день 2 night build (`yarn night:open --id … --continue`).

---

## Ветки и PR

| Элемент | Правило |
|---------|---------|
| Ветка | `night/<epic-id>-<YYYY-MM-DD>` |
| Base | `main` |
| PR title | `night(<epic-id>): <краткое>` |
| Merge | Утром после LGTM; CI full `yarn turbo run lint typecheck test build --continue` |
| Prod | Только отдельным дневным PR + smoke из deploy runbook |

---

## Отличия от дневного task workflow

| | День (M/L) | Night Build |
|---|------------|-------------|
| Фокус | `MAIN_DAY_ISSUE` | `NIGHT_BUILD_ACTIVE.md` + epic NB* |
| Prod-smoke | По регламенту фазы | **Запрещён** |
| Scope | Уточняется в чате | **Заморожен** в промпте |
| Архивация | Вечером `task:archive` | Утром после merge |
| Code-review | Вечером генерируется | Утро: handoff + опционально `code-review` |

---

## Definition of Done (Night Build эпик)

- [ ] Все фазы NB0…NBn либо **done** (commit + checkpoint), либо **explicitly deferred** в HANDOFF.
- [ ] Scoped CI green на конец ночи (scope в epic-промпте).
- [ ] `HANDOFF.md` в архиве; `NIGHT_BUILD_ACTIVE` closed.
- [ ] Нет prod-deploy из night branch.
- [ ] Утренний LGTM Vesnin на merge или на вторую ночь.

---

## Команды

| Команда | Действие |
|---------|----------|
| `yarn night:open --id <epic-id>` | Старт sprint, `NIGHT_BUILD_ACTIVE.md` |
| `yarn night:open --id <epic-id> --force` | Перезаписать активный sprint |
| `yarn night:open --id <epic-id> --continue` | Продолжить с HANDOFF (день 2) |
| `yarn night:checkpoint --phase NB<n> --status pass\|fail` | Append в `NIGHT_BUILD_LOG.md` |
| `yarn night:close --id <epic-id>` | Handoff + закрытие active |
| `yarn task:list` | NB* подзадачи в реестре |

---

## Шаблон epic-промпта

См. [`docs/prompts/CABINET_MP4_HARDENING_NIGHT_BUILD_EPIC_PROMPT.md`](./prompts/CABINET_MP4_HARDENING_NIGHT_BUILD_EPIC_PROMPT.md) — эталон первого Night Build эпика.

---

## Версия

- **v1.0** (2026-06-14) — регламент, команды `night:*`, эпик cabinet MP4 hardening.

Изменения — PR с `/architect` и LGTM Vesnin.
