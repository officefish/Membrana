# Промпт (Night Build эпик): Device-board post-competition debt — runtime DRY, docs, a11y

> **Night Build эпик** — автономный ночной цикл по [`NIGHT_SPRINT_REGULATION.md`](../NIGHT_SPRINT_REGULATION.md).
> Размер: **L** (4 фазы NB0–NB3, 1 ночь).
> Реестр: `id` = **`device-board-post-comp-debt-night-build`**.
> Основание: [`DAILY_CODE_REVIEW.md`](../DAILY_CODE_REVIEW.md) (2026-06-21), архивы review 2026-06-19…20, [`COMPETITION_SPRINT_ACTIVE.md`](../COMPETITION_SPRINT_ACTIVE.md).

---

## Контекст

Competition sprint **comp-mvp-packaging-2026-06-21** закрыт (RUN-01 ✅, winner merge deferred). Phase 2b дала **рабочий runtime** (399 тестов device-board), но code-review зафиксировал **технический долг**, не блокирующий голосование, но мешающий merge в `techies68`:

| # | Источник | Риск | Приоритет |
|---|----------|------|-----------|
| R1 | CR 2026-06-21 | `exec-successor.ts` / `function-call-resolve.ts` — роль не документирована, возможное дублирование с `function-pin-ops.ts` | 🔴 |
| R2 | CR 2026-06-21 | `DEVICE_BOARD_CONCEPT.md` — нет диаграммы runtime → block-executor → exec-successor | 🟡 |
| R3 | CR 2026-06-21 | `board-usercase-picker-modal.tsx` — a11y не проверен | 🟡 |
| R4 | CR 2026-06-21 | `scripts/usercase.mjs` — side-effects / артефакты вне канона | 🟡 |
| R5 | CR 2026-06-20 | `device-board-shell.tsx` — 5× `react-hooks/exhaustive-deps` warnings | 🟡 |
| R6 | CR 2026-06-20 | Неотслеживаемые runtime-файлы competition sprint | 🔴 |
| R7 | Retrospective | POL-01 / winner merge — **out of scope** (дневной consilium) | — |

