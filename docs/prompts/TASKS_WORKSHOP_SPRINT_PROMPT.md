# Промпт спринта: tasks-workshop — реализация мастерской контейнера задач

> Основание: PR [#1032](https://github.com/officefish/Membrana/pull/1032) / `223cdb22` ·
> вердикты [`docs/meeting/tasks-workshop/EPIC.md`](../meeting/tasks-workshop/EPIC.md).
> Движение: Linear Project [Tasks workshop · 2026-07](https://linear.app/techies68/project/tasks-workshop-2026-07-a7f7f9e00fd1) ·
> контейнер [DRU-403](https://linear.app/techies68/issue/DRU-403/tasks-workshop-kontejner) (без парного GitHub-issue).
> Канон Linear: [`FRAME_RAILS_2307_PROMPT.md`](./FRAME_RAILS_2307_PROMPT.md) § инструктаж ·
> [`LINEAR_TASKS_GEAR.md`](../tasks/LINEAR_TASKS_GEAR.md) ·
> [`LINEAR_GITHUB_SYNC_REGULATION.md`](./LINEAR_GITHUB_SYNC_REGULATION.md) (неблокирующий).

## Цель

Поставить дом `docs/tasks` на мастерскую с явным адресом, составом глаголов, осями
раскладки, контрактами inspect/validity/invariants, зубом README↔registry и двумя
поведенческими контрактами one-shot (rank + trail) — по вердиктам заседания, не
пересматривая их в коде.

**Критерий успеха:** все фазы g0…v9 закрыты с DoD; g0 закрыт только после явного
слова владельца; расхождение V2 ↔ `HOME_WORKSHOP` не утащено в реализацию молча.

## g0 — HARD GATE (слово владельца) · ✅ закрыт 23.07

Карточка `tw-g0-v2-gate` (#1056 / DRU-404).

**Вердикт владельца (23.07): V2 wins** — «уточнять паттерн».

- В мастерскую `docs/tasks` входят 5 глаголов: `inspectElement`, `list`, `board`,
  `bookkeeping`, `reviewing`.
- `audit` и `decompose` — **вне** мастерской (CI-гейты / соседний контур
  `docs/audit/tasks`), вместе с писателями / sync / `start`.
- Паттерн [`HOME_WORKSHOP`](../patterns/HOME_WORKSHOP.md) уточнён: MUST = покрытие
  **дома** инвентарём, не обязанность каждой мастерской тащить пару в свои verbs.
  Живые audit-family дома (git / audit/tasks / bestiary / …) с парой в verbs остаются
  валидны.

После g0 разрешён `tw-v2-verbs` (граница глаголов в README / манифесте). Код v1
(манифест/иерархия) можно параллелить; v2+ decision-verbs — по карточке `tw-v2-verbs`.

## Карточки

| id | GH | Linear | size | lead | суть |
|----|----|--------|------|------|------|
| `tasks-workshop` | — | [DRU-403](https://linear.app/techies68/issue/DRU-403) | L | vesnin | Эпик/контейнер (движение) |
| `tw-g0-v2-gate` | [#1056](https://github.com/officefish/Membrana/issues/1056) | [DRU-404](https://linear.app/techies68/issue/DRU-404) | S | vesnin | Слово владельца V2 vs HOME_WORKSHOP |
| `tw-v1-manifest` | [#1057](https://github.com/officefish/Membrana/issues/1057) | [DRU-405](https://linear.app/techies68/issue/DRU-405) | M | ozhegov | Манифест + иерархия + workshop-semantics + check |
| `tw-v2-verbs` | [#1058](https://github.com/officefish/Membrana/issues/1058) | [DRU-406](https://linear.app/techies68/issue/DRU-406) | S | ozhegov | Состав глаголов + граница в README (**после g0**) |
| `tw-v3-axes` | [#1059](https://github.com/officefish/Membrana/issues/1059) | [DRU-407](https://linear.app/techies68/issue/DRU-407) | M | dynin | Оси `decompose --by` |
| `tw-v4-inspect` | [#1060](https://github.com/officefish/Membrana/issues/1060) | [DRU-408](https://linear.app/techies68/issue/DRU-408) | M | ozhegov | `inspectElement` pure+CLI |
| `tw-v5-validity` | [#1061](https://github.com/officefish/Membrana/issues/1061) | [DRU-409](https://linear.app/techies68/issue/DRU-409) | L | dynin | `validateTask` / `validateRegistry` уровни |
| `tw-v6-invariants` | [#1062](https://github.com/officefish/Membrana/issues/1062) | [DRU-410](https://linear.app/techies68/issue/DRU-410) | M | vesnin | Linear HARD / Issue WARN / closed→closedAt |
| `tw-v7-readme-tooth` | [#1063](https://github.com/officefish/Membrana/issues/1063) | [DRU-411](https://linear.app/techies68/issue/DRU-411) | M | ozhegov | README↔registry pre-commit зуб; #1014 переформулировать |
| `tw-v8-oneshot-rank` | [#1064](https://github.com/officefish/Membrana/issues/1064) | [DRU-412](https://linear.app/techies68/issue/DRU-412) | L | vesnin | one-shot rank (не вердикт) |
| `tw-v9-trail` | [#1065](https://github.com/officefish/Membrana/issues/1065) | [DRU-413](https://linear.app/techies68/issue/DRU-413) | M | ozhegov | `one-shot-trail.jsonl` анти-дробление |

Support: v6 — dynin; v9 — vesnin. Holder «владелец + vesnin» на g0 = lead vesnin, слово — владельца.

## Порядок

```
g0 ──(слово)──► v2
v1 ║ (можно параллельно с g0, не трогает границу глаголов)
v1 → v3 → v4
v1 → v5 → v6
v1 → v7
v8 → v9   (после контрактов one-shot / независимо от v3–v7, но не до g0 если тянет состав)
```

Практично: **сначала g0** (блокер смысла) + **v1** (адрес); затем v2; затем v3–v7 по зависимостям;
v8/v9 — хвост one-shot.

## Вне scope

- Механика `frames[]` / пины — [#900](https://github.com/officefish/Membrana/issues/900).
- Предикат S-ности / дом процедуры one-shot — закрыт [#1022](https://github.com/officefish/Membrana/issues/1022); не переоткрывать.
- Ошибочная приписка [#915](https://github.com/officefish/Membrana/issues/915) — follow-up вне DAG.
- Форма вердикта как токена — `truth-graph-contour`.
- Cycles Linear — не трогать; спринт = Project.

## DoD спринта

- [x] g0 закрыт с явной записью вердикта владельца (**V2 wins**, 23.07)
- [ ] v1–v9: DoD фазы из EPIC выполнены; PR с `Closes #<issue>`
- [ ] Карточки реестра archived с `archiveNotes` (SHA/PR)
- [ ] Контейнер DRU-403 → Done после архива фаз (неблокирующий Linear)
- [ ] `DAY_SPRINT_ACTIVE` Focus снят / CLOSURE инстанса написан
- [ ] Дубли GH #1066–#1075 / Linear DRU-414–423 не остаются в active (если ещё открыты — закрыть/архивировать как duplicate)

## Инструктаж агента (кратко)

1. Worktree / не красть `main` у соседа.
2. Подзадачи: GitHub Issue → зеркало Linear → parent=DRU-403 + project → `yarn task:register`/`task:start` с `--issue` / `--linear`.
3. Ручные Linear-билеты фаз **не** создавать (норма #984).
4. Egress Linear: `LINEAR_API_KEY` + `HTTPS_PROXY` + `undici ProxyAgent`; 403 = мимо прокси.
5. Не класть секреты в чат.
