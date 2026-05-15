# Регламент закрытия задачи (task closure)

> **Обязательный чеклист** после выполнения работ по task-промпту (размер **M/L**).
> Дополняет [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) (шаг 7) и
> [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) (§6).
> Координатор закрытия — **Vesnin** (Teamlead); исполнитель готовит артефакты.

---

## Когда задача считается закрытой

Задача закрыта, когда выполнены **все четыре уровня**:

| Уровень | Критерий |
|---------|----------|
| **Продукт** | Definition of Done из task-промпта выполнен; приёмка Teamlead (или явное «LGTM» в Issue/PR). |
| **Код** | Изменения в `main` (merge PR) **или** зафиксированное исключение в `archiveNotes` (см. §4). |
| **GitHub** | В Issue [#N] — формальный отчёт; Issue закрыт (`Closes #N` при merge или вручную после отчёта). |
| **Реестр** | `yarn task:archive <id>`; карточка в `docs/tasks/archive/<id>.md`; промпт **не удаляется**. |

Без архивации в реестре задача остаётся **active** — даже если Issue уже closed.

---

## Двухфазное закрытие (реестр днём → GitHub вечером)

Рекомендуемый ритм:

| Фаза | Когда | Действие |
|------|--------|----------|
| **1. Реестр** | После приёмки / LGTM в течение дня | `yarn task:archive <id> --notes "…"` + раздел **«Отчёт о выполнении»** в `docs/tasks/archive/<id>.md` |
| **2. GitHub** | Конец дня (батч) | `yarn task:close-github` — по очереди из реестра |

В `registry.json` у архивной задачи с Issue:

- `githubIssueClosedAt: null` — Issue **ещё в очереди** на закрытие;
- `githubIssueClosedAt: "YYYY-MM-DD"` — скрипт уже закрыл Issue на GitHub.

Проверка очереди: `yarn task:close-github:dry` или `yarn task:list` (в архиве пометка «Issue открыт»).

**Claude Code:** вечером можно запустить `yarn claude:code` с промптом «выполни `yarn task:close-github:dry`, затем при успехе `yarn task:close-github`» — скрипт детерминированный, LLM не обязателен.

---

## Мнения виртуальной команды

```text
[Teamlead — Vesnin]:
Закрытие — не «забыли в чате», а связка DoD + PR + отчёт + archive. Teamlead не архивирует
без просмотра DoD. Исключение «код готов, PR позже» — только с явной строкой в archiveNotes
и отчёте в Issue, чтобы следующий агент не искал пропавший PR.

[Структурщик]:
В отчёте перечислить затронутые пути (модуль, плагин, регистрация). Teardown плагинов и
отсутствие лишних AudioContext — отметить в чеклисте приёмки. Регресс соседних плагинов на hub —
одной строкой («fft-threshold-test не затронут»).

[Математик — Dynin]:
Если в задаче были формулы/метрики — в отчёте: какие тесты зелёные (`packages/...` или
`apps/client`). Известные расхождения с «сырыми» единицами порогового теста — в «Нюансы».

[Музыкант]:
Для аудио-UI — в отчёте: ручная проверка (микрофон, тишина/речь/сигнал). Headless без устройства
не блокирует закрытие, если CI scope пройден.

[Верстальщик]:
DoD по a11y и теме (DaisyUI) — отметить в отчёте. Настройки в сайдбаре vs панель модуля —
как в промпте. Скриншот в Issue — по желанию, не обязателен.

Итог: единый регламент ниже; артефакт закрытия — комментарий в Issue + archive card.
```

---

## Чеклист закрытия (порядок)

### A. Перед merge (исполнитель)

- [ ] DoD из `docs/prompts/<SLUG>_PROMPT.md` — все пункты выполнены или явно перенесены в Out of scope / follow-up Issue.
- [ ] `yarn workspace @membrana/client typecheck` и `test` (или полный CI из DoD) — зелёный.
- [ ] PR открыт: в описании `Closes #<githubIssue>`, ссылка на task `id` и промпт.
- [ ] Self-review: нет секретов, нет `motion.*` / случайного мусора, scope не раздут.

### B. Merge и CI (исполнитель / ревьюер)

- [ ] PR смержен в `main` (или целевую ветку по `TASKS_MANAGEMENT.md`).
- [ ] CI на merge commit зелёный.

### C. GitHub Issue (сразу или вечерним батчем)

Текст отчёта — в карточке архива (`## Отчёт о выполнении`). На GitHub — вручную, через `gh`, или **`yarn task:close-github`** (см. «Двухфазное закрытие»).

Форма отчёта — [`TASKS_MANAGEMENT.md` §6](../TASKS_MANAGEMENT.md):

```markdown
## Отчёт о выполнении

**Что сделано.** …

**PRs.** …

**Linear ticket.** …

**Связь со стратегией.** …

**Реестр.** `yarn task:archive <id>` — выполнено <дата>.

**Известные нюансы / отложено.** …
```

- [ ] Issue закрыт (авто через `Closes #N`, `yarn task:close-github`, или вручную).
- [ ] В реестре `githubIssueClosedAt` проставлена дата (автоматически после `task:close-github`).
- [ ] При наличии Linear — ticket в **Done**.

### D. Реестр (исполнитель или Teamlead)

```bash
yarn task:archive <id> --notes "PR #…; краткий итог одной строкой"
```

- [ ] `docs/tasks/registry.json` — `status: archived`, `archivedAt`, `archiveNotes`.
- [ ] `docs/tasks/archive/<id>.md` создан.
- [ ] `yarn task:list` — задача только в разделе «Архив».

### E. Промпт (Teamlead)

- [ ] Файл `docs/prompts/<SLUG>_PROMPT.md` **остаётся** (спецификация).
- [ ] В каталоге [`docs/prompts/README.md`](./README.md) убрать пометку «активная задача» (по желанию — ссылка на архив).

---

## Шаблон `archiveNotes`

Кратко, для карточки архива и поиска:

```text
GitHub #41; PR #45 merged 2026-05-15. Плагин fft-indices-viz: live centroid/flux/RMS, sidebar settings.
```

---

## Исключения (без merge в main)

| Ситуация | Действие |
|----------|----------|
| **Приёмка в сессии, PR позже** | В Issue-отчёте и `--notes`: «код в ветке/workspace, PR по запросу»; Teamlead LGTM; затем `task:archive`. После merge — комментарий в Issue с номером PR. |
| **wontfix / duplicate / out-of-scope** | Issue закрыт с причиной; `task:archive <id> --notes "wontfix: …"`. |
| **Разбито на несколько PR** | Архивировать после **последнего** PR, закрывающего DoD; в notes перечислить все PR. |

Архив **без** отчёта в Issue — запрещён (кроме wontfix/duplicate с короткой причиной в комментарии).

---

## Связь документов

| Документ | Роль при закрытии |
|----------|-------------------|
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Жизненный цикл 1–7 |
| **Этот файл** | Детальный чеклист закрытия |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue, PR, формат отчёта |
| [`docs/tasks/README.md`](../tasks/README.md) | Список active/archived |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли при приёмке |

---

## Команды

| Команда | Когда |
|---------|--------|
| `yarn task:list` | Проверить, что id ещё active |
| `yarn task:archive <id> --notes "…"` | Финальное закрытие в реестре (+ очередь GitHub) |
| `yarn task:close-github:dry` | Показать очередь Issues без вызова gh |
| `yarn task:close-github` | Комментарий + close по карточкам архива |
| `gh issue comment <N> --body-file …` | Вручную, если без батча |

---

## Версия

- **v1.0** (2026-05-15) — первый регламент; согласован с TASK_PROMPT_WORKFLOW v1.0.

Изменения — PR с LGTM Vesnin.
