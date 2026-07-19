# Промпт: Evidence-gated архивирование реализованных инсайтов

> **Task-промпт для агента-разработчика**. Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **M**. Ожидаемый артефакт: **1 PR** — lifecycle, команда, аудит и skills.
> Реестр: `insight-archive-lifecycle` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Текущий insight lifecycle заканчивается на `adopted | deferred | rejected`. `adopted`
означает принятую идею, а не завершённую реализацию. Завершённые пилоты остаются в
активном реестре и ошибочно попадают в обзор как кандидаты на новый спринт.

Нужно добавить доказуемый архивный переход, сохранив историю и запретив архив по одному
`sprintPhase`, названию ветки или субъективному впечатлению агента.

**Связанные документы:**

| Документ | Зачем |
|----------|-------|
| [`INSIGHT_REGULATION.md`](./INSIGHT_REGULATION.md) | Канон lifecycle |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | Evidence-модель закрытия задач |
| [`INSIGHTS.md`](../INSIGHTS.md) | Навигатор инсайтов |
| [`membrana-insight`](../../.cursor/skills/membrana-insight/SKILL.md) | Агентский workflow |
| [`membrana-insight-overview`](../../.cursor/skills/membrana-insight-overview/SKILL.md) | Read-only обзор |

**GitHub Issue:** #609.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела «Заметки для человека-постановщика» — текст задания агенту.

### Кто ты

Ты — координатор виртуальной команды Membrana под руководством Vesnin. Соблюдай
`TASK_PROMPT_WORKFLOW.md`, `TASK_CLOSURE_REGULATION.md` и `INSIGHT_REGULATION.md`.

### Что построить

1. Добавить терминальный статус `archived` для реализованного или окончательно закрытого
   инсайта, не смешивая его с `adopted`, `deferred` и `rejected`.
2. Добавить `yarn insight archive <id>` с dry-run по умолчанию и явным `--execute`.
3. Архивировать только при доказанном evidence: связанная задача/фаза архивирована,
   отсутствуют active-задачи и активные PR/worktree, указан результат реализации.
4. Синхронно обновлять `registry.json` и `meta.json`, сохраняя `archivedAt`, причину,
   evidence и прежний статус. Артефакты INSIGHT/RESEARCH/REVIEW не удалять.
5. Научить Cursor, Claude и Codex одинаковому workflow и применить его только к
   подтверждённым завершённым инсайтам.

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| CLI | `scripts/insight.mjs` | `archive`, args, dry-run/execute |
| Pure logic | `scripts/lib/insight*.mjs` | evidence-gate и синхронная мутация |
| Data | `docs/insights/registry.json`, `meta.json` | терминальный статус и provenance |
| Policy | `docs/prompts/INSIGHT_REGULATION.md` | критерии и запреты |
| Agents | `.cursor/.claude/.agents skills` | одинаковый playbook |
| Tests | `scripts/insight-ritual.test.mjs` или отдельный test | happy path и отказы |

**Минимальный evidence-контракт:**

- `implementationTaskIds`: непустой список task id;
- каждая указанная задача существует и `status === archived`;
- ни одна задача с этим `insightId` не имеет `status === active`;
- `result`: непустое краткое описание;
- `archivedAt`, `archiveReason`, `previousStatus` записываются детерминированно;
- live PR/worktree остаются обязательной человеческой cross-check перед `--execute`.

**Запрещено:**

- считать любой `adopted` завершённым;
- архивировать только по `sprintPhase` или совпадению текста;
- удалять папку инсайта или REVIEW/RESEARCH;
- автоматически закрывать спорные/частично реализованные записи;
- менять веса исторических инсайтов при архиве.

### Тесты

| Область | Минимум |
|---------|---------|
| Evidence | отказ без task ids, с неизвестной/active task, с пустым result |
| Mutation | registry/meta получают одинаковый `archived` и provenance |
| Safety | dry-run не пишет; повторный archive идемпотентен или ясно отказывает |
| Regression | существующие create/research/review/close проходят |

### Definition of Done

- [ ] Канон различает adopted и archived.
- [ ] CLI archive безопасен и покрыт тестами.
- [ ] Cursor/Claude/Codex используют один evidence-gated workflow.
- [ ] Список доказанно завершённых инсайтов подтверждён задачами и отсутствием live work.
- [ ] Только подтверждённые записи переведены в archived.
- [ ] `node --test scripts/insight-ritual.test.mjs` и релевантные script tests зелёные.
- [ ] `git diff --check` зелёный.
- [ ] LGTM Teamlead.

### Out of scope

- Переписывание хранилища инсайтов в БД.
- Автоматическое закрытие GitHub Issues реализационных задач.
- Архивирование DADS, truth-tokens, live-neural и других активных/не начатых идей.
- Старт новых insight-спринтов.

### Порядок работы ролей

1. **Teamlead** — утверждает evidence-gate и финальный список.
2. **Структурщик** — отделяет pure gate от CLI и формата хранения.
3. **Математик** — проверяет полноту инвариантов и негативные тесты.
4. **Музыкант** — подтверждает, что аудио-инсайты не архивируются по косвенным признакам.
5. **Верстальщик** — обеспечивает читаемый dry-run и итоговый тезисный отчёт.

---

## Заметки для человека-постановщика

1. Issue #609 создан.
2. После PR: формальный отчёт в Issue и `yarn task:archive insight-archive-lifecycle`.
3. Спорные записи оставить в отчёте как кандидаты на backfill, не архивировать.

### Проверка после PR

```bash
node --test scripts/insight-ritual.test.mjs
node scripts/insight.mjs archive <id>
git diff --check
```

## Связь с дорожной картой

- Устраняет ложные кандидаты в недельной стратегии и замыкает insight lifecycle.