**Уже закрыто (не дублировать):** эпик `code-review-debt-closeout-jun2026` (D0–D6, Issue #126).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`NIGHT_SPRINT_REGULATION.md`](../NIGHT_SPRINT_REGULATION.md) | night:open / checkpoint / close |
| [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Целевая диаграмма runtime |
| [`USERCASE_COMPETITION_LESSONS.md`](../actions/device-board/USERCASE_COMPETITION_LESSONS.md) | L1–L12 → regulation |
| [`USERCASE_GENERATION_REGULATION.md`](../actions/device-board/USERCASE_GENERATION_REGULATION.md) | CLI канон |
| [`DESIGN.md`](../DESIGN.md) | Modal a11y |
| [`comp-mvp-packaging-2026-06-21/RETROSPECTIVE.md`](../competition-sprint/comp-mvp-packaging-2026-06-21/RETROSPECTIVE.md) | Scope freeze |

**Ветка Night Build:** `night/device-board-post-comp-debt-night-build-2026-06-21` ← `techies68`.

---

## Подзадачи (строгий порядок)

| Фаза | Реестр `id` | Содержание | Lead |
|------|-------------|------------|------|
| **NB0** | `db-pcd-nb0-merge-gate` | Baseline audit, lint 0 warnings, track untracked, usercase verify | Vesnin + Ozhegov |
| **NB1** | `db-pcd-nb1-runtime-dry` | Audit/refactor exec-successor ↔ function-call-resolve ↔ function-pin-ops | Ozhegov |
| **NB2** | `db-pcd-nb2-concept-docs` | CONCEPT.md runtime diagram + cross-ref lessons/regulation | Vesnin |
| **NB3** | `db-pcd-nb3-a11y-hygiene` | Picker modal a11y, shell useMemo, usercase.mjs hygiene test | Rodchenko + Ozhegov |

> **Stop rule:** 2 scoped CI fail подряд → commit WIP, `yarn night:close`, блокер в HANDOFF.

---

## Night Build — промпт целиком (для вставки агенту)

> Перед стартом: `yarn night:open --id device-board-post-comp-debt-night-build`.

### Кто ты

Ты — **координатор виртуальной команды Membrana** (Vesnin). Режим **Night Build**. Scope **заморожен** (NB0–NB3). Prod-deploy, winner merge, `@membrana/core` / `agenda` — **запрещены**.

### NB0 — Merge gate

**Lead:** Vesnin. **Support:** Ozhegov.

1. Ветка `night/device-board-post-comp-debt-night-build-*` от `techies68`.
2. `git add` все untracked файлы competition sprint (runtime, scripts, docs regulation).
3. Baseline matrix → `docs/archive/db-pcd-baseline-<date>.md`:
   - `@membrana/device-board`: lint / typecheck / test
   - `node scripts/usercase.mjs verify-all` (или эквивалент из help)
4. Исправить **5 warnings** в `device-board-shell.tsx` (`scenarioCanvas` → `useMemo`).
5. Checkpoint scoped CI:

```bash
yarn turbo run lint typecheck test --continue --filter=@membrana/device-board
node scripts/usercase.mjs verify-all
```

**DoD NB0:** lint 0 warnings device-board; untracked = 0 для scope; checkpoint pass.

### NB1 — Runtime DRY

**Lead:** Ozhegov. **Support:** Vesnin.

1. Прочитать `function-pin-ops.ts`, `function-call-resolve.ts`, `exec-successor.ts`, `block-executor.ts`.
2. Таблица пересечений (markdown в PR или `docs/discussions/`):

   | Модуль | Ответственность | Дублирует? |
   |--------|-----------------|------------|

3. Если overlap — extract shared pure fn **без** изменения публичного API runtime.
4. Тесты: `function-call-resolve.test.ts`, `exec-successor.test.ts`, `function-pin-ops.test.ts` — green, +1 тест на граничный case если refactor.
5. **Запрещено:** менять collapse/build scripts без отдельного LGTM.

**DoD NB1:** нет дублирования resolve-logic; тесты green; checkpoint pass.

### NB2 — CONCEPT + docs

**Lead:** Vesnin. **Support:** Ozhegov.

1. Обновить `packages/device-board/DEVICE_BOARD_CONCEPT.md`:
   - mermaid или ascii: `scenario-runtime` → `block-executor` → `exec-successor` → `function-call-resolve`
   - ссылка на `USERCASE_COMPETITION_LESSONS.md` §L9–L12
2. Однострочный JSDoc `@see` на новых runtime модулях → CONCEPT anchor.
3. Не менять продуктовое поведение.

**DoD NB2:** CONCEPT актуален; cross-ref в regulation; checkpoint pass (docs-only + typecheck).

### NB3 — a11y + script hygiene

**Lead:** Rodchenko. **Support:** Ozhegov.

1. `board-usercase-picker-modal.tsx`: focus trap, Escape, `aria-*`, keyboard nav (DESIGN.md).
2. Optional test: `board-usercase-picker-modal.test.tsx` (smoke render + a11y attrs).
3. `scripts/usercase.mjs`: убедиться, что write только в `docs/device-board-scripts/` и `packages/device-board/src/graph/*.generated.ts`.
4. Документировать в `docs/device-board-scripts/README.md` если gap.

**DoD NB3:** modal a11y checklist; script paths verified; checkpoint pass.

### Scoped CI (вся ночь)

```bash
yarn turbo run lint typecheck test --continue \
  --filter=@membrana/device-board \
  --filter=@membrana/client
node scripts/usercase.mjs verify-all
```

Финал: `yarn night:close --id device-board-post-comp-debt-night-build`.

### Out of scope

- Competition winner merge (POL-01, Phase 5)
- Перенос `user-case-catalog-service` в `packages/services/`
- `@membrana/core` / `@membrana/agenda` / MembranaRegistry
- Prod deploy / SSH
- Новые UserCase forks

### Definition of Done (эпик)

- [ ] NB0–NB3 checkpoint pass или deferred в HANDOFF.
- [ ] device-board lint 0 warnings; runtime DRY audit задокументирован.
- [ ] CONCEPT.md обновлён.
- [ ] `yarn night:close` → HANDOFF.
- [ ] **Утром:** LGTM Vesnin → PR `night/*` → `techies68`.

---

## Версия

- **v1.0** (2026-06-21) — consilium post competition sprint + evening code-review.
