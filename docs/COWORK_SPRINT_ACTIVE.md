# Cowork Sprint Active

| Поле | Значение |
|------|----------|
| **status** | `closed` — Phase 5 закрыта 2026-08-09 (`cowork:close`) |
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
| current phase | **4 — Integration** |
| integration deadline | 2026-08-14 fallback |

## Blocks

| Блок | Ветка | Worktree | Фаза | Готовность |
|------|-------|----------|------|------------|
| `registry-contract` | `cowork/cowork-static-registry-read-api/registry-contract` | `.worktrees/Membrana-registry-contract` | freeze | `cbba747e`; 24/24 tests + lint + typecheck |
| `registry-index` | `cowork/cowork-static-registry-read-api/registry-index` | `.worktrees/Membrana-registry-index` | freeze | `d09dc34a`; 14/14 tests + build + typecheck |
| `read-api` | `cowork/cowork-static-registry-read-api/read-api` | `.worktrees/Membrana-read-api` | freeze | `44630395`; 8/8 tests + lint + typecheck |

Integration-ветка: `cowork/cowork-static-registry-read-api/integration` в
`.worktrees/static-container-meeting-delivery`.

## Phase Ledger

| Фаза | Статус | Evidence |
|------|--------|----------|
| 0 — Brief + open | **closed** | brief ратифицирован; PR #1827 merged; четыре ветки и три worktree созданы от одного BASE_SHA |
| 1 — Concept | **closed** | 3/3: `bfb1dcd5`, `099255c0`, `44536a48`; изоляция заявлена всеми командами, блокеров нет |
| 2 — Isolated build | **closed** | `ready(A) && ready(B) && ready(C)`; три freeze-тега отправлены на exact SHA |
| 3 — Interface Consilium | **closed** | 3/3 `ACCEPT-WITH-ADAPTERS`; `INTERFACE_CONTRACT.md`; S-C2 не наступил |
| 4 — Integration | **open** | review SHA `0852fdad` дал BLOCK; CI SHA `d039833e` затем поймал промежуточный `tsc`-выход static-registry в образе; исправлен порядок runtime-сборки, новый SHA ждёт проверки |
| 5 — Merge + archive | pending | PR #1828 открыт; retrospective готова; повторный exact-SHA review, CI, merge и archive ещё не подтверждены |

## Isolation Guard

- Блоки не читают чужие ветки и чужие `EXPECTATIONS.md` до Phase 3.
- Merge/rebase/cherry-pick между block-ветками запрещены до Interface Consilium.
- Общие wiring-файлы и task registry меняет только coordinator в Phase 4.
- Стабы живут в файловой зоне блока и не входят в production graph.
- Нарушение фиксируется как `compromised`, а не скрывается и не выбрасывает блок.

### Process breach для первого разбора Phase 3

После сдачи Phase 1 координатор одновременно прочитал три первых `EXPECTATIONS.md`, хотя
регламент назначает их первое вскрытие только Interface Consilium после Phase 2. Команды не
читали чужие материалы и не получили сведений о соседях, поэтому их реализации остались
изолированными; нарушен момент вскрытия у координатора. Факт идёт первым вопросом консилиума и
обязательной строкой `RETROSPECTIVE.md`.

## Central Task Guard

`static-mmbrn-live-inventory` остаётся отдельной active ops-задачей и не исполняется этим
коворком. Остальные узлы EPIC остаются в `docs/meeting/static-mmbrn-container/DEPS.json`.
Проверка: `node scripts/meeting-status.mjs --id static-mmbrn-container`.

---

## Закрытие Phase 5 — `cowork:close` 2026-08-09

Спринт **`cowork-static-registry-read-api`** закрыт предикатом, а не памятью человека: контракт и ретроспектива на месте, блокирующих находок нет.

Неблокирующие находки, оставленные явно (закрытие флага из-за них не роняется):

- находок незакрытости нет

**Что этот шаг НЕ утверждает:** качество сведения блоков машине недоступно. Пустой список находок означает «признаков незакрытости не найдено», а не «коворк закрыт хорошо».
