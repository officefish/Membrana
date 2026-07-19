# Cowork Sprint — ACTIVE

| Поле | Значение |
|------|----------|
| **status** | `open` — Phase 3 Interface Consilium; гейт 2→3 сработал событийно 2026-07-19 (ready всех трёх), freeze-теги стоят |
| sprintId | `cowork-execution-registry` |
| Brief | [`docs/cowork-sprint/cowork-execution-registry/COWORK_SPRINT_BRIEF.md`](./cowork-sprint/cowork-execution-registry/COWORK_SPRINT_BRIEF.md) |
| Вход | [`HANDOFF_2026-07-19_COWORK.md`](./HANDOFF_2026-07-19_COWORK.md) — свод эпиков двух заседаний 19.07 |
| blocks | `lead-persona` · `units-trace-measure` · `snapshot-cold-migration` |
| baseBranch / BASE_SHA | `fix/adr-0013-accepted` / `221d7801` |
| Координатор | Vesnin (Teamlead) |
| integration deadline (fallback) | 2026-07-21 |
| Формат | Cowork Sprint v1.0 — [регламент](./COWORK_SPRINT_REGULATION.md) |

## Фазы

| Фаза | Статус |
|------|--------|
| 0 — Brief + open | закрыта 2026-07-19 (BASE_SHA `221d7801`, LGTM владельца) |
| 1 — Concept (CONCEPT.md + первый EXPECTATIONS.md) | закрыта 2026-07-19: `lead-persona` `8f927146` · `units-trace-measure` `81e74793` · `snapshot-cold-migration` `03a6b1ec`; блокеров нет |
| 2 — Isolated build (собственный DoD на стабах) | закрыта 2026-07-19: `lead-persona` ready 30/30 (`740f2bdd`) · `units-trace-measure` ready 41/41 (`7fff51ec`) · `snapshot-cold-migration` ready 50/50 + scoped CI office 178 (`000e1bd9`); нарушений изоляции нет |
| 3 — Interface Consilium → INTERFACE_CONTRACT.md | закрыта 2026-07-19: протокол 27 реплик единогласно ([discussions](./discussions/cowork-sprint-cowork-execution-registry-interface-consilium.md)), контракт готов; 6 адаптеров, S-C2 не понадобился |
| 4 — Integration (ветка `cowork/cowork-execution-registry/integration`) | **в работе** |
| 5 — Merge + RETROSPECTIVE + archive | — |

## Изоляция (памятка)

Чужие ветки и чужие EXPECTATIONS.md не читать; общие корневые файлы
(`package.json`, `registry.json`, `.husky/**`, `app.module.ts`, промпты пяти
советующих персон) не трогать — провода на интеграции. Каждая команда — свой
worktree, коммиты поимённо, никогда `git add -A`.

---

Предыдущий спринт `cowork-free-fragment-usercases` (#487) закрыт 2026-07-15:
PR #489 merged (squash `22cfc319`), метрика резки «переписано 0, адаптировано 3».
Артефакты: `docs/cowork-sprint/cowork-free-fragment-usercases/`.
