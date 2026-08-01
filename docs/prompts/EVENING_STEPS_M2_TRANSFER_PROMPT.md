# Промпт: Перенос вердикта M2 в evening-ritual-steps.json — единая нумерация и критичность

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **S**.
> Ожидаемый артефакт: **1 PR** — вердикт M2 в исполняемом источнике без коллизии нумераций.
> Реестр: `id` = `evening-steps-m2-transfer` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Заседание `evening-review-predicate`, вердикт M2 (протокол
[`m2-order-of-three`](../seanses/evening-review-predicate-m2-order-of-three-2026-08-01.md))
постановил порядок трёх документов вечера. **В исполняемый источник он не перенесён** и дословно
неисполним: назначенные им позиции 14 и 15 заняты живыми шагами `deps-watch` и `evening-tail`.

Владелец 01.08 отложил перенос **до сборки эпика заседания** — источник правится один раз, когда
собраны все вердикты, иначе цепочка перенумеровывается дважды и рождается третья система
координат. Карточка держит долг и фиксирует условия исполнения.

**Фактическое состояние `docs/tasks/evening-ritual-steps.json` на 2026-08-01** — 16 шагов:

```text
6  team-memory-report   noncritical
10 code-review          critical
11 archive-code-review  critical
12 day-memo             noncritical   ← M2 требует critical
13 audit-evening        noncritical   ← M2 требует critical
14 deps-watch           noncritical   ← M2 назначил сюда code-review
15 evening-tail         critical      ← M2 назначил сюда archive-code-review
16 deliver-to-main      critical
```

**Схема шага, которую оба вердикта вершины (4) нарушили по незнанию** — фиксируется здесь, чтобы
третий раз не повторилось: шаг описывается полем **`script`** (строка вида
`"scripts/bridge.mjs close"`), раннер делает `spawnSync('node', [file, ...args])`
(`scripts/ritual-evening-run.mjs`). Поля `command` схема **не знает**. `validateManifest`
(`scripts/lib/step-status.mjs`) требует **`whyNoncritical` у каждого `noncritical`** — шапка файла
объявляет: по умолчанию `critical`, некритичность объявляется явно и с причиной.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`MEETING_ACTIVE.md`](../meeting/evening-review-predicate/MEETING_ACTIVE.md) | Вердикты заседания и пометки аудита |
| [`AUDIT-M2-M3.md`](../meeting/evening-review-predicate/AUDIT-M2-M3.md) | Разбор вердикта M2 |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |

**GitHub Issue:** — (не заведён)

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. Перенести вердикт M2 в `docs/tasks/evening-ritual-steps.json`: `day-memo` → `audit-evening` →
   `code-review` → `archive-code-review`; `day-memo` и `audit-evening` становятся `critical`.
2. **Разрешить коллизию нумерации явно:** назначенные вердиктом позиции заняты живыми шагами.
   Сдвиг хвоста или иная расстановка — решение принимается и **записывается**, а не подразумевается.
3. Для каждого шага, остающегося `noncritical`, — обязательная причина `whyNoncritical`.
4. Смена критичности меняет поведение вечера: падение `day-memo` или `audit-evening` теперь
   останавливает цепочку. Убедиться, что это **не убивает обязательный `team-evening-feedback`** —
   в нынешней причине некритичности `audit-evening` записано ровно это опасение (ADR-0013).

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| исполняемый источник | `docs/tasks/evening-ritual-steps.json` | единственный источник порядка |
| манифест процедуры | `docs/procedures/ritual-evening/MANIFEST.json` | кадры и держатели; **не вторая редакция порядка** |
| раннер | `scripts/ritual-evening-run.mjs` | `spawnSync('node', [file, ...args])` |
| валидатор | `scripts/lib/step-status.mjs` | `validateManifest`, требование `whyNoncritical` |

**Запрещено:**

- Заводить поле `command` — схема его не знает.
- Объявлять `noncritical` без причины.
- Начинать перенос **до сборки эпика заседания** (условие владельца 01.08).
- Править протокол M2 задним числом: расхождение вердикта и реальности фиксируется пометкой.

---

### Тесты

| Область | Минимум |
|---------|---------|
| валидность манифеста | `validateManifest` зелёный: каждый `noncritical` несёт причину |
| порядок | зуб на последовательность мемо → хроника → ревью → архив ревью |
| хвост | `evening-tail` и `deliver-to-main` не потеряны и не переставлены молча |
| остановка | падение `day-memo` или `audit-evening` даёт `incomplete`, а не тихий зелёный |

---

### Definition of Done

- [ ] Порядок вердикта M2 в исполняемом источнике, коллизия нумерации разрешена явно и записана.
- [ ] `whyNoncritical` у каждого оставшегося `noncritical`.
- [ ] Проверено, что смена критичности не убивает обязательный `team-evening-feedback`.
- [ ] Живой прогон вечера как вещдок (норма [#1565](https://github.com/officefish/Membrana/issues/1565)), а не только зелёные тесты.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный.
- [ ] LGTM Teamlead.

---

### Out of scope

- Предмет вечернего ревью (вердикт M1) и мерка объёма (вердикт M3) — свои карточки.
- Вставка органов архива сессий — комната M4″ и карточка `archivarius-evening-tract`.

---

### Порядок работы ролей

1. **Teamlead** — сверяет перенос с вердиктом построчно.
2. **Структурщик** — разрешение коллизии нумерации, единая система координат.
3. **Математик** — семантика `incomplete` против `success` при остановке.
4. **Музыкант** — что происходит с хвостом вечера при ранней остановке.
5. **Верстальщик** — читаемость отчёта вечера после смены критичности.

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

1. GitHub Issue (`imperfection`) + ссылка на этот файл.
2. Запись в `docs/tasks/registry.json` — уже есть (`status: active`).
3. **Не начинать до сборки эпика заседания** `evening-review-predicate`.
4. После merge: `yarn task:archive evening-steps-m2-transfer --notes "…"`.

### Проверка после PR

```bash
node --test scripts/step-status.test.mjs
yarn ritual:evening --dry-run
```

---

## Связь с дорожной картой

- Долг вердикта M2 заседания `evening-review-predicate`; исполняется после сборки эпика.
- Смежное: `archivarius-evening-tract` — обе карточки правят один файл, порядок исполнения важен.
