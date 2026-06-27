<!-- Сгенерировано: 2026-06-26 (virtual-team review; day-sprint opencode-operator-skills-wave2-2026-06-26) -->

Tier: T1 (skills/docs, no runtime) · **Вердикт: LGTM**

> **TL;DR (Teamlead):** Принято. 5 Tier-1 скиллов по консенсусу консилиума; типы разнесены (1 операторский, 3 плейбука, 1 гибрид). `deploy-operator` — dangling=0. Tier 2 отложен. Остаток — scoped-коммит локально.

[Teamlead — Vesnin]: Wave 2 реализует ровно тот состав, на котором сошёлся консилиум — без расширения scope. Главное продемонстрировано постановщику: скилл **не обязан** оборачивать наш скрипт. `git-pr`/`yarn-workspace`/`env-secrets-guard` — плейбуки; `deploy-operator` — операторский; `security-review` — гибрид (seeded из downloadable + Membrana-адаптер). Инвариант «no new yarn scripts» соблюдён. **LGTM**.

[Структурщик — Ozhegov]: Раскладка чистая: 5 директорий `.opencode/skills/membrana-*`, формат как у эталона. `git-pr` фиксирует то, об что мы спотыкались сегодня — scoped-stage, ветки персонажей, `index.lock` на маунте, no-secrets-в-корень. Нет дублирования: `yarn-workspace` **ссылается** на `AGENTS.md §Gotchas`, а не копирует. Границы со старыми скиллами проставлены через «Do NOT use». C-scope ✅.

[Математик — Dynin]: Мои три (deploy/security/env) проверены. `deploy-operator`: все 14+ команд карты — реальные `package.json` скрипты, **dangling = 0** (cabinet prod/rollback/smoke, milestone mp3–mp7/tj6/quota/u10, device-board:deploy:*, office/media docker prod). Помечено как навигатор — prod не запускается за пользователя (security). `env-secrets-guard` фиксирует урок #182: localhost-прокси + OPENAI ключ + non-blocking RAG. `security-review` — база seeded, адаптер C-SEC Membrana-специфичен (no-eval в policy, границы, секреты). ✅

[Верстальщик — Rodchenko]: Читаемость в норме: у всех пяти — триггеры в `description` **и** «Do NOT use → сосед-скилл», таблицы команд, секции When/When-NOT. `deploy-operator` явно отделяет prod от локального docker — оператор не перепутает. `security-review` честно помечает источник (seeded) — это и есть демонстрация «подкачки». ✅

[Музыкант — Kuryokhin]: По Tier 1 — пусто (как и договаривались); `edge-capture` ушёл в Tier 2. Возражений к составу нет.

**Ключевые файлы:**
- `.opencode/skills/membrana-{git-pr,deploy-operator,yarn-workspace,security-review,env-secrets-guard}/SKILL.md`
- `AGENTS.md` (§ operator skills wave 2)
- `docs/prompts/OPENCODE_OPERATOR_SKILLS_WAVE2_SPRINT_PROMPT.md` + registry `wc-c0..c4`
- консилиум: `docs/discussions/opencode-operator-skills-wave2-consilium-2026-06-26.md`

**Риски:**
- **P2:** `security-review` зависит от downloadable-базы (`.claude` /security-review / плагин) — если источник недоступен, остаётся Membrana-адаптер C-SEC (самодостаточен как чеклист).
- **P3:** `deploy-operator` — навигатор; реальный prod-деплой не автоматизирован намеренно (действие человека).
- **P3 (env):** коммит — локально (Windows-маунт cowork ломает git `unlink`); см. `commit-sprint.sh`.

**Definition of Done:**
```bash
ls -d .opencode/skills/membrana-{git-pr,deploy-operator,yarn-workspace,security-review,env-secrets-guard}  # 5
# dangling check для deploy-operator (все yarn-команды карты ∈ package.json) — green
node scripts/task-list.mjs | tail -3
bash docs/day-sprint/opencode-operator-skills-wave2-2026-06-26/commit-sprint.sh
```

**Вердикт:** **LGTM**. Tier 2 (`linear-sync`, `design-review`, `edge-capture`, mirror) — следующая волна.
