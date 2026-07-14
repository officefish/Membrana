---
name: membrana-cowork
description: >-
  Runs Membrana Cowork Sprint: one development cut into 3 blocks built in parallel by
  isolated teams (no interface negotiations until Interface Consilium), then integrated
  via adapters into a single merged result — no jury, no winner. Use when user says
  коворк, cowork, «параллельные блоки», «изолированная разработка блоков», yarn
  cowork:open. Do NOT use for Competition Sprint (3 teams, ONE task, winner —
  COMPETITION_SPRINT_REGULATION) or ordinary M/L tasks (membrana-task-lifecycle).
---

# Membrana Cowork Sprint

Канон: [`docs/COWORK_SPRINT_REGULATION.md`](../../../docs/COWORK_SPRINT_REGULATION.md) ·
консилиум формата: [`docs/seanses/cowork-sprint-format-2026-07-14.md`](../../../docs/seanses/cowork-sprint-format-2026-07-14.md).

## Суть (отличие от Competition)

Competition: 3 команды дают три ОТВЕТА на один вопрос, два выбрасываются.
Cowork: 3 команды дают три ЧАСТИ одного ответа — **мёржатся все три**; жюри,
скоринга и победителя нет. Изоляция до поздней точки — чтобы блоки оставались
концептуально независимыми и не тащили компромиссы ради состыковок.

## Жизненный цикл

```
Brief (резка на 3 блока по естественным швам, per-block DoD)
  → yarn cowork:open --id <sprint-id> --blocks <a,b,c>
  → 3 ветки cowork/<id>/<block> от одного BASE_SHA, каждая команда в СВОЁМ worktree
  → Phase 1: CONCEPT.md + первый EXPECTATIONS.md (односторонние ожидания от соседей)
  → Phase 2: isolated build до СОБСТВЕННОГО DoD на исполняемых стабах
  → гейт: ready(A) ∧ ready(B) ∧ ready(C) ∨ deadline → Interface Consilium
  → вскрытие трёх EXPECTATIONS → INTERFACE_CONTRACT.md (сигнатуры + инварианты
    потока + глоссарий стыка + интеграционный smoke)
  → Phase 4: ветка cowork/<id>/integration — мёрж блоков + АДАПТЕРЫ (блоки не
    переписывать, стабы не мёржить), ведёт координатор
  → один PR в main → RETROSPECTIVE («адаптировали vs переписали») → archive
```

## Hard rules (краткая памятка агенту блока)

- Своя файловая зона из brief; общие корневые файлы (package.json, registry.json) не трогать.
- Чужие ветки и чужие EXPECTATIONS.md не читать; об интерфейсах не договариваться до Phase 3.
- Стабы соседей — исполняемые, в своей зоне; собственный DoD проходит без кода соседей.
- Нарушение изоляции = блок «скомпрометирован» (разбор первым на консилиуме), не DQ.

Стоп-правила S-C1 (блок 2 дня красный → сузить блок/сдвинуть дедлайн) и
S-C2 (несводимые EXPECTATIONS → эскалация владельцу) — в регламенте.

## Реестр

`sprintKind: cowork-sprint`, id `cowork-<slug>`, brief =
`docs/cowork-sprint/<id>/COWORK_SPRINT_BRIEF.md`. Мастер-промпт агента блока — в регламенте.
