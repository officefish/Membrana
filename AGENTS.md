# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Membrana is a TypeScript monorepo using **Yarn 4 (Berry)** workspaces + **Turborepo**. The main application is `apps/client` (Vite + React + DaisyUI), with shared packages in `packages/` and autonomous services in `packages/services/`. Optional NestJS backends live in `packages/background-*`:

- **`background-office`** — integrations (Claude, Linear, GitHub); stateless; `yarn office:dev` (port 3000).
- **`background-media`** — web data-plane: sample library blobs (multi-format audio) + trends templates per `deviceId`; NestJS+Fastify, Prisma+PostgreSQL, blob volume; epic #58; `yarn media:db:up` → `yarn media:migrate` → `yarn media:dev` (port 3010).

Do **not** put WAV storage or user templates in office. Do **not** put Claude/Linear in media. See `docs/BACKGROUND_SERVERS.md`.

For detailed architecture, conventions, and coding rules, see `.cursorrules` and `docs/ARCHITECTURE.md`, `docs/BACKGROUND_SERVERS.md`, `docs/SERVICES.md`, `docs/DESIGN.md`, `docs/CONTRIBUTING.md`.

**Agent skills (project playbooks):** [`.cursor/skills/README.md`](./.cursor/skills/README.md) — rhythm, **code review**, task lifecycle, virtual team, domain guards. Регламент ревью: [`docs/prompts/CODE_REVIEW_REGULATION.md`](docs/prompts/CODE_REVIEW_REGULATION.md). Claude Code mirror: [`.claude/CLAUDE.md`](./.claude/CLAUDE.md).

For **new M/L agent tasks**, follow `docs/prompts/TASK_PROMPT_WORKFLOW.md` and register in `docs/tasks/registry.json`. **Linear (неблокирующий):** [`docs/prompts/LINEAR_GITHUB_SYNC_REGULATION.md`](./docs/prompts/LINEAR_GITHUB_SYNC_REGULATION.md). **Closing a task:** `docs/prompts/TASK_CLOSURE_REGULATION.md` → `yarn task:archive <id>` (day) → `yarn task:close-github` (EOD batch for Issues). Active/archive: `docs/tasks/README.md`.

### Key commands

All standard dev commands are documented in the root `README.md` and `package.json`:

