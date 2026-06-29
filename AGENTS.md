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
| Morning checks (proxy, git, script tests, Anthropic) | `yarn morning-care` (без API: `--no-anthropic`; переключает на ветку **`techies68`**) |
| Daily standup (план + вчерашнее ревью + issues) | `yarn standup` (после `yarn plan:day`; **не** после `code-review`; dry: `yarn standup:dry`) |
| Вечер (архив дня + ревью) | `yarn archive:daily-day` → incremental RAG index (non-blocking) → `yarn code-review` → `yarn save-code-review` → `yarn task:close-github` → `yarn team-evening-feedback`; цепочка: `yarn ritual:evening` |
| Архив утренних артефактов (вечер, до code-review) | `yarn archive:daily-day` → `docs/archive/daily-day/<YYYY-MM-DD>/` |
| Code-review (вечер) | `yarn code-review` → `docs/DAILY_CODE_REVIEW.md`; PR: `yarn code-review:pr -- <N>`; утром только читается |
| Team Evening Feedback (вечер) | `yarn team-evening-feedback` → `docs/seanses/team-evening-feedback-<date>.md`; dry: `yarn team-evening-feedback:dry`; регламент: [`TEAM_EVENING_FEEDBACK_REGULATION.md`](docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md) |
| Вечер одной командой | `yarn ritual:evening` (= archive:daily-day + rag:index:incremental + code-review + save-code-review + task:close-github + team-evening-feedback) |
| Night Build (после вечера) | `yarn night:open --id <epic-id>` → агент → `yarn night:close`; регламент: `docs/NIGHT_SPRINT_REGULATION.md` |
| Центральная задача дня (после standup) | `yarn main-day-issue` → `docs/MAIN_DAY_ISSUE.md`; буфер: `docs/CURRENT_TASK.md`; `yarn ritual:day` |
| Ритм утро/вечер/неделя (полный регламент) | см. `docs/DEVELOPER_RHYTHM.md` |

### OpenCode operator commands

Operator workflows live in `.opencode/command/*.md` (auto-discovered) — thin wrappers over the `yarn` scripts above. Config: [`opencode.json`](./opencode.json) (`instructions: AGENTS.md`, `skills.paths: .opencode/skills`, `references.opencode-commands`). Sprint: `docs/prompts/OPENCODE_OPERATOR_WORKFLOWS_SPRINT_PROMPT.md` (Issue #183).

| Command | Wraps | Skill |
|---------|-------|-------|
| `/standup` | `yarn standup` | membrana-developer-rhythm |
| `/main-day` | `yarn main-day-issue` | membrana-developer-rhythm |
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
