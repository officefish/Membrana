---
name: membrana-yarn-workspace
description: "Yarn 4 / corepack / Turbo monorepo gotchas for Membrana: corepack enable to get Yarn 4 (not Classic 1.x), yarn install --immutable lockfile sync, and the turbo ^build prerequisite (typecheck/test depend on upstream builds). Use when yarn install fails, the build graph is confusing, yarn -v shows 1.22, lockfile is out of sync, or the user mentions corepack, immutable, Yarn 4, turbo cache, or workspace deps. Do NOT use for running the full CI (membrana-full-ci-operator) or package import boundaries (membrana-client-module-guard)."
---
# Membrana yarn / workspace gotchas

Канон: [`AGENTS.md` § Gotchas for Cloud Agents](../../../AGENTS.md) · корневой `package.json` (`packageManager`).

**Владелец:** **Математик (Dynin)** — вторично Linux/ops/скрипты.

## When to use

- `yarn install` падает; `yarn -v` показывает `1.22.x`; lockfile рассинхрон.
- Непонятен turbo-граф сборки (почему `typecheck`/`test` тянут build).
- Пользователь: «corepack», «immutable», «Yarn 4», «turbo cache», «workspace deps».

## When NOT to use

- Полный CI-прогон → `membrana-full-ci-operator`.
- Границы импортов пакетов → `membrana-client-module-guard`.

## Gotchas (из AGENTS.md — не дублировать, держать в синхроне)

| Симптом | Причина | Фикс |
|---------|---------|------|
| `yarn -v` = `1.22.x` | corepack не активен | `corepack enable` (читает `packageManager` → Yarn 4.x) |
| `--immutable` install падает | `yarn.lock` ≠ `package.json` | `yarn install` (без `--immutable`) → закоммить `yarn.lock` |
| `typecheck`/`test` «не видит» апстрим | service builds — prerequisite (`^build`) | запускай top-level turbo; не обходи граф |
| Первый CI медленный | холодный turbo-кэш | пре-билд библиотек (`--filter='!@membrana/client'`) |

## Commands

| Goal | Command |
|------|---------|
| Активировать Yarn 4 | `corepack enable` |
| Install (CI) | `yarn install --immutable` |
| Install (fix lockfile) | `yarn install` |
| Прогрев кэша | `yarn turbo run build --filter='!@membrana/client'` |

## Инвариант

- Не клиентского `.env` для client dev не нужно; `background-office` требует `ANTHROPIC_API_KEY`/`LINEAR_API_KEY` — см. `membrana-env-secrets-guard`.
