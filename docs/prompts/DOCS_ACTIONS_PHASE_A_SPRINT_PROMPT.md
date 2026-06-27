# Промпт (day sprint · active): docs/actions — фаза A (device-board processes)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** day-sprint **`docs-actions-phase-a-2026-06-26`**  
> **Предшественник:** консилиум 2026-06-26 (реорганизация `docs/device-board-scripts`)  
> **Статус:** **active**  
> **Пакет:** `docs/`, `.cursor/skills/`, `.claude/skills/` (mirror), `scripts/` (link audit only), **без** runtime TypeScript

---

## Контекст

Каталог `docs/device-board-scripts/` изначально создавался под экспортированные JSON сценариев, но накопил **долгоживущие MD-регламенты** (UserCase generation, lessons L1–L23, ST1–ST9, smoke, cookbooks, LGTM). Имя вводит агентов в заблуждение; ~90+ ссылок в репозитории.

**Решение консилиума (фаза A — безопасная):**

| Что | Куда | Не трогаем в фазе A |
|-----|------|---------------------|
| Процессы / регламенты / smoke / cookbooks / LGTM (`.md`) | `docs/actions/device-board/` | — |
| Fixtures: `usercase-*/`, `golden/`, `device-scenario-*.json`, `logs/` | `docs/device-board-scripts/` | пути JSON, CI allowlist, manifests |
| Epic/sprint task-промпты | `docs/prompts/` | роль слоя не меняется |
| Архитектура device-board | `packages/device-board/`, `docs/SCENARIO_RUNTIME.md`, … | не переносим в actions |

**Фаза B** (rename data root → `docs/device-board/fixtures/`) — **out of scope** этого спринта; отдельный epic после стабилизации фазы A.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Постановка M/L |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | Закрытие |
| [`DOCUMENTATION_WORKFLOW.md`](../DOCUMENTATION_WORKFLOW.md) | RAG ritual |
| [`CURSOR_AGENT_SKILLS_SPRINT_PROMPT.md`](./CURSOR_AGENT_SKILLS_SPRINT_PROMPT.md) | Эталон skills sprint |
| [`USERCASE_GENERATION_REGULATION.md`](../actions/device-board/USERCASE_GENERATION_REGULATION.md) | Канон до mv (путь обновится) |

