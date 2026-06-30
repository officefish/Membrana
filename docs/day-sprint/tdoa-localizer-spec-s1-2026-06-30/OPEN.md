# OPEN: tdoa-localizer-spec-s1 — TDOA/localizer contracts without Stage 2 unfreeze

| Поле | Значение |
|------|----------|
| **Sprint** | `tdoa-localizer-spec-s1` |
| **Issue** | [#211](https://github.com/officefish/Membrana/issues/211) |
| **Ветка** | `process/sprint-process-guard` |
| **Opened** | 2026-06-30 |
| **Prompt** | [`docs/prompts/TDOA_LOCALIZER_SPEC_S1_PROMPT.md`](../../prompts/TDOA_LOCALIZER_SPEC_S1_PROMPT.md) |
| **Scope** | Spec/design-review + experimental contract draft only |
| **Freeze** | Stage 2 remains frozen; no runtime/client integration |

## Почему этот спринт

TDOA/localizer spec уже фигурирует как подготовка Stage 2 contracts design-review, но Stage 2 нельзя размораживать до hard SLD gate. Sprint нужен, чтобы заранее зафиксировать единицы, модели, границы сервисов, failure modes и ответственность по ролям, не начиная реализацию алгоритмов.

Особенность sprint: **у каждого шага реализации ровно один accountable owner из виртуальной команды Membrana**. Остальные роли могут быть `Consulted` или `Reviewer`, но не co-owner.

## Pre-sprint gate

- [x] GitHub Issue: #211
- [x] Registry: `tdoa-localizer-spec-s1` → `active`
- [x] Prompt: `docs/prompts/TDOA_LOCALIZER_SPEC_S1_PROMPT.md`
- [x] OPEN.md создан
- [x] DAY_SPRINT_ACTIVE.md обновлён
- [x] Stage 2 freeze явно сохранён

## Фазы

| Phase | Owner | Consulted | Reviewer | Status | Deliverable |
|-------|-------|-----------|----------|--------|-------------|
| TL0 — Pre-sprint gate | Vesnin | - | Vesnin | ✅ | Issue, registry, prompt, OPEN, ACTIVE |
| S1 — Architecture boundary | Ozhegov | Vesnin | Vesnin | ✅ | Spec skeleton and package boundaries |
| M1 — TDOA math model | Dynin | Kuryokhin | Vesnin | ✅ | Delta-time units, uncertainty, future GCC-PHAT notes |
| A1 — Acoustic assumptions | Kuryokhin | Dynin | Vesnin | ✅ | SNR, multipath, observability, speed-of-sound assumptions |
| S2 — Core contract draft | Ozhegov | Dynin | Vesnin | ✅ | Experimental Stage 2 TypeScript interfaces or documented defer |
| M2 — Localization model | Dynin | Ozhegov | Vesnin | ✅ | Multilateration input/output, covariance, residuals, failure states |
| U1 — Future UI contract | Rodchenko | Ozhegov | Vesnin | ✅ | Future map/azimuth/error display contract, no UI implementation |
| TL1 — Freeze/gate review | Vesnin | all | Vesnin | ✅ | No runtime/client integration, no gate claim |
| TL2 — Closure | Vesnin | - | Vesnin | ⬜ | CLOSURE.md, DoD report, archive after PR/LGTM |

## Definition of Done

- [x] Architecture spec exists: `docs/architecture/tdoa-localization-contracts.md`.
- [x] Prompt and OPEN have exactly one accountable owner per implementation step.
- [x] Core contracts are updated or explicitly deferred by Teamlead rationale.
- [x] `packages/services/tdoa/README.md` links to the spec and remains frozen.
- [x] No runtime/client/service implementation added.
- [ ] Teamlead LGTM.
- [ ] CLOSURE.md written and registry archived after PR acceptance.
