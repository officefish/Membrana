# Промпт: docs/tasks/README.md — собственный Template в движке стратегических документов; снять карантин sync

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — README задач генерируется через движок strategic-docs, карантин sync снят.
> Реестр: `id` = `readme-managed-template` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

`docs/tasks/README.md` — зеркало active/archive-набора `docs/tasks/registry.json`.
Ad-hoc-синкер (`yarn task:sync-readme` → `syncTasksReadme`) **намеренно в карантине**
(`TASKS_README_SYNC_FORCE=1`, причина `README_SYNC_QUARANTINE_REASON`): генератор
заморожен. pre-commit хук `[tasks-readme]` (`task:sync-readme --check`) — жёсткий гейт:
любой коммит, меняющий active-набор реестра, падает при дрейфе README↔registry, автофикса нет.

**Принцип (владелец):** документы этого класса пойдут под особой лицензией —
редактировать их **руками запрещено**. Единственная легитимная форма производства —
сборка из **валидного шаблона** через движок. Карантин синка стоит не из-за
atlas-транзиента, а потому что законного генератора (шаблона) ещё нет. Значит эта
задача — не «снизить трение», а построить **единственный законный путь производства**
README задач.

Теперь в main есть **движок стратегических документов** (PR #1141, контейнер
`strategic-docs`): `template + granuleIndex → generate() → Release` — детерминированная
сборка документа из шаблона со слотами-гранулами, валидация через office → маршрут
`releases/`|`experiments/`, рендер поверхности через engine-renderer. Задача — перевести
генерацию README задач на этот движок и снять карантин.

**Что НЕ трогаем:** формат atlas; контракт валидатора `active|archived`/`S|M|L`;
политику merge-драйвера реестра.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`containers/strategic-docs/SURFACE.md`](../containers/strategic-docs/SURFACE.md) | Поверхность движка |
| `cowork-sprint/cowork-strategic-docs-container/**` | Устройство generate/render/validate |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |

**GitHub Issue:** [#1201](https://github.com/officefish/Membrana/issues/1201)

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. **Template README задач** в модели strategic-docs: шаблон со слотами (шапка →
   таблица «Активные» → таблица «Архив» → служебные секции), где слоты заполняются
   гранулами, извлекающими набор из `registry.json`.
2. **Гранулы-извлекатели** (чистые функции): active-таблица, archive-таблица — из
   реестра, детерминированно, формат строк = текущий формат README (id, title, size/дата,
   prompt-ссылка, linked).
3. **Путь генерации** README задач через `generate()` (edge-CLI или делегирование из
   `syncTasksReadme`), результат идентичен ожидаемому `computeReadmeMatchesRegistry`.
4. **Снятие карантина**: `TASKS_README_SYNC_FORCE` убран или `syncTasksReadme`
   делегирует в движок; ручной FORCE больше не нужен, atlas-формат сохранён.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Модель шаблона | `scripts/lib/strategic-docs-model.mjs` | Template `tasks-readme` со слотами |
| Гранулы | `scripts/lib/` (новые pure-модули) | active/archive из `registry.json` → markdown-части |
| Сборка | `scripts/lib/strategic-docs-generate.mjs` | `generate(template, granuleIndex)` |
| Edge / синк | `scripts/lib/task-registry.mjs` (`syncTasksReadme`) | делегирование в `generate()` вместо ad-hoc |
| Гейт | pre-commit `[tasks-readme]` / `computeReadmeMatchesRegistry` | должен проходить после генерации |

**Запрещено:**

- Ручная правка README этого класса — под особой лицензией запрещена; единственная
  легитимная форма — сборка из валидного шаблона (не hand-edit, не FORCE-синк).
- Откатывать формат atlas.
- Хардкодить README в обход `registry.json` (git — SoT набора).
- Менять контракт `active|archived` / `S|M|L`.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Гранулы active/archive | pure, детерминированны: тот же реестр → те же строки; порядок стабилен |
| generate(tasks-readme) | собранный README проходит `computeReadmeMatchesRegistry` === true |
| Снятие карантина | после генерации `task:sync-readme --check` (или преемник) — exit 0 без FORCE |
| Регресс формата | сгенерированный README == текущий по набору id (diff только по управляемым строкам) |

---

### Definition of Done

- [ ] Template `tasks-readme` описан в `strategic-docs-model.mjs` (слоты → гранулы).
- [ ] Гранулы извлекают active/archive из `registry.json` детерминированно, формат atlas сохранён.
- [ ] `generate()` порождает README; `computeReadmeMatchesRegistry` → `true` воспроизводимо.
- [ ] Карантин `TASKS_README_SYNC_FORCE` снят либо `syncTasksReadme` делегирует в движок.
- [ ] pre-commit `[tasks-readme]` проходит без ручной правки README.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (scope: scripts/).
- [ ] LGTM Teamlead.

---

### Out of scope

- Реальные API Affine/Notion/Coda (рендер поверхности) — движок и так на стабах.
- Перевод ДРУГИХ документов на движок (только tasks-README).
- Миграция формата хранения реестра.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — план, границы, LGTM.
2. **Структурщик (Ozhegov)** — контракт Template/гранул, границы модулей.
3. **Математик (Dynin)** — детерминизм гранул, идемпотентность генерации.
4. **Музыкант (Kuryokhin)** — не задействован (нет аудио/UI).
5. **Верстальщик (Rodchenko)** — формат README, регресс-diff.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Верстальщик]: …

Итоговый артефакт: 1 PR — README задач через strategic-docs generate(), карантин снят.
Definition of Done: см. чеклист.
```

---

## Заметки для человека-постановщика

1. GitHub Issue #1201 (`wish`) + ссылка на этот файл.
2. Запись в `docs/tasks/registry.json` (`status: active`) — есть (`readme-managed-template`).
3. После merge: отчёт в Issue → `yarn task:archive readme-managed-template --notes "…"`.

### Проверка после PR

```bash
yarn task:validate | tail -1          # readmeMatches=true, без ручной правки
git commit ...                        # pre-commit [tasks-readme] проходит без FORCE
```

---

## Связь с дорожной картой

- Снимает системное трение гигиены реестра.
- Первый «клиент» движка стратегических документов вне стратегических релизов — проба
  Template/гранул на служебном документе.
