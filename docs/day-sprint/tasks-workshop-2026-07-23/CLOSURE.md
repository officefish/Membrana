# CLOSURE — tasks-workshop

| Field | Value |
|-------|-------|
| Epic | `tasks-workshop` · Linear DRU-403 |
| Date | 2026-07-25 |
| Status | **CLOSED** |
| Meeting verdicts | [`docs/meeting/tasks-workshop/EPIC.md`](../../meeting/tasks-workshop/EPIC.md) |
| Home | [`docs/tasks/`](../../tasks/) · kit [`kits/tasks-master`](../../../kits/tasks-master/) |
| Patterns | [`HOME_WORKSHOP`](../../patterns/HOME_WORKSHOP.md) · neighbor `docs/audit/tasks` |

## Сделано

| Фаза | Issue | PR | Артефакт | Archive |
|------|------:|----:|----------|---------|
| g0 | #1056 | [#1080](https://github.com/officefish/Membrana/pull/1080) | V2 wins: audit/decompose вне primary | archived |
| v1 | #1057 | [#1087](https://github.com/officefish/Membrana/pull/1087) | manifest + workshop-semantics | archived |
| v2 | #1058 | [#1087](https://github.com/officefish/Membrana/pull/1087) | 5 decision-verbs + README граница | archived |
| v3 | #1059 | [#1106](https://github.com/officefish/Membrana/pull/1106) | `tasks:decompose --by` оси V3 | archived |
| v4 | #1060 | [#1113](https://github.com/officefish/Membrana/pull/1113) | `inspectElement` + `yarn task:inspect` | archived |
| v5 | #1061 | [#1127](https://github.com/officefish/Membrana/pull/1127) | `yarn task:validate` | archived |
| v6 | #1062 | [#1135](https://github.com/officefish/Membrana/pull/1135) | `yarn task:invariants` + repair | archived |
| v7 | #1063 | [#1139](https://github.com/officefish/Membrana/pull/1139) | README↔registry pre-commit зуб | archived |
| v8 | #1064 | [#1150](https://github.com/officefish/Membrana/pull/1150) | `yarn one-shot:rank` | archived |
| v9 | #1065 | [#1153](https://github.com/officefish/Membrana/pull/1153) | `yarn one-shot:trail` | archived |
| discoverability | — | [#1190](https://github.com/officefish/Membrana/pull/1190) | `yarn task:tools` · kit · skill `membrana-tasks-workshop` | merged |

## DoD эпика

| Критерий | Свидетельство |
|----------|---------------|
| Primary мастерская `docs/tasks` с манифестом и каталогом | `workshop.manifest.json` · `WORKSHOP.md` |
| 5 decision-verbs (inspect/list/board/bookkeeping/reviewing) | manifest; board/bookkeeping/reviewing — planned engines |
| Контракты inspect / validate / invariants / one-shot | `INSPECT_ELEMENT.md` · `VALIDITY.md` · `SYNC_INVARIANTS.md` · `ONE_SHOT_*` |
| Соседний контур audit/decompose | `docs/audit/tasks` · `yarn tasks:audit` · `yarn tasks:decompose` |
| Kit + cross-agent discoverability | `kits/tasks-master` · PR #1190 |
| Все фазы archived; эпик archived | этот CLOSURE · `yarn task:archive tasks-workshop` |

## Follow-up (вне эпика)

| Что | Куда |
|-----|------|
| Движки board / bookkeeping / reviewing | отдельные M после эпика |
| Ось `health` в decompose | #1104 |
| Registry hygiene (sprintKind, prompt stubs, deferred) | chore после CLOSURE |

## Archive

Фазы g0–v9 archived 23–25.07. Discoverability — PR #1190 merged. Эпик archived 2026-07-25.
