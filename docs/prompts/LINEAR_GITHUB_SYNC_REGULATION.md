# Linear ↔ GitHub: синхронизация задач (неблокирующие этапы)

> Дополняет [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md), [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md),
> [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md).
> **Linear не дублирует** GitHub Issue — при наличии Issue в реестре ticket в Linear **привязывается** к нему.
> Этапы Linear **рекомендуются**, но **не блокируют** merge, деплой и `yarn task:archive`.

---

## Роли систем

| Система | Канон для чего |
|---------|----------------|
| **GitHub Issue** | Triage, `Closes #N`, формальный отчёт, история для агентов без доступа в Linear |
| **Реестр** `docs/tasks/registry.json` | `id`, `githubIssue`, `linearId`, active/archived |
| **Task-промпт** | DoD, архитектура, scope |
| **Linear** | Статусы, декомпозиция, исполнитель, комментарии «внутренней кухни» |

**Правило:** одна **рабочая единица** = один `id` в реестре + один GitHub Issue (если есть) + **не более одного** Linear ticket на этот Issue. Подзадачи эпика — отдельные `id` в реестре; в Linear — sub-issue или sibling с той же ссылкой на GitHub.

---

## Неблокирующие этапы

| Этап | Обязателен? | Блокирует работу? |
|------|-------------|-------------------|
| GitHub Issue + реестр `active` | **Да** (M/L) | Да |
| Task-промпт | **Да** (M/L) | Да |
| **Регистрация в Linear** | Нет | **Нет** |
| Реализация / деплой / smoke | По DoD промпта | — |
| `yarn task:archive` | **Да** (закрытие в реестре) | **Нет** (Linear может быть пустым) |
| **Linear → Done** | Нет | **Нет** |
| `yarn task:close-github` | Рекомендуется (вечер) | **Нет** |

Отсутствие Linear ticket **не** отменяет приёмку и архивацию. Поле `linearId: null` в `registry.json` допустимо.

---

## Этап R1. Регистрация в Linear (после Issue + реестр)

**Когда:** после шага 2 [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) или в triage Teamlead — **когда удобно**, до или после первого коммита.

### Если в реестре уже есть `githubIssue`

Linear **не создаёт вторую задачу с тем же смыслом**. Действия:

1. **Предпочтительно:** GitHub Issue → `…` → **Create Linear issue** (интеграция Linear ↔ GitHub).
2. **Или вручную:** Linear → New issue → в описании первая строка:
   ```text
   GitHub: https://github.com/officefish/Membrana/issues/<N>
   Registry id: `<task-id>`
   ```
3. В Linear **не копировать** длинный DoD — ссылка на промпт `docs/prompts/<SLUG>_PROMPT.md` и на GitHub Issue.
4. Записать в `docs/tasks/registry.json`: `"linearId": "MEM-42"` (или UUID, как принято в команде).
5. Комментарий в GitHub Issue:
   ```markdown
   Linear: MEM-42 — https://linear.app/.../issue/MEM-42
   ```
6. По желанию: снять `status:triage`, поставить `status:linear`.

### Если `githubIssue` нет (редко для M/L)

Допускается Linear-only для внутреннего трекинга; перед архивацией желательно завести Issue для отчёта.

### Эпик + подзадачи (пример `background-office-v1`)

| Registry `id` | GitHub | Linear (рекомендация) |
|---------------|--------|------------------------|
| `background-office-v1` | #60 | Parent / project в Linear |
| `background-office-o1-docker` | #60 | Sub-issue → ссылка на #60 |
| `background-office-o3-tls-deploy` | #61 | Отдельный ticket → ссылка на #61 |

Все sub-issue **ссылаются** на один GitHub Issue эпика, а не дублируют его текст.

---

## Этап R2. Работа и PR

- Ветка / PR: `MEM-42` или `cursor/MEM-42-…` в названии — auto-link (см. [`TASKS_MANAGEMENT.md` §5](../TASKS_MANAGEMENT.md)).
- PR: `Closes #N` обязателен при наличии GitHub Issue.
- Linear-ID в описании PR — рекомендуется.
- Обсуждение реализации — в Linear; **не** дублировать длинными тредами в GitHub.

---

## Этап R3. Закрытие в Linear (после приёмки, неблокирующий)