| Task | Command |
|------|---------|
| Install deps | `yarn install` |
| Dev server (client) | `yarn workspace @membrana/client dev` (port 5173) |
| **UserCase build / verify (agents)** | `node scripts/usercase.mjs help` — CI: `usercase-competition.yml` + weekly `scheduled-ci` · см. [`USERCASE_GENERATION_REGULATION.md`](docs/actions/device-board/USERCASE_GENERATION_REGULATION.md) |
| **RAG (dual-circuit)** | [`docs/RAG.md`](docs/RAG.md) · `yarn rag:query` / `yarn rag:index` · operative works without `OPENAI_API_KEY`; archive needs key + `--full` index |
| Lint | `yarn lint` |
| Typecheck | `yarn typecheck` |
| Test | `yarn test` |
| Build all | `yarn build` |
| Dev all (Turbo) | `yarn dev` |
| Full CI pipeline | `yarn turbo run lint typecheck test build --continue` (34 tasks) |
| Morning checks (proxy, git, script tests, Anthropic) | `yarn morning-care` (без API: `--no-anthropic`; переключает на work-ветку **`main`**; override: `MEMBRANA_WORK_BRANCH`) |
| Daily standup (план + вчерашнее ревью + issues) | `yarn standup` (после `yarn plan:day`; **не** после `code-review`; dry: `yarn standup:dry`) |
| Вечер (архив дня + ревью) | `yarn archive:daily-day` → incremental RAG index (non-blocking) → `yarn code-review` → `yarn save-code-review` → `yarn task:close-github` → `yarn team-evening-feedback`; цепочка: `yarn ritual:evening` |
| Архив утренних артефактов (вечер, до code-review) | `yarn archive:daily-day` → `docs/archive/daily-day/<YYYY-MM-DD>/` |
| Code-review (вечер) | `yarn code-review` → `docs/DAILY_CODE_REVIEW.md`; PR: `yarn code-review:pr <N>` (без `--`); утром только читается |
| Team Evening Feedback (вечер) | `yarn team-evening-feedback` → `docs/seanses/team-evening-feedback-<date>.md`; dry: `yarn team-evening-feedback:dry`; регламент: [`TEAM_EVENING_FEEDBACK_REGULATION.md`](docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md) |
| Вечер одной командой | `yarn ritual:evening` (= archive:daily-day + rag:index:incremental + code-review + save-code-review + task:close-github + team-evening-feedback) |
| Night Build (после вечера) | `yarn night:open --id <epic-id>` → агент → `yarn night:close`; регламент: `docs/NIGHT_SPRINT_REGULATION.md` |
| Центральная задача дня (после standup) | `yarn main-day-issue` → `docs/MAIN_DAY_ISSUE.md`; буфер: `docs/CURRENT_TASK.md`; `yarn ritual:day` |
| Ритм утро/вечер/неделя (полный регламент) | см. `docs/DEVELOPER_RHYTHM.md` |
| Git hygiene audit (ветки) | entry: [`docs/audit/git/AGENT_PROMPT.md`](docs/audit/git/AGENT_PROMPT.md) · контейнер `docs/audit/git/` · `yarn repo:branches` / `yarn repo:branches:decompose` · skills `membrana-branch-audit` / `membrana-branch-decompose` |
| Tasks registry audit (задачи) | entry: [`docs/audit/tasks/AGENT_PROMPT.md`](docs/audit/tasks/AGENT_PROMPT.md) · контейнер `docs/audit/tasks/` · `yarn tasks:decompose` / `yarn tasks:audit` · skills `membrana-tasks-decompose` / `membrana-tasks-audit` |
| Antipattern bestiary | entry: [`docs/audit/bestiary/AGENT_PROMPT.md`](docs/audit/bestiary/AGENT_PROMPT.md) · контейнер `docs/audit/bestiary/` · `yarn bestiary:audit` · `yarn bestiary:weekly` · engines `scripts/lib/lens-bestiary.mjs` · эпик `bestiary-container` (#878) |
| Scripts container (группа scripts/) | entry: [`scripts/AGENT_PROMPT.md`](scripts/AGENT_PROMPT.md) · **один дом** `scripts/` (не `docs/audit/scripts/`) · `yarn scripts:registry --report` ≡ `yarn tooling:overview --report` · паттерн [`GROUP_CONTAINERIZATION`](docs/patterns/GROUP_CONTAINERIZATION.md) |

### Agent tooling

**Инвентарь — не здесь: `yarn tooling:overview`.** Он генерируется из `package.json`,
`.cursor/skills/README.md`, экспортов `scripts/lib/*.mjs` и `.githooks/` — всегда свеж.

> **Почему не списком (#554 TF-6).** Здесь стоял рукописный снимок с датой
> «2026-07-08»: **11 команд из 253** живых. Не было `neighbors`, `research`,
> `consilium`, `task:register`, `task:review:*`, `insight`. Агент читал его как факт и
> за одну сессию (16.07) **пять раз написал заново существующее** — в том числе
> самописный grep про worktree вместо `yarn neighbors`, и **этот grep соврал**.
> Та же болезнь, что у `detection-planning-priorities.mjs`: снимок от 06.07 звал
> писать `fuseDetectorConfidences`, слитый 13.07. Рукой инвентарь не ведём.

**Хуки** (`.githooks/`, авто через `prepare` → `core.hooksPath`): `pre-push` = catalog:verify-client + verify:wire-sync + affected typecheck (пропуск `SKIP_PREPUSH=1`); `commit-msg` = conventional-заголовок (блок) + Co-Authored-By трейлер (warn), пропуск `SKIP_COMMIT_MSG=1`.

#### Грабли — пишутся руками (генератор их не добудет)

Обязательство обновлять раздел — скилл `membrana-tooling-needs`. Только то, что **врёт
или кусает**, а не «что существует».

| Грабля | Как кусает |
|--------|------------|
| `yarn office:ssh 'docker ps'` | **Без `--`**: yarn 4 съедает его сам |
| Linear GraphQL / pull снимка из РФ или office MSK | **403**; движение только через **media-NL** → `linear-snapshot@1` (паспорт `docs/tasks/LINEAR_TASKS_GEAR.md` §9) |
| `yarn code-review:pr 543` | **Без `--`** по той же причине: с `--` уходило `pr="--"` (починено TF-2 — теперь внятный отказ) |
| `node scripts/_ssh-panel-smoke.mjs` | **Без `--read-only` пишет в ПРОД-стор** |
| `yarn pr:ship`, `yarn repo:clean`, `yarn tasks:archive-closed` | По умолчанию **dry-run**; нужен `--execute` |
| `pr:ship --branch` на уже выбранной ветке | С 19.07 **идемпотентен** (не `checkout -b`). Раньше fatal `already exists` и обрыв ship |
| `pr:ship` при CONFLICTING/DIRTY | **STOP до merge** (ATF4-1): rebase → `yarn git:rebase-continue` → force-with-lease → снова `--merge-only` |
| `gh pr/issue --body` / heredoc на PS | Только `--body-file` + длинный путь (`scripts/cache/`, ATF4-3); `%TEMP%`/`USER19~1` — ловушка |
| `git rebase --continue` без EDITOR | `yarn git:rebase-continue` (GIT_EDITOR=true, ATF4-4); иначе «Terminal is dumb» |
| `DAY_SPRINT_ACTIVE` при параллели | Не затирать **Focus**; править только **Also open** (ATF4-2 / DAY_SPRINT_REGULATION) |
| Sibling worktree: junction shared `node_modules` | **Anti-pattern (#725):** ломает Nest11/express resolve. Канон — per-wt `yarn install` + копия `.env`. Не заводить новый bootstrap с junction (#705 = install) |
| `gh issue/pr --body` через bash-heredoc на Windows | PS 5.1 ломает heredoc → **только tempfile + `--body-file`** (#725 A; `yarn task:start` так и делает) |
| Optional `night:*` нет в `package.json` на ветке | Soft-skip / не звать — hard-fail ритуала запрещён (#725 C). `scripts/lib/optional-yarn-script.mjs` |
| Карточка background office/media «на память» | Сначала [`docs/BACKGROUND_SERVERS.md`](docs/BACKGROUND_SERVERS.md) / скилл `membrana-background-servers` — офис уже Fastify, не Express (#725 E) |
| Раздувать AGENTS фиче-докой | AGENTS = грабли/ритуал; канон фичи — в целевом docs/skill (#725 D) |
| Второй дом для scripts | **Не** заводить `docs/audit/scripts/`. Контейнер группы — сам [`scripts/`](scripts/README.md); entry [`scripts/AGENT_PROMPT.md`](scripts/AGENT_PROMPT.md) |
| Ласточка: голые `PR #N` | `yarn live-links` — отдельно от линзы Ожегова (тон ≠ кликабельность) |
| Мёрж `git merge origin/main` | **Без `-m`** — хук освобождает `Merge*`. Своё `-m "merge: …"` строчными хук отклонит (TF-1: находка «хук ломает merge» была **ложной**) |
| Worktree занял ветку | `git checkout main` упадёт. Смотреть `yarn neighbors`, не писать grep — самописный **соврал** 16.07. Ночью ветку брать **от `origin/main`**, не от локального main |
| Новый `scripts/_ssh-*.mjs` | Под gitignore — только `git add -f`, иначе молча не войдёт в коммит (#476 п.7) |
| `rt-6` «ПОВЕСТКА НЕ ПОКРЫТА» | **Грепает МЕТКУ, не вердикт** (#558). Читать как «ID не проставлены», не «вопросы уронены». С NB3 (17.07) сообщение честное + смотрит наличие секции вердикта |
| Футер консилиума «Реплик: N» | Число пишет **модель, врёт** (M0 17.07: 21≠20). С NB2 сверяется автоматически (`reconcileReplyCount`) |
| `OFFICE_API_TOKEN` в параллельном worktree | Openrouter-`.env` несёт плейсхолдер `API_INTERNAL_TOKEN` → office 401. С NB4 (17.07) `resolveOfficeToken` берёт токен из `.env` любого worktree репо автоматически |
| `.env` в sibling-worktree | Поиск вверх корневой `.env` НЕ находит (8 worktree — соседи корня, не вложены). С #567 `loadDotEnv` слоёный: корневой (через git-common-dir) первым, локальный поверх; 401 в swallow называет цепочку `.env` и источник токена. Явный обход — `MEMBRANA_ENV_PATH` |
| `cmd \| tail; echo $?` | Пайп маскирует exit-код: получаешь код `tail`, не скрипта (16.07 укусило ТРИЖДЫ: gh pr checks, archive-task, swallow — «казалось 0, реально 1»). Мерить без пайпа (`cmd > файл 2>&1; echo $?`) или `PIPESTATUS[0]` (#567/#582) |
| Ласточка `sent=true` | **Не гарантия доставки** — office не возвращал message_id (17.07 ложная тревога «не пришла»). С NB6 клиент называет ограничение явно; серверный след — follow-up |
| MD060 в диагностиках | Шум IDE-расширения на компактных таблицах — заглушён `.markdownlint.json` (NB1). MD056 оставлен: он ловит реальный разрыв таблицы |
| `process.exit(0)` после LLM-fetch | Роняет libuv на Windows (`UV_HANDLE_CLOSING`) гонкой с закрытием сокета. Паттерн: `process.exitCode` + дать циклу стечь (`consilium.mjs`, NB5 insight) |
| Нет проверок на PR | **`no checks` ≠ зелено** (18.07 агент доложил зелёный CI, которого не было). СНАЧАЛА смотреть `mergeable`: CONFLICTING/DIRTY не строит merge-ref → CI не запускается вовсе; воркфлоу/paths-ignore проверять бессмысленно. `yarn pr:wait <N>`: none/running/green/red/**approval** (#643/#724); interrupt → `--resume` |
| Media smoke 401 / «не тот токен» | Office `API_INTERNAL_TOKEN` ≠ media. `yarn media:env:check` — URL + источник токена без секрета (#723). Не класть media egress в AGENTS фиче-простынёй |
| Фоновый вывод в `\| tail` | `tail` буферизует до закрытия пайпа — лог-файл пуст все 20 минут прогона. Фоновая команда пишет **полный** вывод в файл; хвост читать уже из файла (#643) |
| ESM-импорт из scratchpad | Short-path `USER19~1` рвёт резолв относительного пути (`ERR_MODULE_NOT_FOUND` на несуществующем пути). Из scratchpad в репо — только `pathToFileURL(длинный абсолютный путь)` (#643; та же ловушка, что T6 #548) |
| `replit:*` / `replit-bridge*.mjs` «сироты» | **Не мусор (19.07).** Эксперимент лендинга через соревнование на Replit: yarn-скрипты уже в main, файлы моста часто untracked WIP в корневом дереве. Снимать мёртвую ссылку из `test:scripts` — ок; `git clean` / выкидывать `replit:task` «файлов нет» — нельзя. Канон: [`docs/handoff/replit-bridge-experimental-wip.md`](docs/handoff/replit-bridge-experimental-wip.md) |

**Общий «работа за сегодня»** — `scripts/lib/git-day-context.mjs` (без `--author`-фильтра).

#### Ветки: `git branch --merged` здесь врёт (#492)

PR мёржатся **squash** → коммиты ветки не становятся предками `main`, и `git branch --merged`
их не видит: на замере 2026-07-15 он признал влитыми **9** удалённых веток из **42** реально
мёртвых. Не чистить по нему и не судить по нему о «невлитой работе» — источник истины
только состояние PR (`yarn repo:clean`). По той же причине удаление идёт через `git branch -D`,
а не `-d`: `-d` откажет на squash-мёрженной ветке.

Никогда не удалять: **персона-ветки** (`vesnin`, `ozhegov`, `boyarskiy`, `dynin` — канон
[`TASKS_MANAGEMENT.md` §7а](docs/TASKS_MANAGEMENT.md), живут между задачами, старый коммит
≠ заброшенность) и ветки без PR, которых нет на `origin` (единственная копия работы).

#### Git hygiene audit — контейнер и агент

Не писать самописный inventory веток и не класть audit-cache в корень. Канон:

| Что | Куда |
|-----|------|
| Entry агента | [`docs/audit/git/AGENT_PROMPT.md`](docs/audit/git/AGENT_PROMPT.md) |
| Контейнер | `docs/audit/git/` — `registry/` (снимки), `analysis/` (deep), `cache/` (gitignore) |
| Tooling | `yarn repo:branches` · skill `membrana-branch-audit`; `yarn repo:branches:decompose` · skill `membrana-branch-decompose` |
| Scenario A | реестр 7 категорий → overwrite `registry/BRANCHES_DECOMPOSE_LIST.md` (+ опционально dated `BRANCHES_DECOMPOSE_LIST-YYYY-MM-DD.md`) |
| Scenario B | deep по категории N → `analysis/…`; membership только из `registry/BRANCHES_DECOMPOSE_LIST.md` |

**Scenario B HARD GATE:** если в **текущем** сообщении нет явной категории (1–7 или ясное имя) → немедленный STOP: спросить какую из 1–7; **ничего** не писать в `analysis/`; **не** запускать `git diff`/churn. Запрещено угадывать из прошлых реплик сессии. Анализ — только после явной категории в этом сообщении.

`yarn repo:clean --execute` — только после явного ok человека (см. граблю dry-run выше).

#### Scripts container — один дом `scripts/`

Группа скриптов уже живёт в `scripts/`; органы GROUP_CONTAINERIZATION — **там же**,
не во втором audit-каталоге.

| Что | Куда |
|-----|------|
| Entry агента | [`scripts/AGENT_PROMPT.md`](scripts/AGENT_PROMPT.md) |
| Контракт | [`scripts/README.md`](scripts/README.md) |
| Реестр состава | `yarn scripts:registry --report` → `scripts/registry/SCRIPTS_LIST.md` (≡ `yarn tooling:overview --report`) |
| Cache | `scripts/cache/` (gitignore) |
| Kits | канон манифеста — Р3 / `docs/procedures/`; слой `kits/` спит до #761 |

#### Tasks registry audit — контейнер и агент

Аудит реестра задач — по тому же образцу; снимки и разборы не класть вне контейнера. Канон:

| Что | Куда |
|-----|------|
| Entry агента | [`docs/audit/tasks/AGENT_PROMPT.md`](docs/audit/tasks/AGENT_PROMPT.md) |
| Контейнер | `docs/audit/tasks/` — `registry/` (снимки), `analysis/` (deep + ревизии), `cache/` (gitignore) |
| Tooling | `yarn tasks:decompose` · skill `membrana-tasks-decompose`; `yarn tasks:audit` · skill `membrana-tasks-audit` |
| Scenario A | реестр категорий → `yarn tasks:decompose --report docs/audit/tasks/registry/TASKS_DECOMPOSE_LIST.md` (overwrite) |
| Scenario B | deep по категории N → `analysis/…`; membership только из `registry/TASKS_DECOMPOSE_LIST.md`; тот же HARD GATE, что у git-аудита |
| Scenario C | ревизия устаревших карточек → канон [`REGISTRY_AUDIT_PROMPT.md`](docs/prompts/REGISTRY_AUDIT_PROMPT.md); итог в `analysis/registry-audit-YYYY-MM-DD.md` |

Массовая архивация — слово владельца; каждая карточка — `task:archive --notes` со свидетельством (SHA/PR).

#### Windows-сессия (PowerShell 5.1) — канон

Владелец работает на Windows; PS 5.1 ломает то, что в bash проходит молча. Живые эпизоды 14–15.07:

- **`node -e` с JSON, `$(...)`, кавычками или переносами — только файлом в scratchpad**, не инлайном. PS-парсер съедает JSON-литерал (`register-epic` → `Unexpected token ':'`) и распознаёт `$(grep …)` как cmdlet (`send-swallow`). Однострочный `node -e` без спецсимволов — можно.
- **Here-string `@'…'@` — это PowerShell, а не bash.** В bash-инструменте он приезжает как литерал `@` и `commit-msg`-хук отбивает заголовок (живой случай 15.07). В bash — heredoc `<<'EOF'`.
- **`gh issue/pr --body`:** не bash-heredoc и не PS here-string в аргументе — только tempfile + `--body-file` (см. `yarn task:start`, `bootstrap-test-issues`).
- **PS 5.1 не знает `&&` / `||`** (parser error) — цепочка через `;` + `if ($?) { … }`.
- **Не редиректить stderr натива (`2>&1`)**: PS 5.1 заворачивает строки в `NativeCommandError` и `$?` становится `$false` при exit 0 — зелёный шаг выглядит красным.
- **`process.exit()` в скриптах — не использовать, только `process.exitCode`**: обрыв процесса с недописанным pipe-stdout роняет libuv ассертом `UV_HANDLE_CLOSING` и подменяет код возврата на **127** (поймано на `_ssh-panel-smoke`, тот же симптом у `code-review.mjs`).
- **Файлы для VDS пишутся с CRLF** — bash падает на `$'\r': command not found`. `yarn vds:run` снимает CRLF сам; при ручном scp — `sed -i 's/\r$//'`.

### Morning cold-start route

<!-- pin:START morning-wiring-agents -->
Утро холодной сессии: только скилл `membrana-morning-ritual` (live). Команды
`yarn morning-care` / `yarn ritual:day` — см. таблицу Key commands выше.
`membrana-developer-rhythm` утро не замещает.
<!-- pin:END morning-wiring-agents -->

### OpenCode operator commands

Operator workflows live in `.opencode/command/*.md` (auto-discovered) — thin wrappers over the `yarn` scripts above. Config: [`opencode.json`](./opencode.json) (`instructions: AGENTS.md`, `skills.paths: .opencode/skills`, `references.opencode-commands`). Sprint: `docs/prompts/OPENCODE_OPERATOR_WORKFLOWS_SPRINT_PROMPT.md` (Issue #183).

| Command | Wraps | Skill |
|---------|-------|-------|
| `/standup` | `yarn standup` | membrana-morning-ritual |
| `/main-day` | `yarn main-day-issue` | membrana-morning-ritual |
| `/ritual-evening` | `yarn ritual:evening` | membrana-developer-rhythm, membrana-code-review |
| `/full-ci` | `yarn turbo run lint typecheck test build --continue` | membrana-full-ci-operator |
| `/triage-issues` | `yarn issues:audit` | membrana-issue-triage |
| `/close-task <id>` | `yarn task:archive <id>` + `yarn task:close-github` | membrana-task-lifecycle |

Operator skills (`.opencode/skills/`): `membrana-client-module-guard` (`yarn check:boundaries`), `membrana-full-ci-operator`, `membrana-issue-triage`, `membrana-opencode-self-maintenance` (how to extend the `.opencode/` layer).

Operator skills — wave 2 (`docs/prompts/OPENCODE_OPERATOR_SKILLS_WAVE2_SPRINT_PROMPT.md`): `membrana-git-pr` (branches, scoped commits, lefthook, no secrets), `membrana-deploy-operator` (prod deploy navigator — wraps `cabinet:*:prod` / `device-board:deploy:prod` / `*:docker:prod:*`), `membrana-yarn-workspace` (corepack/Yarn 4/turbo gotchas), `membrana-security-review` (pre-merge checklist), `membrana-env-secrets-guard` (`.env`, proxy, keys, secrets hygiene).

### Gotchas for Cloud Agents

- **Yarn 4 via corepack**: The VM ships with Yarn Classic 1.x. The update script runs `corepack enable` which makes the `yarn` shim read `"packageManager"` from `package.json` and resolve to Yarn 4.x automatically. If `yarn -v` still shows `1.22.x`, run `corepack enable` manually.
- **`--immutable` installs**: The update script uses `yarn install --immutable`. If it fails, `yarn.lock` and `package.json` are out of sync — fix the lockfile (`yarn install` without `--immutable`) and commit the updated `yarn.lock` before pushing.
- **Turbo cache warmup**: The update script pre-builds library packages (`--filter='!@membrana/client'`) so the first `yarn turbo run lint typecheck test build --continue` is fast. The client is excluded because it depends on all libraries and rebuilds on every relevant change anyway.
- **No `.env` needed for client dev**: The client app starts without any environment variables. `background-office` needs `ANTHROPIC_API_KEY`, `LINEAR_API_KEY`, etc. — optional for client-only work. `background-media` is optional until web `remote-server` mode; without it the client uses IndexedDB/localStorage fallback.
- **RAG without OpenAI key**: Operative RAG in `yarn standup:dry`, `yarn code-review`, `yarn ask vesnin` works without `OPENAI_API_KEY`. Archive circuit (`yarn rag:index --full`, consilium archive) needs the key — see [`docs/RAG.md`](docs/RAG.md).
- **Anthropic env in worktrees**: agent scripts that import `scripts/_anthropic-env.mjs` load secrets from `MEMBRANA_ENV_PATH` first, then search upward for the nearest `.env`. This lets isolated worktrees under `.worktrees/` reuse the root `.env` without copying secrets. Do not duplicate or commit `.env` files inside worktrees.
- **Service builds are prerequisites**: `yarn typecheck` and `yarn test` depend on `^build` (builds of upstream packages). Turbo handles this automatically, so just run the top-level commands.
- **Audio features require a browser**: Microphone/audio modules need Web Audio API in a real browser. In headless Cloud Agent testing, expect "no device selected" or similar errors — this is normal.
- **Turbo output warnings are benign**: Warnings like `no output files found for task ... #test` are cosmetic; tests still run and report correctly.
- **Client module/plugin catalog**: Before editing `apps/client/src/modules/*` or `plugins/*`, read the catalog prompt from `docs/catalog/client/registry.json` → `promptPath` (see `docs/catalog/README.md`). CI runs `yarn catalog:verify-client`.
- **Deploy debug logs**: Do not save SSH/deploy script output to the repo root (`cabinet-recover*.txt`, `deploy-*.txt`, `prod-check.txt` via `Tee-Object` or shell redirect). Use `%TEMP%` / `$TMPDIR` instead; see `docs/CONTRIBUTING.md` → VPS deploy.
- **Client / Studio console**: см. [`docs/DESKTOP_APP_LOGGING_POLICY.md`](docs/DESKTOP_APP_LOGGING_POLICY.md). Support: `yarn desktop:support-collect`. Parse: `yarn logs:parse` / `yarn logs:parse:studio`.

### Intern onboarding

Всё что связано со стажёром — только через `docs/intern/`. Точка входа: [`docs/intern/README.md`](docs/intern/README.md).

| Файл | Для кого |
|------|---------|
| `INTERN_ONBOARDING_BACKGROUND_OFFICE.md` | стажёр — задачи T1/T2/T3, DoD, локальный запуск |
| `CURATOR_CHECKLIST.md` | куратор — статус Фазы 0, команды агент-верификации |
| `CURATOR_PHASE0_RUNBOOK.md` | куратор — пошаговый runbook с командами |
| `CURATOR_INTERN_ONBOARDING_PLAYBOOK.md` | куратор — фазы 0–5, ворота перехода |
| `AGENT_PROMPT_PHASE0_SCAFFOLD.md` | агент — промпт для файловой части Фазы 0 |

Агент **не** трогает: branch protection/rulesets, права коллабораторов, ключи, реальный `.env`, выбор темы дайджеста.

---

## Imported Claude Cowork project instructions
