# Промпт: Синхронизация main ← techies68 (branch reconciliation sprint)

> **Task-промпт для агента-разработчика** (Claude Code).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — `techies68 → main` с полностью разрешёнными конфликтами.
> Реестр: `id` = `main-sync-sprint-2026-06-29` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Ветки `main` и `techies68` разошлись от общего предка `19168c3`:

- `main` опережает `techies68` на **20 коммитов** (server-first, async-v2 patch, RAG, MCP-tooling, repo-leveling, scripts+CI).
- `techies68` опережает `main` на **22 коммита** (boundary-fix #185, workflow/closure-review, insights, CI JSON reporters, skills, team-evening-feedback).
- Итого diff: **116 файлов**, из них **14 конфликтных** (изменены в обеих ветках).

Консилиум (2026-06-29) принял вердикт: **merge `main` → `techies68`**, разрешить конфликты, затем PR `techies68` → `main`. Rebase — запрещён (ломает `codex/*` ветки). Прямой merge в main — не рекомендован.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы модулей, запрещённые импорты |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Правила PR и CI |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли команды |
| `docs/seanses/issue-185-boundary-decision-2026-06-28.md` | Boundary-fix консилиум — не откатывать |

**GitHub Issue:** создать после завершения спринта (или привязать к существующему).

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Выполняешь branch reconciliation sprint: merge `main` → `techies68`, разрешение конфликтов по регламенту, PR `techies68` → `main`.

---

### Что построить

1. Влить `main` в `techies68`: `git merge main`.
2. Разрешить 14 конфликтных файлов по приоритетным правилам (см. ниже).
3. Зафиксировать merge-коммит: `merge: sync main into techies68 (branch reconciliation 2026-06-29)`.
4. Создать PR `techies68` → `main` через `gh pr create`.

---

### Правила разрешения конфликтов

| Группа | Файлы | Правило |
|--------|-------|---------|
| **docs-generated** | `docs/DAILY_STANDUP.md`, `docs/MAIN_DAY_ISSUE.md`, `docs/STRATEGIC_PLAN_DAY.md` | Берём `techies68` (свежее, сгенерировано сегодня) |
| **registries union** | `docs/insights/registry.json`, `docs/tasks/registry.json`, `docs/tasks/README.md`, `.cursor/skills/README.md` | Union-merge: все записи из обеих веток входят; при дублях — берём более свежую версию |
| **package.json** | `package.json` | Union-merge скриптов: добавляем команды из обеих веток; при дублях — techies68-версия |
| **CI** | `.github/workflows/ci.yml`, `.github/workflows/unit-tests.yml` | Union-merge шагов: все job'ы из обеих веток; при конфликте шага — techies68-версия |
| **core code** | `packages/core/src/contracts/device-board/index.ts` | **БЕРЁМ techies68** — здесь зафиксирован boundary-fix #185; откат запрещён |
| **vitest config** | `packages/background-office/vitest.config.ts` | Берём techies68 (coverage config добавлена там) |
| **test** | `packages/services/usercase-catalog/src/service.test.ts` | Union-merge тест-кейсов; при конфликте — techies68 |
| **yarn.lock** | `yarn.lock` | После merge: `yarn install --frozen-lockfile`; если падает — `yarn install` и коммитим результат |
| **docs/INSIGHTS.md** | `docs/INSIGHTS.md` | Union-merge записей инсайтов из обеих веток |

**Запрещено:**
- Откатывать `packages/core/src/contracts/device-board/index.ts` к main-версии (нарушение boundary-fix #185).
- Использовать `git checkout --theirs` для `registry.json` — только ручной union.
- Делать rebase или force-push `techies68`.

---

### Definition of Done

- [ ] `git merge main` выполнен без конфликтов (все разрешены).
- [ ] `packages/core/src/contracts/device-board/index.ts` содержит boundary-fix (нет импортов из device-board в usercase-catalog).
- [ ] `docs/insights/registry.json` содержит инсайты из обеих веток (searxng, hindsight от main; sessions-archive, task-archive-storage, ghost-closure от techies68).
- [ ] `docs/tasks/registry.json` содержит записи из обеих веток без дублей.
- [ ] `package.json` содержит скрипты из обеих веток.
- [ ] `yarn install` завершается без ошибок.
- [ ] PR `techies68` → `main` создан через `gh pr create`.
- [ ] merge-коммит зафиксирован в `techies68`.

---

### Out of scope

- Не трогать фичи (не добавлять код, не рефакторить).
- Не закрывать существующие GitHub Issues этим PR (только инфра-синхронизация).
- Не мержить другие ветки кроме `main` → `techies68`.

---

### Порядок ролей

1. **Teamlead (Vesnin):** решения при спорных конфликтах, LGTM на итог.
2. **Структурщик (Ozhegov):** контроль boundary-fix в core/contracts.
3. **Остальные роли:** наблюдают, не блокируют.

---

## Заметки для постановщика

- После PR: создать GitHub Issue «Branch sync: main ← techies68» и привязать PR.
- После merge в main: запустить `yarn turbo run lint typecheck test --no-cache` для smoke-проверки.
- Обновить `registry.json` статус задачи → `archived` командой `yarn task:archive main-sync-sprint-2026-06-29`.