**Когда:** после LGTM / smoke / `yarn task:archive` — **в тот же день или позже**.

Чеклист (все пункты опциональны для архивации реестра):

- [ ] Linear ticket → **Done** (вручную или auto-close on merge, если включено в интеграции).
- [ ] Для эпика: parent → Done, когда все дочерние `id` в реестре `archived`.
- [ ] В Linear комментарий: ссылка на карточку архива `docs/tasks/archive/<id>.md` или PR.

**Не ждать** R3 перед `yarn task:archive`.

---

## Связь с `background-office` и webhook

Прод: `https://office.membrana.space/webhooks/linear` принимает события **от Linear** (HMAC). Это **не** заменяет этапы R1–R3: webhook — транспорт событий; регистрация и Done по-прежнему в UI Linear + синхронизация с GitHub по правилам выше.

Секреты: `LINEAR_WEBHOOK_SECRET` в корневом `.env` → `node scripts/_sync-office-env-from-root.mjs --restart`.

---

## Команды

| Действие | Команда / место |
|----------|-----------------|
| Синхронизировать ключи office | `node scripts/_sync-office-env-from-root.mjs --restart` |
| Smoke prod office | `node scripts/_ssh-office-smoke.mjs` |
| Архив в реестре | `yarn task:archive <id> --notes "…"` |
| Закрытие GitHub (вечер) | `yarn task:close-github` |
| Обновить `linearId` | правка `docs/tasks/registry.json` + `yarn task:sync-readme` |

---

## Приложение A. Шаблоны (копировать в Linear / GitHub)

Подставьте `MEM-XX` и URL Linear после создания ticket через **Create Linear issue** на GitHub.

### A1. Описание нового ticket (эпик #60)

```markdown
GitHub: https://github.com/officefish/Membrana/issues/60
Registry id: `background-office-v1`

Эпик O1–O4: продовый деплой `background-office` на `https://office.membrana.space`.
DoD: `docs/prompts/BACKGROUND_OFFICE_V1_EPIC_PROMPT.md`
Архив: `docs/tasks/archive/background-office-v1.md`

Подзадачи в реестре (все → #60): `background-office-o1-docker`, `background-office-o2-prod-compose`.
```

### A2. Описание нового ticket (O3–O4, #61)

```markdown
GitHub: https://github.com/officefish/Membrana/issues/61
Registry id: `background-office-o3-tls-deploy` (+ `background-office-o4-webhook-acceptance`)

TLS `office.membrana.space` + Linear webhook `POST /webhooks/linear`.
DoD: `docs/prompts/BACKGROUND_OFFICE_O3_TLS_DEPLOY_PROMPT.md`, `BACKGROUND_OFFICE_O4_WEBHOOK_ACCEPTANCE_PROMPT.md`
Архив: `docs/tasks/archive/background-office-o4-webhook-acceptance.md`
```

### A3. Комментарий в GitHub Issue (после R1)

```markdown
Linear: MEM-XX — https://linear.app/<team>/issue/MEM-XX

Синхронизация по [`LINEAR_GITHUB_SYNC_REGULATION.md`](docs/prompts/LINEAR_GITHUB_SYNC_REGULATION.md) — ticket привязан к Issue, не дублирует.
```

### A4. Комментарий в Linear при закрытии (R3 → Done)

```markdown
Приёмка завершена. GitHub #60 закрыт 2026-06-13.

Prod: https://office.membrana.space/health
Smoke: `node scripts/_ssh-office-smoke.mjs --external` — 5 OK
Архив: docs/tasks/archive/background-office-v1.md
PR: <ссылка на PR>
```

Для #61 замените `#60` → `#61`, архив → `background-office-o4-webhook-acceptance.md`, добавьте webhook URL.

### A5. После R1 — правка `registry.json`

```json
"linearId": "MEM-XX"
```

в записи `background-office-v1` (эпик) и/или `background-office-o3-tls-deploy` / `background-office-o4-webhook-acceptance`.

---

## Версия

- **v1.1** (2026-06-13) — приложение A: шаблоны для #60/#61.
- **v1.0** (2026-06-12) — неблокирующие R1/R3; sync с GitHub Issue без дублирования; LGTM Vesnin при правках.
