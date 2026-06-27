---
name: membrana-full-ci-operator
description: "Runs the full Membrana CI pipeline locally: yarn turbo run lint typecheck test build (with --filter, --continue, --no-cache strategy), interprets failures, and respects the service-build prerequisite (typecheck/test depend on ^build). Use before merge, when the user says full CI, прогнать CI, lint typecheck test build, green CI, or wants a pre-PR gate. Do NOT use for package-boundary-only checks (membrana-client-module-guard) or evening code review (membrana-code-review)."
---
# Membrana full CI operator

Канон: корневой [`package.json`](../../../package.json) turbo-скрипты · [`AGENTS.md`](../../../AGENTS.md) § builds.

**Владелец:** **Teamlead** — гейт перед merge; зелёный CI обязателен для LGTM.

## When to use

- Перед merge / PR — полный прогон `lint typecheck test build`.
- Пользователь: «full CI», «прогнать CI», «green CI», «pre-PR gate».

## When NOT to use

- Только границы пакетов → `membrana-client-module-guard`.
- Вечернее daily-ревью diff'а → `membrana-code-review`.
- Точечные detector-тесты → `yarn test:detectors`.

## Commands

| Goal | Command |
|------|---------|
| Полный CI (не падать на первом фейле) | `yarn turbo run lint typecheck test build --continue` |
| Чистый прогон (без кэша) | `yarn turbo run lint typecheck test build --no-cache --continue` |
| По пакетам | `yarn turbo run lint typecheck test build --filter=@membrana/<pkg>` |
| Только lint / typecheck / test | `yarn lint` · `yarn typecheck` · `yarn test` |

## Важно (из AGENTS.md)

- **Service builds — prerequisite:** `typecheck` и `test` зависят от `^build` upstream-пакетов. Turbo разрешает это автоматически — запускай top-level команды, не обходи граф.
- Headless-ограничения (нет аудио-устройства) — **не** блокер CI; помечай как known.

## Agent workflow

1. Запусти `yarn turbo run lint typecheck test build --continue`.
2. Собери список фейлов по пакетам (turbo печатает per-task summary).
3. Для нестабильных кэш-фейлов — повтори с `--no-cache --filter=<pkg>`.
4. Зелёный полный прогон = гейт LGTM (зафиксируй в DoD PR).

## Output

- Сводка: какие пакеты green/red; для red — первая значимая ошибка и пакет.
