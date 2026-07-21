# Промпт: S2 — инструменты пишут в scripts/registry (--report)

> Размер **M**. Реестр: `sbc-s2-tools-report` · Issue #794 · Lead: **vesnin** · Parent: `scripts-boundary-container`.

## Цель

Детерминированная команда (расширение `tooling:overview` или соседний yarn-скрипт) с `--report`
пишет канонический реестр в `scripts/registry/` сама (как `repo:branches:decompose --report`).

## Запрещено

Писать report в корень / `docs/archive/`; ломать существующий stdout overview для людей.

## DoD

- [ ] `--report` (или эквивалент) → `scripts/registry/SCRIPTS_LIST.md`.
- [ ] Пункт 5 чеклиста в `scripts/README` → ✅.
- [ ] Тест/smoke на запись отчёта.
- [ ] LGTM vesnin.
