# Промпт: S2 — инструменты пишут в scripts/registry (--report)

> Размер **M**. Реестр: `sbc-s2-tools-report` · Issue #794 · Lead: **vesnin** · Parent: `scripts-boundary-container`.

## Цель

Детерминированная команда с `--report` пишет канонический реестр в `scripts/registry/` сама
(как `repo:branches:decompose --report`).

Канон: `yarn tooling:overview --report` ≡ `yarn scripts:registry --report`
(общий `writeScriptsRegistryReport`). Stdout overview для людей не ломать и не коммитить в AGENTS.

## Запрещено

Писать report в корень / `docs/archive/`; ломать существующий stdout overview для людей;
коммитить вывод overview как «инвентарь в AGENTS».

## DoD

- [x] `--report` → `scripts/registry/SCRIPTS_LIST.md` (`tooling:overview` + `scripts:registry`).
- [x] Пункт 5 чеклиста в `scripts/README` → ✅.
- [x] Тест/smoke на запись отчёта (`tooling-overview.test.mjs`).
- [x] LGTM vesnin.
