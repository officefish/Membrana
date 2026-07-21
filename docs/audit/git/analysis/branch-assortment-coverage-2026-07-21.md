# Карта покрытия ассортимента — 2026-07-21

## Meta

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Sprint | `branch-assortment-sprint` Ф2 (#804) · lead **dynin** |
| Registry | [`BRANCHES_DECOMPOSE_LIST.md`](../registry/BRANCHES_DECOMPOSE_LIST.md) |
| Push history | [`branch-push-history-2026-07-21.md`](./branch-push-history-2026-07-21.md) |
| Base SHA | `944d1172` |

Предикат: жанр **закрыт**, если в живом реестре (cat.1–7) есть осмысленный
представитель; иначе **дыра**. Представитель — для ревью/рефактора спринта, не для GC.

## Summary

| Группа | Закрыто | Дыры |
|--------|--------:|-----:|
| kind | 5 | 0 (`feature` — отказ, не дыра) |
| формат | 5 | 3 (`cowork` live, `research`, `hackathon`) |
| держатель | 3 | 0 |
| доставка | 5 | 0 (zombie=0 — пусто, не дыра покрытия) |
| деревья | 2 | 0 |

## Kind

| Жанр | Статус | Представитель |
|------|--------|---------------|
| `feat` | ✅ | `feat/pl-r3-boundary` (wt) · `feat/skill-truth-crystallization` (PR #575) |
| `fix` | ✅ | `fix/adr-0013-accepted` (wt) · `vesnin/fix/consilium-premises-gate` (salvage) |
| `docs` | ✅ | `docs/audit-git-container-followup` (current) · `docs/board-refactor-update` (PR #517) |
| `chore` | ✅ | `chore/graphify-public-graph` (PR #525) · `vesnin/chore/procedural-layer-sprint-start` |
| `tooling` | ✅ | `tooling/meeting-consilium-voice` (wt) |
| `feature` | ⛔ отказ | дубль; живые: `feature/sbc-s1-registry`, `feature/scripts-boundary-container` — не канон Р4 |

## Формат

| Жанр | Статус | Представитель |
|------|--------|---------------|
| `storm` | ✅ | `angelina/storm/branch-taxonomy-2026-07-21` |
| `meeting` | ✅ | `vesnin/meeting/procedural-layer` · `…-m2a` |
| `cowork` | ⚠ дыра live | leftover cowork снесён GC; **дыра в живых** — нет ветки `cowork/*` в registry |
| `comp` | ✅ leftover | `comp/comp-detection-alarm-2026-07-10/alpha` · `gamma` |
| `night` / `night-hunt` | ✅ | PR #759/#709 · leftover `night/graphify-…` · `origin/night/agent-context-…` |
| `truth` | ✅ | `truth/crystallization-20-07-worktree` (wt) |
| `sprint` | ✅ | `sprint/ritual-step-manifest-sf` (salvage) |
| `research` | ❌ дыра | нет ветки с префиксом/сегментом research в живом registry |
| `hackathon` | ❌ дыра | формат в FORMATS есть; веток нет |

## Держатель

| Жанр | Статус | Представитель |
|------|--------|---------------|
| persona-prefix | ✅ | `angelina/*`, `vesnin/*` (salvage) · персоны §7а `ozhegov`/`dynin` |
| long-lived task | ✅ | `developer-rhythm-lifecycle` (wt) |
| карточка = slug | ✅ | `linear-tasks-gear` (salvage) · `docs/audit-git-container-followup` |

## Доставка (hygiene × ассортимент)

| Жанр | Статус | Представитель |
|------|--------|---------------|
| open PR | ✅ | cat.4 (6 веток) |
| salvage | ✅ | cat.7 (22) |
| leftover | ✅ | cat.5 (6) |
| persona | ✅ | cat.2 |
| baseline `base/*` | ✅ | cat.3 |
| zombie | ✅ пусто | cat.6 = 0 (не дыра покрытия) |

## Деревья

| Жанр | Статус | Представитель / сигнал |
|------|--------|-------------------------|
| canon wt | ✅ | `main` + `base/*` · worktrees Membrana / -tooling / -product / -codex / -cursor |
| sprint-open | ✅ | wt: `feat/pl-r3-boundary`, `feature/sbc-s1-registry`, `docs/audit-git-container-followup` |

## Дыры → что иметь в виду на рефакторе спринта / CR

1. **`cowork`** — формат жив в регламенте, живых веток нет после GC; для CR брать archived PR / day-sprint артефакты, не cat.5.
2. **`research` / `hackathon`** — в истории слабые; при появлении работы — сразу грамматика Р4, не ждать «привычного» префикса.
3. **`feature/*`** — много live, но вне словаря kind; линза ревью должна помечать как MISSING/доработка (Р4), не как нормальный kind.

## Связь с hygiene

Ассортимент **читает** membership из Scenario A; не заменяет cat.1–7 и не легализует delete.
