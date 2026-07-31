# SESSION_CONTEXT — git audit container

Краткий рабочий контекст для продолжения. При старте сессии читать **перед** Scenario A/B/Assortment.

| | |
|---|---|
| **Worktree** | `C:\Users\user190825\practice\Membrana-codex` |
| **Активный спринт** | `branch-salvage-controlled-tooling` · [#1561](https://github.com/officefish/Membrana/issues/1561) · **IMPLEMENTATION** |
| **Движок** | **Mintlify** · cookbooks `apps/docs/git/cookbooks/` |
| **Пин** | `pins/branch-instructions.manifest.json` · `yarn audit:branch-instructions-pin` |

## Server-first (норма)

| Слой | Путь | Роль |
|------|------|------|
| Контейнер | `docs/audit/git/` | registry · analysis · Scenario A/B/Assortment |
| Движок | Mintlify → `apps/docs/**` | инструкции «ветка → случай» |
| Пин | манифест path→SHA | подграф инструкций · latest/pinned |

**Не путать с** `kits-angelina-morning` (#814) — киты пинят `scripts/`.

## Спринт `branch-mintlify-engine` — CLOSED

Эпик [#823](https://github.com/officefish/Membrana/issues/823) · delivery [#835](https://github.com/officefish/Membrana/pull/835) ·
[`CLOSURE.md`](../../day-sprint/branch-mintlify-engine/CLOSURE.md)

| Фаза | Issue | Статус |
|------|------:|--------|
| F0–F4 | #824–#828 | delivered in #835 |
| F5 | #829 | archive + CLOSURE |

## Спринт `branch-hygiene-salvage-2026-07-31` — CLOSED

Frozen base: `origin/main@665a605fe612858245c7f774ed07a60fa1367881`.

| Артефакт | Статус |
|----------|--------|
| `registry/BRANCHES_DECOMPOSE_LIST-2026-07-31.md` | Scenario A · 186 salvage |
| `analysis/category-7-attention-2026-07-31.md` | Scenario B · A1 14 / A2 93 / A3 79 |
| `analysis/category-7-salvage-verdicts-2026-07-31.md` | 184 verdicts + 2 owner exclusions · delivered |

Issue [#1544](https://github.com/officefish/Membrana/issues/1544) закрыт.
Доставка прошла через PR
[#1547](https://github.com/officefish/Membrana/pull/1547),
[#1553](https://github.com/officefish/Membrana/pull/1553),
[#1554](https://github.com/officefish/Membrana/pull/1554),
[#1556](https://github.com/officefish/Membrana/pull/1556),
[#1558](https://github.com/officefish/Membrana/pull/1558) и
[#1560](https://github.com/officefish/Membrana/pull/1560).

## Спринт `branch-salvage-controlled-tooling` — ACTIVE

Issue [#1561](https://github.com/officefish/Membrana/issues/1561). Цель:
перенести разовую six-frame обвязку #1544 в общую процедуру мастерской:
freeze → reconcile → ratify → prepare → one-ref mutation → closeout.

Канон: [`CONTROLLED_SALVAGE_PROCEDURE.md`](./CONTROLLED_SALVAGE_PROCEDURE.md).
Следующий gate: tests → exact-SHA Teamlead review → merge. Фактическое удаление
refs и worktree в этом tooling-спринте запрещено.

## Три измерения контейнера

| Измерение | Орган |
|-----------|-------|
| Гигиена | `registry/BRANCHES_DECOMPOSE_LIST.md` · Scenario A/B |
| Ассортимент | `analysis/branch-assortment-coverage-*.md` |
| Кейсы → engine | `analysis/branch-cases-catalog-*.md` → Mintlify cookbooks |

## Gotcha

`main` может держать соседний worktree — ff через `origin/main`. Scenario B — только с явной категорией 1–7 в текущем сообщении.

## Опоры

- [`AGENT_PROMPT.md`](./AGENT_PROMPT.md) · [`README.md`](./README.md)
- Skills: `membrana-branch-audit` · `membrana-branch-decompose` · `membrana-branch-salvage`
- Паттерны: [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md) · [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md)
