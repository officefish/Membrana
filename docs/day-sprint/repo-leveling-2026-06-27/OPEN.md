# OPEN: Repo Leveling — выравнивание рабочего дерева

| Поле | Значение |
|------|----------|
| **Sprint** | `repo-leveling-2026-06-27` |
| **Registry** | `repo-leveling` ✅ active (registry.json) |
| **Prompt** | [`REPO_LEVELING_SPRINT_PROMPT.md`](../../prompts/REPO_LEVELING_SPRINT_PROMPT.md) |
| **GitHub Issue** | #__ (создать: [`ISSUE.md`](./ISSUE.md) → `gh issue create`) |
| **Parent** | — (инфраструктурный/гигиенический) |
| **Status** | **open** — A risk-gate первым |
| **Started** | 2026-06-27 |
| **Канон дня** | [`MAIN_DAY_ISSUE.md`](../../MAIN_DAY_ISSUE.md) |

**Контекст:** в рабочем дереве `main` накопилось **131 изменение** (`git status --short`): 80 modified, 48 untracked, 2 deleted; суммарный дифф **83 файла, +1387 / −2743**. Значительная часть — это **уже завершённая работа, которая не закоммичена** (например, миграция `docs-actions-phase-a` помечена `closed`, но её правки висят в дереве). Цель спринта — привести дерево к чистому состоянию **без потери готовой работы и без утечки секретов**.

> ⚠️ **Запускается локально.** Все git/yarn/RAG-команды выполняются на машине разработчика, не в Cowork-песочнице. Перед началом — `git pull` и убедиться, что нет незавершённого rebase/merge.

**Out of scope:** триаж 166 active-задач в `registry.json` (отдельный backlog-спринт); деплой cabinet/Studio; нейро-контракт; `yarn rag:index --full` (только evening-index в финале).

---

## Инвентарь подвисших файлов (категории)

| # | Категория | Состав | Действие |
|---|-----------|--------|----------|
| **R** | 🔴 Риск-секрет | `.env.llm-proxy` (untracked, **НЕ в `.gitignore`**) | Добавить в `.gitignore`, **никогда не коммитить**. Проверить, что не попал в индекс. |
| **1** | Артефакты сборки/тестов | `apps/client/playwright-report/`, `apps/client/test-results/` | В `.gitignore`, не коммитить. |
| **2** | Root-мусор / логи | `client-rv.log`, `core-rv.log`, `tc-*.log`, `turbo-build.log`, `.sync-readme-out.txt` (96 КБ) | Перенести в `%TEMP%`/удалить; убедиться, что покрыто `*.log` + добавить `.sync-readme-out.txt`. |
| **3** | Дубликаты-мусор | `device-scenario-microphone-main (6).json`, `(7)`, `(8)` | Удалить (нумерованные копии загрузок). |
| **4** | ✅ Завершённая миграция docs-actions | ~50 modified docs (rewrite ссылок `device-board-scripts/…` → `actions/…`), `docs/actions/`, `scripts/migrate-docs-actions-phase-a.mjs`, 2 удалённых `DB_*_TEAMLEAD_REVIEW.md` | **Один логический коммит** (Фаза C). Спринт уже `closed`. |
| **5** | ✅ Архивы задач | `docs/tasks/archive/da-*` (7), `oc-b*` (5), `wc-c*` (5), `*-2026-06-26.md` | Коммит вместе с обновлённым `registry.json` (Фаза D). |
| **6** | ✅ Sprint-deliverables | новые `docs/prompts/*PHASE_A*`, `*WAVE2*`, `*WORKFLOWS*`, `docs/discussions/*code-review*`, `*consilium*`, `docs/archive/daily-day/2026-06-26/`, `docs/archive/device-board-reviews/` | Коммит по сприн­там-источникам (Фаза D). |
| **7** | ✅ Конфиги нового тулинга | `.agents/`, `.opencode/`, `opencode.json` (все untracked; `.continue/` уже tracked) | Решить tracked/ignored; коммит или ignore (Фаза D). |
| **8** | MCP-фрагменты | `docs/mcp/GLYPH_PROMPTS.md`, `docs/mcp/tier5-linear.fragment.json` | Коммит (Фаза D). |
| **8b** | Прочие modified | `.cursorrules`, `AGENTS.md`, `scripts/*.mjs`, `.github/workflows/usercase-competition.yml` и др. | Сгруппировать по смыслу (Фаза C/D). |

---

## Phases

| Phase | Deliverable | Gate |
|-------|-------------|------|
| **A** | Risk-gate: секрет закрыт, артефакты игнорируются | `.env.llm-proxy` в `.gitignore`; `git status` не показывает секрет; нет staged-секретов |
| **B** | Мусор и дубликаты убраны | root-логи + `.sync-readme-out.txt` + `(6/7/8).json` не в дереве; `*.log` покрыт |
| **C** | docs-actions миграция закоммичена | один коммит; внутренние ссылки резолвятся; 2 удаления учтены |
| **D** | Готовая работа закоммичена группами | архивы+`registry.json`, prompts, discussions, tooling — отдельными коммитами |
| **E** | Сверка sprint-ledger (долг) | day-sprint без CLOSURE размечены; статусы `registry.json` сверены |
| **F** | Verify & seal | `lint typecheck test build` зелёные; `git status` чистый; `rag:evening-index` |

