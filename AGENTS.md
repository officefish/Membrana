# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Membrana is a TypeScript monorepo using **Yarn 4 (Berry)** workspaces + **Turborepo**. The main application is `apps/client` (Vite + React + DaisyUI), with shared packages in `packages/` and autonomous services in `packages/services/`. An optional NestJS backend lives in `packages/background-office`.

For detailed architecture, conventions, and coding rules, see `.cursorrules` and `docs/ARCHITECTURE.md`, `docs/SERVICES.md`, `docs/DESIGN.md`, `docs/CONTRIBUTING.md`.

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

### Gotchas for Cloud Agents

- **Yarn 4 via corepack**: The VM ships with Yarn Classic. The update script activates Yarn 4 via `corepack enable && corepack prepare yarn@4.5.0 --activate`. If `yarn --version` doesn't show `4.x`, run those commands manually.
- **No `.env` needed for client dev**: The client app starts without any environment variables. The `background-office` backend requires `ANTHROPIC_API_KEY`, `LINEAR_API_KEY`, etc. — but it is optional for client development.
- **Service builds are prerequisites**: `yarn typecheck` and `yarn test` depend on `^build` (builds of upstream packages). Turbo handles this automatically, so just run the top-level commands.
- **Audio features require a browser**: Microphone/audio modules need Web Audio API in a real browser. In headless Cloud Agent testing, expect "no device selected" or similar errors — this is normal.
- **Turbo output warnings are benign**: Warnings like `no output files found for task ... #test` are cosmetic; tests still run and report correctly.
