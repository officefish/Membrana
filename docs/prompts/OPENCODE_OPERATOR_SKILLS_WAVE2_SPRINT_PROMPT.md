# Промпт (day sprint · planned): OpenCode operator skills — wave 2

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Реестр:** day-sprint **`opencode-operator-skills-wave2-2026-06-26`** (phases `wc-c0` … `wc-c4`)
> **Предшественник:** Issue #183 (`opencode-operator-workflows`) + консилиум [`opencode-operator-skills-wave2-consilium-2026-06-26.md`](../discussions/opencode-operator-skills-wave2-consilium-2026-06-26.md)
> **Статус:** **planned** (ждёт go постановщика по scope)
> **Пакет:** `.opencode/skills/`, `opencode.json`, `AGENTS.md`, `docs/` — **без** runtime TypeScript

---

## Контекст

После #183 в `.opencode/skills/` 25 скиллов + 6 команд. Консилиум команды (2026-06-26) определил **wave 2** — 5 скиллов Tier 1, закрывающих боли, проявившиеся в работе: ручной scoped-коммит, навигация по prod-деплою, env/секреты/прокси (RAG-ключ), отсутствие security-чеклиста. Подтверждено, что скиллы **не обязаны** оборачивать наши скрипты: в Tier 1 один операторский, три плейбука, один гибрид (seeded из downloadable + адаптер).

---

## Product decisions

| ID | Решение |
|----|---------|
| **D-W2-1** | Три типа скиллов легитимны: операторский (обёртка скрипта), плейбук (знание), обёртка внешнего инструмента/MCP. |
| **D-W2-2** | Tier 1 (этот спринт) — 5 скиллов; Tier 2 (`linear-sync`, `design-review`, `edge-capture`, mirror) — отдельная волна. |
| **D-W2-3** | `security-review` — демонстрация «подкачки»: seeded базовым чеклистом (библиотека Anthropic / плагин) + Membrana-адаптер (границы пакетов, секреты, no-eval в policy). |
| **D-W2-4** | Операторские скиллы — только обёртки **существующих** `package.json` скриптов (dangling = 0). |
| **D-W2-5** | `yarn-workspace` — компактный плейбук, **ссылается** на `AGENTS.md §Gotchas`, не дублирует. |
| **D-W2-6** | Mirror в `.cursor`/`.claude` — out of scope (Tier 2). |

---

## Tier 1 — состав

| # | Скилл | Тип | Опора / канон |
|---|-------|-----|---------------|
| 1 | `membrana-git-pr` | плейбук + tool | `gh`, `lefthook`, ветки персонажей (`vesnin`/`ozhegov`/`techies68`), scoped commit, no `.env`/логи в корень |
| 2 | `membrana-deploy-operator` | операторский | `cabinet:*:prod`, `device-board:deploy:prod`, `office:docker:prod:*`, `media:docker:prod:*` (+ docker секция) |
| 3 | `membrana-yarn-workspace` | плейбук | `AGENTS.md §Gotchas` (corepack→Yarn4, `--immutable`, turbo `^build`) |
| 4 | `membrana-security-review` | гибрид | downloadable чеклист + адаптер (границы, секреты, no-eval) · `.claude` /security-review как референс |
| 5 | `membrana-env-secrets-guard` | плейбук + guard | `.env`, `HTTPS_PROXY` (localhost), ключи (OPENAI/ANTHROPIC/LINEAR), секреты не в репо |

---

## Phases

| Phase | Registry id | Size | DoD summary |
|-------|-------------|------|-------------|
| **C0** | `wc-c0-register` | S | Этот промпт; registry parent+phases; OPEN tracker; sync-readme |
| **C1** | `wc-c1-git-yarn` | M | `membrana-git-pr` + `membrana-yarn-workspace` SKILL.md |
| **C2** | `wc-c2-deploy` | M | `membrana-deploy-operator` (обёртки реальных prod-скриптов, dangling=0) |
| **C3** | `wc-c3-security-env` | M | `membrana-security-review` (seeded+адаптер) + `membrana-env-secrets-guard` |
| **C4** | `wc-c4-wire-close` | S | `opencode.json`/`AGENTS.md` (если нужно), verify, archive, Issue отчёт |

**Порядок:** C0 → C1 → C2 → C3 → C4.

---

## Тесты и верификация

| Область | Критерий |
|---------|----------|
| Skills frontmatter | каждый SKILL.md: `name` == имя директории, `description` с триггерами + «Do NOT use» |
| Operator dangling | все скрипты, на которые ссылается `deploy-operator`, есть в `package.json` |
| Config valid | `python3 -m json.tool opencode.json` — OK (если правился) |
| Registry | `node scripts/task-list.mjs` без ошибок; phases `wc-c0..c4` под parent |

---

## Definition of Done

- [ ] C0–C4 в реестре (`parentEpic: opencode-operator-skills-wave2-2026-06-26`)
- [ ] 5 Tier-1 скиллов под `.opencode/skills/`
- [ ] `deploy-operator` — no dangling scripts
- [ ] `security-review` — явно помечен источник (seeded) + адаптер
- [ ] `AGENTS.md` — упоминание новых operator-скиллов (если уместно)
- [ ] GitHub Issue (если заводится постановщиком) + отчёт; LGTM Teamlead

---

## Out of scope

- Tier 2: `linear-sync`, `design-review`, `edge-capture`
- Mirror в `.cursor`/`.claude`
- Новые `yarn`-скрипты, runtime/TS, CI workflow
- Реальный деплой (скилл только навигатор; деплой запускает человек)

---

## Промпт целиком (для вставки агенту)

Ты — координатор Membrana (Vesnin). Следуй [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md), консилиуму wave-2 и этому промпту.

**Задача:** добавить 5 Tier-1 operator-скиллов в `.opencode/skills/` по составу выше; `deploy-operator` — обёртки существующих prod-скриптов; `security-review` — seeded из downloadable + Membrana-адаптер; остальные — плейбуки.

**Порядок:** C0 register → C1 git-pr + yarn-workspace → C2 deploy-operator → C3 security-review + env-secrets-guard → C4 wire/verify/close.

**Инварианты:** операторские скиллы = обёртки существующих скриптов (dangling=0); плейбуки без выдуманных команд; не ломать `opencode.json`; не плодить новые `yarn`-скрипты.

---

## Порядок работы ролей

1. **Teamlead (Vesnin)** — приёмка scope/формата, LGTM.
2. **Структурщик (Ozhegov)** — раскладка `.opencode/skills/`, нет дублирования.
3. **Математик (Dynin)** — `deploy-operator`/`security`/`env` (его вторичный домен: Linux/Docker/security); dangling=0.
4. **Верстальщик (Rodchenko)** — читаемость SKILL.md, триггеры/границы в description.
5. **Музыкант (Kuryokhin)** — n/a в Tier 1 (edge-capture → Tier 2).
