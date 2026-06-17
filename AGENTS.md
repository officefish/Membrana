# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Membrana is a TypeScript monorepo using **Yarn 4 (Berry)** workspaces + **Turborepo**. The main application is `apps/client` (Vite + React + DaisyUI), with shared packages in `packages/` and autonomous services in `packages/services/`. Optional NestJS backends live in `packages/background-*`:

- **`background-office`** — integrations (Claude, Linear, GitHub); stateless; `yarn office:dev` (port 3000).
- **`background-media`** — web data-plane: sample library blobs (multi-format audio) + trends templates per `deviceId`; NestJS+Fastify, Prisma+PostgreSQL, blob volume; epic #58; `yarn media:db:up` → `yarn media:migrate` → `yarn media:dev` (port 3010).

Do **not** put WAV storage or user templates in office. Do **not** put Claude/Linear in media. See `docs/BACKGROUND_SERVERS.md`.

For detailed architecture, conventions, and coding rules, see `.cursorrules` and `docs/ARCHITECTURE.md`, `docs/BACKGROUND_SERVERS.md`, `docs/SERVICES.md`, `docs/DESIGN.md`, `docs/CONTRIBUTING.md`.

For **new M/L agent tasks**, follow `docs/prompts/TASK_PROMPT_WORKFLOW.md` and register in `docs/tasks/registry.json`. **Closing a task:** `docs/prompts/TASK_CLOSURE_REGULATION.md` → `yarn task:archive <id>` (day) → `yarn task:close-github` (EOD batch for Issues). Active/archive: `docs/tasks/README.md`.

### Key commands

All standard dev commands are documented in the root `README.md` and `package.json`:

| Task | Command |
|------|---------|
| Install deps | `yarn install` |
| Dev server (client) | `yarn workspace @membrana/client dev` (port 5173) |
| Lint | `yarn lint` |
| Typecheck | `yarn typecheck` |
| Test | `yarn test` |
| Build all | `yarn build` |
| Dev all (Turbo) | `yarn dev` |
| Full CI pipeline | `yarn turbo run lint typecheck test build --continue` (34 tasks) |
| Morning checks (proxy, git, script tests, Anthropic) | `yarn morning-care` (без API: `--no-anthropic`; переключает на ветку **`techies68`**) |
| Daily standup (план + вчерашнее ревью + issues) | `yarn standup` (после `yarn plan:day`; **не** после `code-review`; dry: `yarn standup:dry`) |
| Вечер (архив дня + ревью) | `yarn archive:daily-day` → `yarn code-review` → `yarn save-code-review`; цепочка: `yarn ritual:evening` |
| Архив утренних артефактов (вечер, до code-review) | `yarn archive:daily-day` → `docs/archive/daily-day/<YYYY-MM-DD>/` |
| Code-review (вечер) | `yarn code-review` → `docs/DAILY_CODE_REVIEW.md`; утром только читается |
| Вечер одной командой | `yarn ritual:evening` (= archive:daily-day + code-review + save-code-review) |
| Night Build (после вечера) | `yarn night:open --id <epic-id>` → агент → `yarn night:close`; регламент: `docs/NIGHT_SPRINT_REGULATION.md` |
| Центральная задача дня (после standup) | `yarn main-day-issue` → `docs/MAIN_DAY_ISSUE.md`; буфер: `docs/CURRENT_TASK.md`; `yarn ritual:day` |
| Ритм утро/вечер/неделя (полный регламент) | см. `docs/DEVELOPER_RHYTHM.md` |

### Gotchas for Cloud Agents

- **Yarn 4 via corepack**: The VM ships with Yarn Classic 1.x. The update script runs `corepack enable` which makes the `yarn` shim read `"packageManager"` from `package.json` and resolve to Yarn 4.x automatically. If `yarn -v` still shows `1.22.x`, run `corepack enable` manually.
- **`--immutable` installs**: The update script uses `yarn install --immutable`. If it fails, `yarn.lock` and `package.json` are out of sync — fix the lockfile (`yarn install` without `--immutable`) and commit the updated `yarn.lock` before pushing.
- **Turbo cache warmup**: The update script pre-builds library packages (`--filter='!@membrana/client'`) so the first `yarn turbo run lint typecheck test build --continue` is fast. The client is excluded because it depends on all libraries and rebuilds on every relevant change anyway.
- **No `.env` needed for client dev**: The client app starts without any environment variables. `background-office` needs `ANTHROPIC_API_KEY`, `LINEAR_API_KEY`, etc. — optional for client-only work. `background-media` is optional until web `remote-server` mode; without it the client uses IndexedDB/localStorage fallback.
- **Service builds are prerequisites**: `yarn typecheck` and `yarn test` depend on `^build` (builds of upstream packages). Turbo handles this automatically, so just run the top-level commands.
- **Audio features require a browser**: Microphone/audio modules need Web Audio API in a real browser. In headless Cloud Agent testing, expect "no device selected" or similar errors — this is normal.
- **Turbo output warnings are benign**: Warnings like `no output files found for task ... #test` are cosmetic; tests still run and report correctly.
- **Client module/plugin catalog**: Before editing `apps/client/src/modules/*` or `plugins/*`, read the catalog prompt from `docs/catalog/client/registry.json` → `promptPath` (see `docs/catalog/README.md`). CI runs `yarn catalog:verify-client`.
