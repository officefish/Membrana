# Cowork Sprint Active

| Поле | Значение |
|------|----------|
| **status** | `open` |
| sprintId | `cowork-static-registry-read-api` |
| brief | [`COWORK_SPRINT_BRIEF.md`](./cowork-sprint/cowork-static-registry-read-api/COWORK_SPRINT_BRIEF.md) |
| task carrier | `cowork-static-registry-read-api` |
| исполняемая фаза | `static-mmbrn-registry-read-api` (`#1303-A`) |
| root epic | `static-mmbrn-container` |
| BASE_SHA | `322501efb24854a848d9cf726d57c99cdc271a1a` |
| openedAt | 2026-08-09 |
| owner cut ratification | 2026-08-09 — «ратифицирую» |
| preparation delivery | PR #1827, merged as `322501ef` |
| preparation review | T2 LGTM, reviewed SHA `8c82c5031c42ef2e4087fccfc11d8776a2894d70` |
| current phase | **2 — Isolated build** |
| integration deadline | 2026-08-14 fallback |

## Blocks

| Блок | Ветка | Worktree | Фаза | Готовность |
|------|-------|----------|------|------------|
| `registry-contract` | `cowork/cowork-static-registry-read-api/registry-contract` | `.worktrees/Membrana-registry-contract` | 2 | concept `bfb1dcd5`; isolated build до собственного DoD |
| `registry-index` | `cowork/cowork-static-registry-read-api/registry-index` | `.worktrees/Membrana-registry-index` | 2 | concept `099255c0`; isolated build до собственного DoD |
| `read-api` | `cowork/cowork-static-registry-read-api/read-api` | `.worktrees/Membrana-read-api` | 2 | concept `44536a48`; isolated build до собственного DoD |

Integration-ветка: `cowork/cowork-static-registry-read-api/integration` в
`.worktrees/static-container-meeting-delivery`.

## Phase Ledger

| Фаза | Статус | Evidence |
|------|--------|----------|
| 0 — Brief + open | **closed** | brief ратифицирован; PR #1827 merged; четыре ветки и три worktree созданы от одного BASE_SHA |
| 1 — Concept | **closed** | 3/3: `bfb1dcd5`, `099255c0`, `44536a48`; изоляция заявлена всеми командами, блокеров нет |
| 2 — Isolated build | **open** | каждый блок проходит собственный DoD на исполняемых стабах; scoped CI обязателен |
| 3 — Interface Consilium | pending | только после `ready(A) && ready(B) && ready(C)` либо deadline |
| 4 — Integration | pending | coordinator, adapters, без переписывания блоков |
| 5 — Merge + archive | pending | один integration PR, exact-SHA review, merge, retrospective |

## Isolation Guard

- Блоки не читают чужие ветки и чужие `EXPECTATIONS.md` до Phase 3.
- Merge/rebase/cherry-pick между block-ветками запрещены до Interface Consilium.
- Общие wiring-файлы и task registry меняет только coordinator в Phase 4.
- Стабы живут в файловой зоне блока и не входят в production graph.
- Нарушение фиксируется как `compromised`, а не скрывается и не выбрасывает блок.

## Central Task Guard

`static-mmbrn-live-inventory` остаётся отдельной active ops-задачей и не исполняется этим
коворком. Остальные узлы EPIC остаются в `docs/meeting/static-mmbrn-container/DEPS.json`.
Проверка: `node scripts/meeting-status.mjs --id static-mmbrn-container`.