**GitHub Issue:** [#182](https://github.com/officefish/Membrana/issues/182)

---

## Product decisions

| ID | Решение |
|----|---------|
| **D-ACT-1** | Новый слой `docs/actions/` — **долгоживущие процессы** (регламенты, runbooks, lessons, smoke, sign-offs). Не дублирует `docs/prompts/` (временные epic/sprint specs). |
| **D-ACT-2** | `docs/actions/README.md` — единый routing hub: taxonomy + таблица «процесс → путь → skill». |
| **D-ACT-3** | На **каждом** старом пути MD — **redirect-stub** (1 абзац + ссылка на новый путь). Удаление stubs — не раньше чем через 4 недели после merge (отдельная задача). |
| **D-ACT-4** | JSON/fixtures и `usercase-write-guard.mjs` allowlist **не менять** в фазе A. |
| **D-ACT-5** | Team review MD (`DB_*_TEAMLEAD_REVIEW.md`) → `docs/archive/device-board-reviews/` (не actions). |
| **D-ACT-6** | Опционально: `docs/device-board/README.md` — index на пакет + ссылка на actions (без дублирования CONCEPT). |
| **D-ACT-7** | После merge: `yarn rag:index` incremental на `docs/actions/**` + обновлённые stubs. |

---

## Целевая структура (фаза A)

```text
docs/
  actions/
    README.md                         # taxonomy + routing
    device-board/
      USERCASE_GENERATION_REGULATION.md
      USERCASE_COMPETITION_LESSONS.md
      STUDIO_HOST_LESSONS.md
      CLIENT_LOGS_PARSING.md
      smoke/
        DEVICE_BOARD_SERVER_FIRST_SMOKE.md
        DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md
        DB_RECORDING_PARITY_SMOKE_MATRIX.md
        DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md
      cookbooks/
        SCENARIO_CHAIN_LOG_COOKBOOK.md
      sign-offs/
        USERCASE_MVP_MICROPHONE_LGTM.md
        PURE_GETTERS_LGTM.md
        DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md
      specs/
        USERCASE_MVP_MICROPHONE.md

  device-board-scripts/               # fixtures hub (JSON only + узкий README)
    README.md                         # → fixtures + link ../actions/device-board/
    usercase-*/
    golden/
    device-scenario-*.json
    logs/
    <stub>.md                         # redirect на actions (временно)
```

---

## Phases

| Phase | Registry id | Size | DoD summary |
|-------|-------------|------|-------------|
| **A0** | `da-a0-taxonomy-adr` | S | `docs/actions/README.md` (taxonomy); product decisions D-ACT-* в промпте; OPEN sprint |
| **A1** | `da-a1-scaffold-mv` | M | `git mv` 13 MD → `docs/actions/device-board/**`; redirect-stubs на старых путях |
| **A2** | `da-a2-link-audit` | M | Обновить все ссылки в коде/docs/skills (grep `device-board-scripts/.*\.md` → 0 кроме stubs); archive reviews |
| **A3** | `da-a3-steering-sync` | M | `.cursorrules` #11, `AGENTS.md`, `VIRTUAL_TEAM_PROMPT.md`, skills mirror, `docs/prompts/README.md` § UserCase |
| **A4** | `da-a4-verify-ci` | M | `node scripts/usercase.mjs verify-paths`; `yarn catalog:verify-client` если catalog; link-check script или documented grep gate |
| **A5** | `da-a5-rag-index` | S | `yarn rag:index` incremental; smoke `yarn rag:query "USERCASE_GENERATION_REGULATION"` |
| **A6** | `da-a6-closure` | S | LGTM Teamlead; archive phases; отчёт в Issue |

**Рекомендуемый порядок:** **A0 → A1 → A2 → A3 → A4 → A5 → A6** (A2 и A3 можно частично параллелить после A1).

**Оценка:** **L day-sprint**, 2–4 рабочих дня, **1 PR** (предпочтительно) или 2 PR (A1 stub + A2 links).

---

## Матрица переноса файлов

| Исходный путь | Новый путь |
|---------------|------------|
| `actions/device-board/USERCASE_GENERATION_REGULATION.md` | `actions/device-board/USERCASE_GENERATION_REGULATION.md` |
| `actions/device-board/USERCASE_COMPETITION_LESSONS.md` | `actions/device-board/USERCASE_COMPETITION_LESSONS.md` |
| `actions/device-board/STUDIO_HOST_LESSONS.md` | `actions/device-board/STUDIO_HOST_LESSONS.md` |
| `actions/device-board/CLIENT_LOGS_PARSING.md` | `actions/device-board/CLIENT_LOGS_PARSING.md` |
| `actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md` | `actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md` |
| `actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md` | `actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md` |
| `actions/device-board/smoke/DB_RECORDING_PARITY_SMOKE_MATRIX.md` | `actions/device-board/smoke/DB_RECORDING_PARITY_SMOKE_MATRIX.md` |
| `actions/device-board/smoke/DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md` | `actions/device-board/smoke/DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md` |
| `actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md` | `actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md` |
| `actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md` | `actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md` |
| `actions/device-board/sign-offs/PURE_GETTERS_LGTM.md` | `actions/device-board/sign-offs/PURE_GETTERS_LGTM.md` |
| `actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md` | `actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md` |
| `actions/device-board/specs/USERCASE_MVP_MICROPHONE.md` | `actions/device-board/specs/USERCASE_MVP_MICROPHONE.md` |
| `device-board-scripts/DB_*_TEAMLEAD_REVIEW.md` | `docs/archive/device-board-reviews/` |

---

## Архитектура артефактов

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Actions (process) | `docs/actions/**` | Регламенты, smoke, lessons — канон для агентов |
| Task prompts | `docs/prompts/*_PROMPT.md` | Epic/sprint specs — ссылаются на actions |
| Skills | `.cursor/skills/membrana-*/SKILL.md` | Thin pointers → `docs/actions/` |
| Fixtures | `docs/device-board-scripts/` | JSON, golden, manifests (пути стабильны) |
| Package canon | `packages/device-board/DEVICE_BOARD_CONCEPT.md` | Архитектура — не в actions |
| Steering | `.cursorrules`, `AGENTS.md` | Обновить ссылку #11 |

**Запрещено в фазе A:**

- Переименовывать `docs/device-board-scripts/` для JSON
- Менять `scripts/lib/usercase-write-guard.mjs` allowlist
- Менять `.github/workflows/usercase-competition.yml` path filters
- Менять `manifest.json` → `goldenDocument` пути
- Удалять redirect-stubs в том же PR
- Трогать `@membrana/core`, runtime device-board TS (кроме комментариев в тестах со ссылками на MD — не требуется)

---

## Файлы с обязательным обновлением ссылок (чеклист A2)

Минимальный grep-лист (не исчерпывающий — полный audit в DoD):

| Область | Файлы |
|---------|--------|
| Skills | `.cursor/skills/membrana-usercase-generation/SKILL.md`, `membrana-client-logs-parsing/SKILL.md`, `.claude/skills/*` mirror |
| Steering | `.cursorrules`, `AGENTS.md`, `docs/VIRTUAL_TEAM_PROMPT.md` |
| Prompts | `DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`, `DB3H_S3_*`, `DB3H_S5_*`, `DEVICE_BOARD_SERVER_FIRST_SPRINT_PROMPT.md`, … |
| Scripts | `scripts/lib/client-logs-parser.mjs`, `scripts/parse-client-logs.mjs` (комментарии) |
| Docs cross-refs | `SCENARIO_RUNTIME.md`, `STUDIO_HOST_BRIDGE_CONTRACT.md`, `DESKTOP_APP_LOGGING_POLICY.md`, `MEMBRANE_PLATFORM.md`, `ARCHITECTURE.md` |
| Registry | `docs/tasks/registry.json` — `promptPath` если указывает на перемещённый MD |
| Mintlify | `apps/docs/device-board/usercases.mdx` — sign-off link |
| Tests | только если ссылаются на `.md` (JSON paths — не трогать) |

---

## Redirect-stub (шаблон)

На каждом старом пути после `git mv`:

```markdown
# Moved

Этот документ переехал в [`docs/actions/device-board/<path>`](../actions/device-board/<path>).

> Stub удалить не раньше 2026-07-26 (4 недели после merge фазы A).
```

---

## Тесты и верификация

| Область | Команда / критерий |
|---------|-------------------|
| UserCase paths | `node scripts/usercase.mjs verify-paths` — green |
| UserCase competition | `node scripts/usercase.mjs verify-competition` — green |
| Link audit | `rg 'device-board-scripts/[A-Z_].*\.md'` → только stubs |
| Catalog | `yarn catalog:verify-client` — если затронут catalog |
| CI scope | `yarn turbo run lint typecheck test build --continue` — green (или docs-only: lint + script tests) |
| RAG | `yarn rag:query "STUDIO_HOST_LESSONS ST6"` — находит новый путь |

Опционально (фаза A4): добавить `scripts/verify-doc-links.mjs` — smoke на known redirect pairs (не блокер, если grep gate в PR checklist).

---

## Definition of Done (спринт)

- [ ] A0–A6 archived в реестре (`parentEpic: docs-actions-phase-a-2026-06-26`)
- [ ] `docs/actions/README.md` + `docs/actions/device-board/` populated
- [ ] 13 MD перенесены; redirect-stubs на старых путях
- [ ] Team reviews в `docs/archive/device-board-reviews/`
- [ ] `device-board-scripts/README.md` — fixtures hub only
- [ ] Skills + `.cursorrules` #11 + `AGENTS.md` обновлены
- [ ] `rg 'device-board-scripts/.*\.md'` — только stubs (+ logs/.gitignore если есть)
- [ ] `node scripts/usercase.mjs verify-paths` green
- [ ] RAG incremental index **или** defer note в A5 archive card
- [ ] GitHub Issue: формальный отчёт + `Closes #N`
- [ ] LGTM Teamlead

---

## Out of scope

- **Фаза B:** rename `device-board-scripts` → `docs/device-board/fixtures/`
- Перенос `docs/prompts/*` в `docs/actions/`
- Новые домены actions (`ritual/`, `rag/`) — follow-up sprint
- Удаление redirect-stubs
- Изменения runtime / `vesnin` / core contracts
- Mintlify bulk restructure

---

## Промпт целиком (для вставки агенту)

Ты — координатор Membrana (Vesnin). Следуй [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) и этому промпту.

**Задача:** внедрить `docs/actions/` (фаза A) — вынести MD-процессы device-board из `docs/device-board-scripts/`, не ломая JSON/fixtures и CI.

**Порядок:**

1. **A0:** создай `docs/actions/README.md` (taxonomy: actions vs prompts vs architecture vs fixtures). Обнови `docs/day-sprint/docs-actions-phase-a-2026-06-26/OPEN.md`.
2. **A1:** `git mv` файлы по матрице переноса; на каждый старый путь — redirect-stub; перепиши `device-board-scripts/README.md` как fixtures hub.
3. **A2:** массовое обновление ссылок (grep audit); team reviews → `docs/archive/device-board-reviews/`.
4. **A3:** обнови skills (`membrana-usercase-generation`, `membrana-client-logs-parsing`), `.cursorrules` #11, `AGENTS.md`, `VIRTUAL_TEAM_PROMPT.md`, `docs/prompts/README.md`.
5. **A4:** `verify-paths`, `verify-competition`, link grep gate; PR checklist.
6. **A5:** `yarn rag:index` incremental + smoke query.
7. **A6:** отчёт в Issue, `yarn task:archive` по фазам, LGTM.

**Инварианты:** не менять JSON paths, `usercase-write-guard.mjs`, CI workflow paths, `manifest.json` golden paths.

Перед PR: `node scripts/usercase.mjs verify-paths` + link grep.

---

## Порядок работы ролей

1. **Teamlead** — LGTM taxonomy (A0), финальная приёмка, Issue отчёт.
2. **Структурщик** — матрица путей, grep audit, запрет на touch fixtures allowlist.
3. **Математик** — чеклист ссылок как множество: |broken| = 0.
4. **Музыкант** — `CLIENT_LOGS_PARSING` + cross-ref L*/ST* сохранены.
5. **Верстальщик** — README hubs читаемы агентом; skills descriptions обновлены.

---

## Заметки для человека-постановщика

### 1. GitHub Issue

Шаблон `wish`:

**Заголовок:** Ввести `docs/actions/` и вынести MD-процессы device-board (фаза A)

**Acceptance criteria:**

1. `docs/actions/device-board/` содержит все 13 MD-процессов по матрице.
2. JSON/fixtures остаются в `docs/device-board-scripts/`; `verify-paths` green.
3. Redirect-stubs на старых MD-путях.
4. Skills и `.cursorrules` указывают на новые пути.
5. RAG incremental index выполнен или defer documented.

Ссылка на промпт: `docs/prompts/DOCS_ACTIONS_PHASE_A_SPRINT_PROMPT.md`

### 2. Реестр (`docs/tasks/registry.json`)

Добавить parent + phases (после создания Issue подставить `githubIssue`):

```json
{
  "id": "docs-actions-phase-a-2026-06-26",
  "title": "Day sprint: docs/actions phase A (device-board processes)",
  "promptPath": "docs/prompts/DOCS_ACTIONS_PHASE_A_SPRINT_PROMPT.md",
  "githubIssue": null,
  "size": "L",
  "status": "active",
  "createdAt": "2026-06-26",
  "sprintKind": "day-sprint",
  "notes": "Phase A only; fixtures stay in device-board-scripts"
}
```

Дочерние фазы: `da-a0-taxonomy-adr` … `da-a6-closure` с `"parentEpic": "docs-actions-phase-a-2026-06-26"`.

После правок: `yarn task:sync-readme`

### 3. Day sprint folder

`docs/day-sprint/docs-actions-phase-a-2026-06-26/OPEN.md` — трекер фаз (см. файл в репозитории).

### 4. Закрытие

По [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md):

```bash
yarn task:archive da-a0-taxonomy-adr --notes "…"
# … по фазам …
yarn task:archive docs-actions-phase-a-2026-06-26 --notes "PR #N, phase A complete"
yarn task:close-github   # вечером
```

### 5. Проверка после PR

```bash
node scripts/usercase.mjs verify-paths
node scripts/usercase.mjs verify-competition
rg "device-board-scripts/[A-Z_].*\.md" --glob "!**/device-board-scripts/*.md"
yarn catalog:verify-client
yarn rag:query "USERCASE generation regulation write allowlist"
```

---

## Связь с дорожной картой

- Follow-up epic **фаза B:** rename fixtures root + update `usercase-write-guard.mjs` + CI workflow.
- Расширение `docs/actions/ritual/`, `docs/actions/rag/` — отдельные S/M задачи после стабилизации A.
