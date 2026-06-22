# Consilium: Night Build — device-board post-competition tech debt

> **Дата:** 2026-06-21 (вечер, после `yarn ritual:evening`)
> **Входы:** `DAILY_CODE_REVIEW.md`, архив review 2026-06-19…20, `COMPETITION_SPRINT_ACTIVE.md`, `MAIN_DAY_ISSUE.md` (2026-06-18, stale), `NIGHT_SPRINT_REGULATION.md`
> **Решение:** открыть Night Build `device-board-post-comp-debt-night-build` (NB0–NB3)
> **Промпт:** [`DEVICE_BOARD_POST_COMP_DEBT_NIGHT_BUILD_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_POST_COMP_DEBT_NIGHT_BUILD_EPIC_PROMPT.md)

---

## [Teamlead — Vesnin]

**Синтез входов:**

| Документ | Ключевое |
|----------|----------|
| DAILY_CODE_REVIEW 2026-06-21 | Phase 2b LGTM условное; runtime debt R1–R4 |
| CR archive 2026-06-20 | device-board-shell lint warnings; смешение эпик (recording vs observation) — **уже разведено** |
| CR archive 2026-06-19 | gitignore hygiene — **закрыто** crdc-d5 |
| code-review-debt jun2026 | **archived** D0–D6, Issue #126 |
| Competition sprint | RUN-01 ✅; merge deferred (POL-01) — **не night scope** |
| MAIN_DAY_ISSUE | **устарел** (2026-06-18) — утром `yarn ritual:day` |

**Стратегическое решение:** Ночью закрываем **инфраструктурный хвост competition sprint** — документирование runtime, DRY audit, lint/a11y — без winner merge и без core/agenda. Это разблокирует утренний LGTM на PR с uncommitted work (~60 файлов device-board).

**Epic ID:** `device-board-post-comp-debt-night-build`

**Out of scope ночи:** POL-01, CAT-01, перенос catalog-service в packages/services, prod.

---

## [Структурщик — Ozhegov]

**Матрица долга → фазы:**

| Риск | NB | Действие |
|------|-----|----------|
| R1 exec-successor / function-call-resolve | NB1 | Таблица overlap + refactor pure fns |
| R6 untracked files | NB0 | `git add`, один commit gate |
| R4 usercase.mjs side-effects | NB3 | Path guard + verify-all |
| R5 shell useMemo | NB0 | `scenarioCanvas` wrap |
| R2 CONCEPT gap | NB2 | Runtime diagram |

**Baseline сейчас:** `@membrana/device-board` test **399/399**, lint **5 warnings** (не errors).

**Stop rule:** 2 CI fail → handoff. Любой import cycle runtime ↔ graph → stop, Vesnin review.

---

## [Математик — Dynin]

—

Runtime не трогает FFT/спектр. Если NB1 refactor затронет `resolve-input` — только regression tests, без новых алгоритмов.

---

## [Музыкант]

—

UserCase alpha/beta/gamma без audio-нод. Музыкант не нужен этой ночью.

---

## [Верстальщик — Rodchenko]

**NB3 lead:** `board-usercase-picker-modal.tsx`

Чеклист DESIGN.md:
- [ ] Focus trap в modal
- [ ] Escape закрывает без потери focus
- [ ] `aria-labelledby` / `aria-describedby`
- [ ] Keyboard: Tab cycle, Enter на apply

**NB0 support:** `device-board-shell.tsx` useMemo — 5 warnings, ~30 min.

---

## Итоговый артефакт

| Артефакт | Путь |
|----------|------|
| Epic prompt | `docs/prompts/DEVICE_BOARD_POST_COMP_DEBT_NIGHT_BUILD_EPIC_PROMPT.md` |
| Registry | `device-board-post-comp-debt-night-build` + `db-pcd-nb0…nb3` |
| Active sprint | `docs/NIGHT_BUILD_ACTIVE.md` |
| Consilium | этот файл |

## Definition of Done (планирование)

- [x] Прочитаны CR + routine docs
- [x] Epic prompt + NB фазы согласованы
- [x] Scope frozen (in/out)
- [ ] `yarn night:open` — см. ниже
- [ ] Утро: HANDOFF → `yarn ritual:day` → merge decision

## Утренний handoff (ожидание)

1. PR `night/device-board-post-comp-debt-*` → `techies68`
2. Если NB0–NB3 green → LGTM merge → затем POL-01 consilium (днём)
3. Archive `cabinet-mp4-nb*` (housekeeping — отдельно, epic завершён 2026-06-14)

**LGTM Vesnin:** ✅ план ночного спринта утверждён.
