<!-- Сгенерировано: 2026-06-26 (virtual-team review; day-sprint opencode-operator-workflows-2026-06-26, Issue #183) -->

Tier: T1 (config/docs, no runtime) · **Вердикт: LGTM** (гейт: scoped commit + `opencode.json` valid)

> **TL;DR (Teamlead):** Принято. 5/5 acceptance criteria; 4 skills + 6 commands — тонкие обёртки над существующими `yarn`-скриптами (dangling = 0); `opencode.json` валиден; новой логики/скриптов не заведено. Остаток — локальный scoped-коммит + `Closes #183`.

[Teamlead]: Day-sprint `opencode-operator-workflows-2026-06-26` поднимает operator-эргономику OpenCode. Все 5 AC закрыты: (1) спринт в реестре с prompt + phases `oc-b0..b4`; (2) 4 skills (`client-module-guard`, `full-ci-operator`, `issue-triage`, `opencode-self-maintenance`); (3) 6 команд (`standup`, `main-day`, `ritual-evening`, `full-ci`, `triage-issues`, `close-task`); (4) `opencode.json` valid — `instructions: AGENTS.md`, `skills.paths`, `references.opencode-commands` (авто-дискаверинг `.opencode/command/`); (5) артефакты по `TASK_PROMPT_WORKFLOW.md`. Инвариант «тонкие обёртки» (D-OC-1) соблюдён — runtime/TS не тронут. **LGTM**.

[Структурщик]: Раскладка корректна: команды в `.opencode/command/*.md` (новая директория, авто-дискаверинг — без хардкода путей в config), skills в `.opencode/skills/membrana-*` (формат как у эталона `membrana-task-lifecycle`). `references.opencode-commands` документирует расположение, не ломая schema (`opencode.json` проходит `json.load`). Нет дублирования логики — каждая команда отсылает к одному `yarn`-скрипту. Граница «skills (playbook) vs commands (entrypoint)» чистая. C-scope ✅.

[Математик]: Множество «команда → существующий скрипт» проверено: `standup`, `main-day-issue`, `ritual:evening`, `issues:audit`, `task:archive`, `task:close-github`, `check:boundaries` — все присутствуют в `package.json`. **|dangling| = 0.** Frontmatter: 6/6 команд имеют `description`; 4/4 skills имеют `name` == имя директории. ✅

[Верстальщик]: SKILL.md и command-файлы читаемы агентом: явные «When to use / When NOT to use», таблицы «Goal → Command», ссылки на канон-документы. Описания skills содержат триггеры **и** границы («Do NOT use … другой skill»), что снижает ложные срабатывания. `AGENTS.md` § OpenCode operator commands — таблица команда→скрипт→skill для быстрого входа. ✅

**Ключевые файлы:**
- `.opencode/command/{standup,main-day,ritual-evening,full-ci,triage-issues,close-task}.md`
- `.opencode/skills/membrana-{client-module-guard,full-ci-operator,issue-triage,opencode-self-maintenance}/SKILL.md`
- `opencode.json` (`references.opencode-commands`)
- `AGENTS.md` (§ operator commands)
- `docs/prompts/OPENCODE_OPERATOR_WORKFLOWS_SPRINT_PROMPT.md` + registry `oc-b0..b4`

**Риски:**
- **P2:** `opencode.json` правился через bash (cat >) после того, как file-tool write обрезал файл на маунте — финальная версия валидна (`json.load` OK). При будущих правках через cowork — проверять `python3 -m json.tool opencode.json`.
- **P3:** команды используют `agent: build` (primary OpenCode agent) — если в проекте переопределят primary-агента, проверить совместимость.
- **P3 (env):** коммит — локально (Windows-маунт cowork блокирует git `unlink`); см. `commit-sprint.sh`.

**Definition of Done:**
```bash
python3 -m json.tool opencode.json >/dev/null && echo "opencode.json OK"
ls .opencode/command/*.md            # 6
node scripts/task-list.mjs | tail -3 # registry sane
bash docs/day-sprint/opencode-operator-workflows-2026-06-26/commit-sprint.sh
```

**Вердикт:** **LGTM** (гейт: scoped commit + valid config). Mirror в `.cursor`/`.claude` — follow-up, out of scope.