---

## Фаза A — Risk-gate (делать ПЕРВОЙ)

Закрыть утечку до любых `git add`.

```bash
# 1. Убедиться, что секрет ещё не в индексе/истории
git ls-files | grep -i 'env.llm-proxy' || echo "OK: не отслеживается"
git log --all --oneline -- .env.llm-proxy | head || echo "OK: нет в истории"

# 2. Добавить паттерны в .gitignore (секрет + артефакты client)
cat >> .gitignore <<'EOF'

# LLM proxy secret (локальный, не коммитить)
.env.llm-proxy
.env.llm-proxy.local
# Playwright / тестовые артефакты
apps/client/playwright-report/
apps/client/test-results/
# Локальный дамп sync-readme
.sync-readme-out.txt
EOF

# 3. Проверка
git check-ignore .env.llm-proxy apps/client/playwright-report .sync-readme-out.txt
```

> `.env.llm-proxy.example` остаётся в репозитории (это шаблон). Игнорируется только реальный `.env.llm-proxy`.

**Gate A:** `git check-ignore` подтверждает все три; `git status` больше не показывает секрет/артефакты как untracked.

---

## Фаза B — Чистка мусора и дубликатов

```bash
# Root-логи и sync-дамп — в %TEMP% (CLAUDE.md: не держать в корне репо)
git rm --cached -r --ignore-unmatch client-rv.log core-rv.log tc-cab.log tc-client.log tc-core.log turbo-build.log 2>/dev/null
rm -f client-rv.log core-rv.log tc-*.log turbo-build.log .sync-readme-out.txt

# Дубликаты загрузок
git rm --ignore-unmatch "docs/device-board-scripts/device-scenario-microphone-main (6).json" \
                        "docs/device-board-scripts/device-scenario-microphone-main (7).json" \
                        "docs/device-board-scripts/device-scenario-microphone-main (8).json"
```

> Перед удалением `(6/7/8).json` — сверить с каноном `device-scenario-microphone-main-v08-policy-constructor.json`: если в одной из копий новее граф, продвинуть его, остальное удалить. (Tracked-копии `(1/3/4/5).json` — отдельный накопленный долг, в scope этого спринта не входят, но стоит зачистить тем же проходом.)

**Gate B:** `git status` чистый от логов/дублей; `*.log` покрыт `.gitignore`.

---

## Фаза C — Коммит завершённой docs-actions миграции

Спринт `docs-actions-phase-a-2026-06-26` помечен `closed`, но правки висят. Закоммитить как **одну атомарную единицу** (rewrite ссылок + новая структура `docs/actions/` + скрипт + 2 удаления).

```bash
# Проверить, что ссылки резолвятся после rewrite (нет yarn-скрипта — ручная проверка битых путей)
grep -rIl 'device-board-scripts/' docs/ | head   # должны остаться только намеренные ссылки
#   (формальный аудит — по da-a2-link-audit из закрытого спринта)

git add docs/actions/ scripts/migrate-docs-actions-phase-a.mjs
git add -u docs/                    # подхватит rewrite + 2 deleted TEAMLEAD_REVIEW
git add docs/ARCHITECTURE.md docs/MCP_USAGE.md AGENTS.md .cursorrules
git commit -m "docs: complete docs-actions phase A migration (link rewrite + actions/ tree)"
```

**Gate C:** `git diff --stat HEAD~1` показывает только docs-actions кластер; внутренние ссылки не битые; 2 `DB_*_TEAMLEAD_REVIEW.md` учтены как удаления.

---

## Фаза D — Коммит готовой работы группами

Отдельный коммит на каждый источник — чтобы история читалась.

```bash
# D1 — архивы задач + registry
git add docs/tasks/archive/ docs/tasks/registry.json docs/tasks/README.md
git commit -m "tasks: archive da-*/oc-*/wc-* completed tasks + registry sync"

# D2 — sprint prompts + discussions (docs-actions / opencode wave2 / workflows)
git add docs/prompts/ docs/discussions/ docs/seanses/
git commit -m "docs: sprint prompts + code-review/consilium for phase-A, opencode wave2/workflows"

# D3 — дневные архивы и ревью
git add docs/archive/
git commit -m "docs: archive daily-day 2026-06-26 + device-board-reviews"

# D4 — MCP-фрагменты
git add docs/mcp/GLYPH_PROMPTS.md docs/mcp/tier5-linear.fragment.json
git commit -m "mcp: glyph prompts + tier5 linear fragment"

# D5 — конфиги тулинга (РЕШИТЬ: track или ignore)
#   если track:
git add .agents/ .opencode/ opencode.json
git commit -m "chore: opencode/agents operator tooling config"
#   если ignore — вместо add добавить в .gitignore: .agents/ .opencode/ opencode.json
#   (.continue/ уже tracked — не трогать)

# D6 — остаток modified scripts/workflows
git add scripts/ .github/workflows/usercase-competition.yml
git commit -m "scripts+ci: client-logs parser, usercase, rag-evening, mcp-bootstrap, competition workflow"
```

