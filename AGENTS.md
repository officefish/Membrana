# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Membrana is a TypeScript monorepo using **Yarn 4 (Berry)** workspaces + **Turborepo**. The main application is `apps/client` (Vite + React + DaisyUI), with shared packages in `packages/` and autonomous services in `packages/services/`. An optional NestJS backend lives in `packages/background-office`.

For detailed architecture, conventions, and coding rules, see `.cursorrules` and `docs/ARCHITECTURE.md`, `docs/SERVICES.md`, `docs/DESIGN.md`, `docs/CONTRIBUTING.md`.

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
| Morning checks (proxy, git, script tests, Anthropic) | `yarn morning-care` (без API: `--no-anthropic`) |
| Daily standup (plan + review + issues → один документ) | `yarn standup` (после `yarn plan:day` и `yarn code-review`; dry: `yarn standup:dry`) |

### Gotchas for Cloud Agents

- **Yarn 4 via corepack**: The VM ships with Yarn Classic 1.x. The update script runs `corepack enable` which makes the `yarn` shim read `"packageManager"` from `package.json` and resolve to Yarn 4.x automatically. If `yarn -v` still shows `1.22.x`, run `corepack enable` manually.
- **`--immutable` installs**: The update script uses `yarn install --immutable`. If it fails, `yarn.lock` and `package.json` are out of sync — fix the lockfile (`yarn install` without `--immutable`) and commit the updated `yarn.lock` before pushing.
- **Turbo cache warmup**: The update script pre-builds library packages (`--filter='!@membrana/client'`) so the first `yarn turbo run lint typecheck test build --continue` is fast. The client is excluded because it depends on all libraries and rebuilds on every relevant change anyway.
- **No `.env` needed for client dev**: The client app starts without any environment variables. The `background-office` backend requires `ANTHROPIC_API_KEY`, `LINEAR_API_KEY`, etc. — but it is optional for client development.
- **Service builds are prerequisites**: `yarn typecheck` and `yarn test` depend on `^build` (builds of upstream packages). Turbo handles this automatically, so just run the top-level commands.
- **Audio features require a browser**: Microphone/audio modules need Web Audio API in a real browser. In headless Cloud Agent testing, expect "no device selected" or similar errors — this is normal.
- **Turbo output warnings are benign**: Warnings like `no output files found for task ... #test` are cosmetic; tests still run and report correctly.
