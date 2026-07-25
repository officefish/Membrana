# OPEN: membrana-leveling-adopt — кросс-агентский skill + soft evening

| Поле | Значение |
|------|----------|
| **Sprint** | `membrana-leveling-adopt-2026-07` |
| **Registry epic** | `membrana-leveling-adopt` |
| **Status** | **closed** → [`CLOSURE.md`](./CLOSURE.md) |
| **Kind** | day-sprint (эпик L + фазы S/M) |
| **Lead epic** | ozhegov |
| **Craft** | vesnin (wires / evening / deliver / pilot) |
| **Started** | 2026-07-25 |
| **Стык** | Focus [`tasks-workshop`](../tasks-workshop-2026-07/OPEN.md) **не затирать** — только Also open (ATF4-2) |

**Промпт эпика:** [`MEMBRANA_LEVELING_ADOPT_SPRINT_PROMPT.md`](../../prompts/MEMBRANA_LEVELING_ADOPT_SPRINT_PROMPT.md)

**Also open pointer:** [`DAY_SPRINT_ACTIVE.md`](../../DAY_SPRINT_ACTIVE.md) → Also open.

---

## Цель

Adopt процедуры membrana-leveling как официальный skill (Cursor / Claude / OpenCode),
снимок dirty→ctx, мягкий шаг вечера с отчётом, шов к HANDOFF. Ядро §8.1–§8.3 уже в
`main` — **не** переписывать disposition / гейт.

## Замок

1. Вечер — **soft-first** (`criticality: noncritical` + finding-exit на STOP).
2. Ритуал main-fill = **план очереди**; реальный `pr:ship` — только из скилла после «ок» владельца.
3. Канон скилла: `.cursor/skills/membrana-leveling/SKILL.md`.

## Положение шага вечера

Шаг **`leveling-workspace`** в [`evening-ritual-steps.json`](../../tasks/evening-ritual-steps.json):
после `insight-drift`, **до** `code-review`. Скрипт: `scripts/membrana-leveling-evening.mjs`
(snapshot → gate plan-only → отчёт).

Артефакт: `docs/seanses/workspace-level-<YYYY-MM-DD>.md` (+ копия под
`docs/archive/daily-day/<date>/` если каталог уже есть).

## Phases

| Phase | Registry id | size | lead | Status |
|-------|-------------|------|------|--------|
| **g0** | `ml-adopt-g0` | S | ozhegov | **done** |
| **skill** | `ml-adopt-skill` | M | ozhegov | **done** |
| **wires** | `ml-adopt-wires` | M | vesnin | **done** |
| **evening** | `ml-adopt-evening` | M | vesnin | **done** |
| **deliver** | `ml-adopt-deliver` | S | vesnin | **done** |
| **rhythm** | `ml-adopt-rhythm` | S | ozhegov | **done** |
| **pilot** | `ml-adopt-pilot` | S | vesnin | **done** |

## Вне scope

Hard-gate вечера · авто-merge · UI утра · `#900` segmentHash · пересмотр T1–T13.