> **Решение по D5:** `.opencode/` и `.agents/` — это персональный тулинг или командный стандарт? Если командный → коммитить; если личный → `.gitignore`. По умолчанию рекомендую **коммитить** (синхронизация операторских воркфлоу команды).

**Gate D:** `git status --short` пуст (кроме сознательно проигнорированного); каждый коммит атомарен.

---

## Фаза E — Сверка sprint-ledger (долг)

Day-sprint без `CLOSURE.md`, требующие решения:

| Sprint | Текущий статус | Действие |
|--------|----------------|----------|
| `db-server-first-2026-06-26` | code complete (SF0–SF9 ✅), prod pending | Дописать `CLOSURE.md` или явно отметить «prod-gate pending» |
| `comp-packaging-catalog-2026-06-25` | open (D1–D6 done, D7 operator) | Закрыть D7 или перенести; CLOSURE |
| `db3h-s5-desktop-logging-2026-06-26` | active (policy LGTM, DL-DOC pending) | Подтвердить остаток scope |
| `db3h-s4-microphone-detectors-2026-06-26` | active (не стартовал) | Оставить open — будущий спринт |
| `competition-async-v2-prep-sprint-2026-06-25` | **статус неясен** | Триаж: closed или active? |
| `night-hunt-sprint-2026-06-25` | **статус неясен** | Триаж: closed или active? |
| `device-board-async-pipeline-v1-sprint-2026-06-25` | **статус неясен** | Триаж: closed или active? |

```bash
yarn task:list                     # сверить активные с registry
# Для каждого завершённого по факту:
yarn task:archive <id>             # затем вечерний yarn task:close-github
```

**Gate E:** ни один day-sprint не остаётся в `?`-статусе; `registry.json` отражает реальность; завершённые → archived.

---

## Фаза F — Verify & seal

```bash
yarn turbo run lint typecheck test build --continue
yarn task:list
git status --short                 # должно быть пусто
yarn rag:evening-index             # переиндексация после докоммита (локально)
yarn ritual:evening                # архив дня + code-review
```

**Gate F:** turbo зелёный; `git status` чист; RAG переиндексирован; ветка `main` пушнута.

---

## Фаза F-fix — пост-seal регрессия (2026-06-27, после 8 коммитов)

**Симптом:** 8 коммитов легли корректно, но рабочее дерево осталось грязным (10 изменений). Оборванный прогон ритуала перезаписал поверх sealed-состояния:

- 🔴 `.gitignore` — **откатаны 11 строк Phase A** (игнор `.env.llm-proxy`, `playwright-report/`, `test-results/`, `.sync-readme-out.txt`). `git check-ignore .env.llm-proxy` → NOT ignored; секрет снова `??`. Risk-gate отменён в рабочем дереве (в историю **не** утёк).
- 🔴 `docs/tasks/registry.json` — **битый JSON**, обрезан на строке 9119 (`"d` вместо `"dynin"`, нет финальных скобок). В HEAD файл целый.
- ⚠️ Откаты в `scripts/{rag-evening-index,_daily-standup,_main-day-issue,morning-care}.mjs` и сдвиг сабмодуля `apps/demos/Harmonic-Detector`.
- ⚠️ `device-board-server-first` в registry всё ещё `active` (CLOSURE.md есть; статус не переключён).

**Восстановление — см. инструкцию для агента:** [`PHASE_F_FIX_AGENT_PROMPT.md`](./PHASE_F_FIX_AGENT_PROMPT.md).

Короткая суть:

```bash
git checkout -- .gitignore docs/tasks/registry.json          # вернуть secret-gate + целый реестр
git check-ignore .env.llm-proxy                              # → путь = снова ignored
node -e "JSON.parse(require('fs').readFileSync('docs/tasks/registry.json'));console.log('registry OK')"
git diff scripts/ apps/demos/Harmonic-Detector               # решить: keep (commit) или discard (checkout --)
git status --short                                           # должно стать пусто
```

**Gate F-fix:** `check-ignore .env.llm-proxy` = ignored; registry.json парсится; `git status` пуст; решение по scripts/сабмодулю принято и зафиксировано.

---

## Порядок и риск

1. **A первым, всегда** — секрет до любого `git add`.
2. B → C → D последовательно (атомарные коммиты, легко откатить).
3. E можно параллельно (только docs/registry).
4. F — финальный seal.

**Главный риск:** случайный `git add .` до Фазы A → утечка `.env.llm-proxy`. Поэтому Фаза A закрывает gitignore раньше всех коммитов.

**Откат:** каждый коммит атомарен по группе → `git revert <hash>` точечно.
