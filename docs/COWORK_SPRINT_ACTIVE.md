# Cowork Sprint — ACTIVE

| Поле | Значение |
|------|----------|
| **status** | `open` — Phase 0 закрыта (brief + open, ратификация резки владельцем 2026-07-30); Phase 1 (Concept) — следующая |
| sprintId | `cowork-honest-sprint` |
| Brief | [`docs/cowork-sprint/cowork-honest-sprint/COWORK_SPRINT_BRIEF.md`](./cowork-sprint/cowork-honest-sprint/COWORK_SPRINT_BRIEF.md) |
| GitHub Issue | [#1499](https://github.com/officefish/Membrana/issues/1499) |
| Родители | заседание [`sprint-honest-performers`](./meeting/sprint-honest-performers/MEETING_VERDICT.md) (10/10) → шторм [`storm-team-volume-in-work-2026-07-30`](./storm/storm-team-volume-in-work-2026-07-30/REPORT.md) (7/7, развилка = коворк) |
| blocks | `cut-contract` · `execution-gate` · `experience-loop` |
| baseBranch / BASE_SHA | `main` / `bb1dfe55` |
| Координатор | **Ангелина** (ведущая: фазовые гейты, Interface Consilium, интеграционная ветка) |
| integration deadline (fallback) | 2026-08-02 |
| Формат | Cowork Sprint v1.0 — [регламент](./COWORK_SPRINT_REGULATION.md) |

## Фазы

| Фаза | Статус |
|------|--------|
| 0 — Brief + open | закрыта 2026-07-30 (BASE_SHA `bb1dfe55`, ратификация резки владельцем) |
| 1 — Concept (CONCEPT.md + первый EXPECTATIONS.md) | следующая |
| 2 — Isolated build (собственный DoD на стабах) | — |
| 3 — Interface Consilium → INTERFACE_CONTRACT.md | — |
| 4 — Integration (ветка `cowork/cowork-honest-sprint/integration`) | — |
| 5 — Merge + RETROSPECTIVE + archive | — |

## Изоляция (памятка)

Чужие ветки блоков и чужие `EXPECTATIONS.md` **не читать**; форма плана, форма следа и форма
записи опыта **не пренегосиируются** — сводятся на Интерфейс-консилиуме. Общие корневые файлы
(`package.json` — записи `yarn sprint:*`, `docs/tasks/registry.json`, `AGENTS.md`,
`docs/HANDOFF.md`) в изолированной фазе не трогает никто: провода вносятся на интеграции, в фазе 2
блоки запускаются через `node scripts/...`. Каждая команда — свой worktree, коммиты поимённо,
никогда `git add -A`.

**Чтение существующего кода изоляцию не нарушает.** `cut-contract` **обязан** импортировать
`OVERSIZED_CHANGED_LINES` из `scripts/lib/day-work-diff.mjs` — мерка компактности не изобретается.

## Гейт «спросить владельца» — заданный вопрос и ответ (30.07)

**Вопрос координатора:** Phase 1 пишут три отдельные сессии (по одной на дерево) — или её пишет
одна сессия координатора, быстрее, но с потерей изоляции? Одна сессия держит в голове все три
концепта, поэтому «односторонние» `EXPECTATIONS.md` выйдут согласованными заранее: артефакты будут
**выглядеть** изолированными, не будучи ими. По регламенту такие блоки рождаются
**скомпрометированными** (S-C3) и первыми идут на разбор Phase 3.

**Ответ владельца: «Держим формат».**

Следствия, обязательные к соблюдению:

- Phase 1 каждого блока пишет **своя сессия в своём дереве** (`../Membrana-<slug>`), по
  `team-<slug>/AGENT_PROMPT.md`;
- координатор блоки **не пишет** — он не команда: «мой блок прав» есть конфликт интересов на
  интеграции (регламент, § Координатор);
- ни один блок не помечается скомпрометированным «с рождения» — предпосылки для этого сняты
  решением владельца, а не умолчанием.

Мастер-промпты запечатаны в свои ветки координатором и самодостаточны (регламент и brief — линками):

| Блок | Дерево | Промпт | Ветка |
|---|---|---|---|
| `cut-contract` | `../Membrana-cut-contract` | `team-cut-contract/AGENT_PROMPT.md` | `51e38db5` |
| `execution-gate` | `../Membrana-execution-gate` | `team-execution-gate/AGENT_PROMPT.md` | `7ccd9653` |
| `experience-loop` | `../Membrana-experience-loop` | `team-experience-loop/AGENT_PROMPT.md` | `8b0ddf52` |

## Команды веток (Phase 1 старт)

```
git branch cowork/cowork-honest-sprint/cut-contract && git push -u origin cowork/cowork-honest-sprint/cut-contract
git worktree add ../Membrana-cut-contract cowork/cowork-honest-sprint/cut-contract

git branch cowork/cowork-honest-sprint/execution-gate && git push -u origin cowork/cowork-honest-sprint/execution-gate
git worktree add ../Membrana-execution-gate cowork/cowork-honest-sprint/execution-gate

git branch cowork/cowork-honest-sprint/experience-loop && git push -u origin cowork/cowork-honest-sprint/experience-loop
git worktree add ../Membrana-experience-loop cowork/cowork-honest-sprint/experience-loop
```

---

## Ретайр предыдущего флага — рецидив 2/2

Предыдущий спринт **`cowork-strategic-docs-container`** доехал до конца **24.07** и **не был
закрыт флагом**: `INTERFACE_CONTRACT.md` + `RETROSPECTIVE.md` на месте, 33/33 теста зелёных,
блоков переписано 0 / стыков адаптировано 3, интеграция в `main`. Флаг шесть дней держал
`status: open` и «Phase 1 — следующая», карточки в `docs/tasks/registry.json` не появилось вовсе.
Ретайрен вручную 30.07.

**Это второй случай подряд того же класса.** Ровно так же застрял флаг спринта
`cowork-execution-registry` (ретайрен вручную 24.07, долг `#cowork-phase5-no-autoclose` закрыт
`fact_ref`). Лечение оба раза было ручным, потому что **скрипта `cowork:close` не существует**:
в `package.json` есть только `cowork:open`, а регламент ссылается на `cowork:phase` / `cowork:close`
как на follow-up. Рецидив заведён попугаю: `#cowork-phase5-no-autoclose-r2`.

**Поймал не человек, а гейт:** `cowork:open` отказался открывать новый спринт поверх открытого.
Гард сработал по назначению — и `--force` был бы ровно тем обходом, после которого второй
застрявший флаг стал бы третьим.

Живой хвост: три ветки блоков `cowork/cowork-strategic-docs-container/*` целы локально и на
`origin` — удаление веток отгруженного коворка не входит ни в один путь.
Артефакты: `docs/cowork-sprint/cowork-strategic-docs-container/`,
`docs/cowork-sprint/cowork-execution-registry/`.
