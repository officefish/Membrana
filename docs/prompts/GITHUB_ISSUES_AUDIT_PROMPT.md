# GitHub Issues Audit — системный промпт процесса

> **Роль координатора:** Teamlead (**Vesnin**).  
> **Скрипт:** `yarn issues:audit` · `yarn issues:audit:apply`  
> **Промпт для агента:** этот файл + manifest JSON + `docs/VIRTUAL_TEAM_PROMPT.md`.

---

## Зачем

Периодически (после крупного эпика, перед планированием спринта, раз в 2–4 недели) команда **критически пересматривает** все GitHub Issues:

1. Закрывает **выполненные** и **неактуальные** — с комментарием ответственной роли.
2. **Ранжирует** открытые issues по приоритету для backlog.
3. Фиксирует результат в **сводном markdown** (`docs/archive/github-issues-audit-YYYY-MM-DD.md`).

Issue ≠ task registry: закрытие Issue не заменяет `yarn task:archive`, но должно быть согласовано (см. §Согласование с реестром).

---

## Участники и зоны ответственности

| Роль | Персонаж | В аудите |
|------|----------|----------|
| Teamlead | **Vesnin** | triage, LGTM на закрытие, рейтинг эпиков, согласование с `MAIN_DAY_ISSUE` |
| Структурщик | **Ozhegov** | границы пакетов, architecture decisions, CI/infra issues |
| Математик | **Dynin** | fft/core/tests, чистота `math/`, coverage gaps |
| Верстальщик | **Rodchenko** | a11y, DESIGN.md, UI backlog |
| Музыкант | — | mic/audio UX (#49 и родственные) |

Формат комментария при закрытии:

```markdown
## Триаж YYYY-MM-DD

**[Persona / Role]:** …

**[Vesnin]:** LGTM — …
```

---

## Шкала приоритетов (открытые issues)

| Код manifest | Метка в отчёте | Когда ставить |
|--------------|----------------|---------------|
| `important` | 🔴 **Важно** | Блокирует prod, архитектурный эпик на критическом пути, LGTM Vesnin |
| `recommended` | 🟡 **Рекомендовано** | Следующий разумный PR; ROI высокий; частично сделано |
| `not-urgent` | 🟢 **Не срочно** | Backlog после текущего эпика; зависимости не готовы |
| `optional` | ⚪ **Не обязательно** | NICE TO HAVE, docs-only, дублирует другой тикет |

---

## Жизненный цикл аудита (6 шагов)

### 1. Подготовка

```bash
git fetch origin
yarn turbo run lint typecheck test build --continue   # baseline green
gh issue list --state open --limit 100
```

Прочитать: `docs/tasks/README.md` (active vs archived), `docs/DAILY_CODE_REVIEW.md`, недавние PR.

### 2. Evidence по каждому issue

Для **кандидата на закрытие** агент обязан указать **факт**, не мнение:

- merge PR / commit SHA;
- `yarn workspace … test` / grep / `yarn check:boundaries`;
- запись в `docs/tasks/registry.json` (`status: archived`);
- явное «won't fix» / superseded с ссылкой на новый issue.

**Запрещено** закрывать без комментария persona + без строки в manifest.

### 3. Manifest JSON

Создать файл:

`docs/issues/manifests/github-issues-audit-YYYY-MM-DD.json`

Схема — `docs/issues/github-issues-audit-manifest.schema.json`.

Минимум:

- `closed[]` — number, reason (`completed` | `not planned`), persona, summary (1 строка для отчёта), comment (полный текст для GitHub);
- `open[]` — number, priority, persona, summary, опционально `registryId`.

### 4. Dry-run

```bash
yarn issues:audit --manifest docs/issues/manifests/github-issues-audit-YYYY-MM-DD.json --dry-run
yarn issues:audit:apply --manifest … --dry-run
```

Проверить: все открытые issues на GitHub либо в `open[]`, либо в `closed[]`; нет «потерянных».

### 5. Apply + отчёт

```bash
yarn issues:audit:apply --manifest docs/issues/manifests/github-issues-audit-YYYY-MM-DD.json
```

Скрипт:

1. Комментирует и закрывает issues из `closed[]` (если ещё open).
2. Генерирует `docs/archive/github-issues-audit-YYYY-MM-DD.md`.

### 6. Follow-up

- `yarn task:archive <id>` для эпиков, чьи Issues закрыты, но registry ещё active.
- `yarn task:close-github` — **не дублировать**, если audit уже закрыл Issue.
- Упоминание в `DAILY_STANDUP` / вечернем code-review.

---

## Согласование с реестром

| Ситуация | Действие |
|----------|----------|
| Issue закрыт, task `active` в registry | Follow-up: `yarn task:archive <id>` |
| Task `archived`, Issue open | Audit или `yarn task:close-github` |
| Issue без registry | OK для imperfection/wish; указать в manifest `registryId: null` |

---

## Критерии закрытия (чеклист Vesnin)

- [ ] Acceptance criteria issue выполнены **или** явный won't fix / superseded.
- [ ] Комментарий с persona опубликован (или будет через `--apply`).
- [ ] Manifest summary ≤ 120 символов на issue.
- [ ] Turbo baseline зелёный (или расхождение задокументировано).
- [ ] Открытые issues имеют priority в manifest.

---

## Команды

| Команда | Назначение |
|---------|------------|
| `yarn issues:audit --manifest <path>` | Только сводный markdown |
| `yarn issues:audit:apply --manifest <path>` | Comment + close + markdown |
| `… --dry-run` | Превью без записи и без gh close |
| `… --branch <name> --head <sha>` | Метаданные в шапке отчёта |

---

## Definition of Done аудита

1. `docs/issues/manifests/github-issues-audit-YYYY-MM-DD.json` в репозитории.
2. `docs/archive/github-issues-audit-YYYY-MM-DD.md` сгенерирован.
3. Закрытые issues прокомментированы на GitHub.
4. Все текущие open issues имеют priority в отчёте.
5. Follow-up tasks для registry — в `DAILY_STANDUP` или отдельном комментарии.

---

## Связанные документы

- [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md)
- [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
- [`DEVELOPER_RHYTHM.md`](../DEVELOPER_RHYTHM.md)
- [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md)
