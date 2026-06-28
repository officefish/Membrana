# Промпт (day sprint · active): OpenCode operator workflows & commands

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Реестр:** day-sprint **`opencode-operator-workflows-2026-06-26`** (phases `oc-b0` … `oc-b4`)
> **Статус:** **active**
> **Пакет:** `.opencode/` (skills, command, config), `opencode.json`, `AGENTS.md`, `docs/` — **без** runtime TypeScript
> **GitHub Issue:** [#183](https://github.com/officefish/Membrana/issues/183)

---

## Контекст

OpenCode уже сконфигурирован для Membrana (`opencode.json` → `instructions: AGENTS.md`, `skills.paths: .opencode/skills`, агенты в `.opencode/agents`, prompts в `.opencode/prompts`). Накоплены 20+ skills, но **нет директории команд** (`.opencode/command/`) и не хватает четырёх operator-skills под повседневные guardrails: проверка границ клиентских модулей, полный CI-прогон, triage GitHub-issues и self-maintenance самого OpenCode-слоя.

Цель спринта — поднять эргономику оператора: добавить **4 skills** и **6 команд**, которые обёртывают уже существующие, проверенные `yarn`-скрипты (никакой новой бизнес-логики), и закрепить их авто-дискаверинг в конфиге.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Постановка задач |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | Закрытие |
| [`DEVELOPER_RHYTHM.md`](../DEVELOPER_RHYTHM.md) | Утро/вечер ритуалы |
| [`GITHUB_ISSUES_AUDIT_PROMPT.md`](./GITHUB_ISSUES_AUDIT_PROMPT.md) | Triage issues |
| `.opencode/skills/membrana-task-lifecycle/SKILL.md` | Эталон skill-формата |

---

## Product decisions

| ID | Решение |
|----|---------|
| **D-OC-1** | Команды — **тонкие обёртки** над `package.json` скриптами. Никакой дублирующей логики; одна команда = один документированный workflow. |
| **D-OC-2** | Команды живут в `.opencode/command/<name>.md` (frontmatter `description` + body-промпт). Авто-дискаверинг OpenCode — без хардкода путей. |
| **D-OC-3** | Skills следуют канону: frontmatter `name`+`description` (триггеры + «Do NOT use»), тело с «When to use / When NOT / Commands / workflow». |
| **D-OC-4** | `opencode.json` — добавить ссылку на `.opencode/command` в `references` (документирует расположение, не ломает schema). `instructions` и `skills.paths` уже корректны. |
| **D-OC-5** | Никаких новых `yarn`-скриптов: обёртываем `standup`, `main-day-issue`, `ritual:evening`, turbo CI, `issues:audit`, `task:archive`+`task:close-github`, `check:boundaries`. |
| **D-OC-6** | Self-maintenance skill — как чинить/расширять сам OpenCode-слой (skills/commands/agents/config), чтобы будущие правки шли по регламенту. |

---

## Целевая структура

```text
.opencode/
  command/                       # НОВОЕ — авто-дискаверинг команд
    standup.md
    main-day.md
    ritual-evening.md
    full-ci.md
    triage-issues.md
    close-task.md
  skills/
    membrana-client-module-guard/SKILL.md     # НОВОЕ
    membrana-full-ci-operator/SKILL.md         # НОВОЕ
    membrana-issue-triage/SKILL.md             # НОВОЕ
    membrana-opencode-self-maintenance/SKILL.md# НОВОЕ
opencode.json                    # references += .opencode/command
AGENTS.md                        # § OpenCode operator commands
docs/day-sprint/opencode-operator-workflows-2026-06-26/OPEN.md
```

---

## Матрица: команда → скрипт → skill

| Команда (`.opencode/command/`) | Обёртывает | Связанный skill |
|--------------------------------|------------|-----------------|
| `standup.md` | `yarn standup` | membrana-developer-rhythm |
| `main-day.md` | `yarn main-day-issue` | membrana-developer-rhythm |
| `ritual-evening.md` | `yarn ritual:evening` | membrana-developer-rhythm, membrana-code-review |
| `full-ci.md` | `yarn turbo run lint typecheck test build --continue` | **membrana-full-ci-operator** |
| `triage-issues.md` | `yarn issues:audit` | **membrana-issue-triage** |
| `close-task.md` | `yarn task:archive <id>` + `yarn task:close-github` | membrana-task-lifecycle |

| Новый skill | Канон-скрипт | Назначение |
|-------------|--------------|------------|
| `membrana-client-module-guard` | `yarn check:boundaries` (`scripts/check-package-boundaries.mjs`) | Границы пакетов/клиентских модулей, запрещённые импорты |
| `membrana-full-ci-operator` | `yarn turbo run lint typecheck test build` | Полный CI-прогон, разбор фейлов, `--filter` стратегия |
| `membrana-issue-triage` | `yarn issues:audit` | Аудит/triage GitHub issues по манифесту |
| `membrana-opencode-self-maintenance` | — (meta) | Как чинить/расширять `.opencode/` слой |

---

## Phases

| Phase | Registry id | Size | DoD summary |
|-------|-------------|------|-------------|
| **B0** | `oc-b0-register` | S | Этот промпт; registry parent+phases; OPEN tracker; `yarn task:sync-readme` |
| **B1** | `oc-b1-skills` | M | 4 SKILL.md по канону (frontmatter + body), описания с триггерами и «Do NOT use» |
| **B2** | `oc-b2-commands` | M | 6 `.opencode/command/*.md` (frontmatter `description` + body), обёртки скриптов |
| **B3** | `oc-b3-config` | S | `opencode.json` references += command; `AGENTS.md` § operator commands |
| **B4** | `oc-b4-closure` | S | Verify (JSON parse, skill/command lint); archive phases; Issue отчёт |

**Порядок:** B0 → B1 → B2 → B3 → B4.

---

## Тесты и верификация

| Область | Команда / критерий |
|---------|-------------------|
| Config valid | `node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8'))"` — OK |
| Skills frontmatter | каждый новый SKILL.md имеет `name` + `description`; `name` == имя директории |
| Commands frontmatter | каждый `.opencode/command/*.md` имеет `description` |
| Wrapped scripts exist | `standup`, `main-day-issue`, `ritual:evening`, `issues:audit`, `task:archive`, `task:close-github`, `check:boundaries` присутствуют в `package.json` |
| Registry | `node scripts/task-list.mjs` без ошибок; phases `oc-b0..b4` под `parentEpic` |

---

## Definition of Done

- [ ] B0–B4 в реестре (`parentEpic: opencode-operator-workflows-2026-06-26`)
- [ ] 4 новых skills под `.opencode/skills/` (канон-формат)
- [ ] 6 команд под `.opencode/command/` (frontmatter + body)
- [ ] `opencode.json` references на `.opencode/command`; валидный JSON
- [ ] `AGENTS.md` § OpenCode operator commands (таблица команд)
- [ ] Все обёрнутые `yarn`-скрипты существуют (no dangling)
- [ ] GitHub Issue: отчёт + `Closes #183`
- [ ] LGTM Teamlead

---

## Out of scope

- Новые `yarn`-скрипты или runtime/TS изменения
- Изменение существующих 20+ skills (кроме ссылок при необходимости)
- CI workflow (`.github/workflows/`) правки
- Замена OpenCode plugin/auth (`opencode-openai-codex-auth`)
- Mirror команд в `.cursor`/`.claude` (follow-up при необходимости)

---

## Промпт целиком (для вставки агенту)

Ты — координатор Membrana (Vesnin). Следуй [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) и этому промпту.

**Задача:** поднять OpenCode operator-эргономику — добавить 4 skills и 6 команд (тонкие обёртки над существующими `yarn`-скриптами), закрепить авто-дискаверинг команд в `opencode.json`, задокументировать в `AGENTS.md`.

**Порядок:**

1. **B0:** зарегистрируй спринт (registry parent + phases `oc-b0..b4`), OPEN tracker, `yarn task:sync-readme`.
2. **B1:** создай 4 SKILL.md (`client-module-guard`, `full-ci-operator`, `issue-triage`, `opencode-self-maintenance`) по канону.
3. **B2:** создай 6 команд в `.opencode/command/` (обёртки `standup`, `main-day-issue`, `ritual:evening`, full CI, `issues:audit`, close-task).
4. **B3:** обнови `opencode.json` (references += command) и `AGENTS.md` (§ operator commands).
5. **B4:** verify (JSON valid, frontmatter, скрипты существуют); archive phases; отчёт в Issue.

**Инварианты:** не плодить новые `yarn`-скрипты; команды = тонкие обёртки; не ломать schema `opencode.json`; не трогать runtime/CI workflow.

---

## Порядок работы ролей

1. **Teamlead (Vesnin)** — приёмка формата skills/commands, Issue отчёт, LGTM.
2. **Структурщик** — раскладка `.opencode/command/`, references в config, нет дублирования логики.
3. **Математик** — множество «команда → существующий скрипт»: dangling = 0.
4. **Верстальщик** — читаемость SKILL.md/command для агента; описания с триггерами.
5. **Музыкант** — n/a (нет аудио-домена).
