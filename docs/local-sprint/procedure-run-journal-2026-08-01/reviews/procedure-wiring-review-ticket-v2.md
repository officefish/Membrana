# Vesnin review ticket v2: procedure-wiring-review

Persona: vesnin
Block: procedure-wiring-review
Plan: docs/sprint/cut/procedure-run-journal-2026-08-01-code-review.json
Ratified v2: 2026-08-01T09:53:55+03:00

## Review task

You are the assigned reviewer for this membrana-local-sprint block. The previous Vesnin review returned BLOCK because the ticket showed procedure docs and skills but not the engines listed in MANIFEST.json. This v2 ticket fixes that: it includes the MANIFEST engines below.

Return strictly LGTM or BLOCK. If BLOCK, name exact files and missing/incorrect evidence. Do not ask clarifying questions.

## Zone

- docs/procedures/membrana-local-sprint/README.md
- docs/procedures/membrana-local-sprint/MANIFEST.json
- .cursor/skills/membrana-local-sprint/SKILL.md
- .agents/skills/membrana-local-sprint/SKILL.md
- .claude/skills/membrana-local-sprint/SKILL.md
- .opencode/skills/membrana-local-sprint/SKILL.md
- .cursor/skills/README.md
- docs/LOCAL_SPRINT_ACTIVE.md
- docs/LOCAL_SPRINT_LOG.md
- docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md
- docs/local-sprint/procedure-run-journal-2026-08-01/F1_REPORT.md
- scripts/task-start.mjs
- scripts/task-register.mjs
- scripts/archive-task.mjs
- scripts/task-close-github-issues.mjs
- scripts/sprint-cut-check.mjs
- scripts/execution-gate.mjs
- scripts/sprint-experience.mjs
- scripts/procedure-run-journal.mjs
- scripts/lib/task-registry.mjs

## File: docs/procedures/membrana-local-sprint/README.md

```md
# Процедура: membrana-local-sprint

**Определение.** `membrana-local-sprint` — каноническая локальная процедура
разработки для задач Membrana: одна рабочая ветка, один агент-координатор,
явная нарезка на фазы через `docs/tasks/registry.json`, и честный след
исполнения через `procedure-run-journal`.

**Держатель:** Vesnin (`leadPersona` манифеста).

## Определение и прогоны

Этот каталог — **определение** процедуры. Прогоны живут в
`docs/local-sprint/<id>/` и несут `OPEN.md` / `CLOSURE.md` по мере выполнения.
Операторские указатели: `docs/LOCAL_SPRINT_ACTIVE.md` и `docs/LOCAL_SPRINT_LOG.md`.

## Каноническое имя

Старое рабочее имя `honest-sprint` больше не является входом для новых задач.
Если пользователь говорит «спринт», «локальный спринт», «честный спринт» или
просит нарезку задачи, агент обязан вести работу через `membrana-local-sprint`.
Другие новые локальные sprint-kind не заводятся.

Исторические артефакты `day-sprint`, `cowork-honest-sprint` и архивные
упоминания не переписываются: они остаются доказательством прошлых прогонов, а
не живым именем текущего маршрута.

## Движки

| Команда | Роль |
|---------|------|
| `yarn task:start` / `yarn task:register` | регистрация эпика и фаз |
| `yarn sprint:cut` | проверка плана нарезки |
| `yarn sprint:gate` | проверка следа исполнения |
| `yarn sprint:experience` | запись прогноза и исхода |
| `yarn procedure-run:journal` | локальный журнал прогонов процедур |

## Инварианты

- Задачи текущего локального спринта получают `sprintKind: "membrana-local-sprint"`.
- Прогон обязан назвать предмет (`subject`), evidence и gaps; `pass` без evidence запрещён.
- Нарезка и гейт не подменяются подписью персоны: профильный контекст должен оставить след.
- Перерезка в работе означает новую версию плана и новую ратификацию.

## Манифест

[`MANIFEST.json`](./MANIFEST.json) — `id`, `leadPersona`, `kitVersion: null`,
`engines[]`, `precedents[]`, ядро trigger/steps/gates и `home`.

```

## File: docs/procedures/membrana-local-sprint/MANIFEST.json

```json
{
  "id": "membrana-local-sprint",
  "leadPersona": "vesnin",
  "kitVersion": null,
  "engines": [
    "scripts/task-start.mjs",
    "scripts/task-register.mjs",
    "scripts/archive-task.mjs",
    "scripts/task-close-github-issues.mjs",
    "scripts/sprint-cut-check.mjs",
    "scripts/execution-gate.mjs",
    "scripts/sprint-experience.mjs",
    "scripts/procedure-run-journal.mjs",
    "scripts/lib/task-registry.mjs"
  ],
  "precedents": [
    "docs/meeting/sprint-honest-performers/MEETING_VERDICT.md",
    "docs/storm/storm-team-volume-in-work-2026-07-30/REPORT.md",
    "docs/cowork-sprint/cowork-honest-sprint/INTERFACE_CONTRACT.md",
    "docs/cowork-sprint/cowork-honest-sprint/OWNER_ANSWERS.md",
    "docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md"
  ],
  "preflight": [
    { "id": "neighbor-scope", "holder": "vesnin" },
    { "id": "cut-plan", "holder": "vesnin" }
  ],
  "frames": [
    { "id": "register", "holder": "vesnin" },
    { "id": "open", "holder": "vesnin" },
    { "id": "cut", "holder": "vesnin" },
    { "id": "ratify", "holder": "vesnin" },
    { "id": "execute", "holder": "dynin" },
    { "id": "journal", "holder": "dynin" },
    { "id": "gate", "holder": "angelina" },
    { "id": "experience", "holder": "angelina" },
    { "id": "closure", "holder": "vesnin" }
  ],
  "post": [
    { "id": "archive", "holder": "dynin" },
    { "id": "close-github", "holder": "vesnin" }
  ],
  "trigger": {
    "kind": "captain-word",
    "command": "membrana-local-sprint / yarn sprint:cut",
    "note": "единый локальный sprint-route; старое имя honest-sprint не является новым входом"
  },
  "steps": {
    "kind": "inline",
    "items": [
      { "id": "register", "criticality": "critical" },
      { "id": "open", "criticality": "critical" },
      { "id": "cut", "criticality": "critical" },
      { "id": "ratify", "criticality": "critical" },
      { "id": "execute", "criticality": "critical" },
      { "id": "journal", "criticality": "critical" },
      { "id": "gate", "criticality": "critical" },
      { "id": "experience", "criticality": "noncritical", "whyNoncritical": "петля опыта может честно вернуть defined:false до полного носителя следа" },
      { "id": "closure", "criticality": "critical" }
    ]
  },
  "gates": {
    "kind": "inline",
    "items": [
      {
        "id": "ratify",
        "waitsFor": "owner",
        "resume": "явная ратификация владельца плана нарезки → execute",
        "note": "правка плана после ратификации сбрасывает согласие"
      },
      {
        "id": "gate",
        "waitsFor": "human",
        "resume": "sprint:gate code 0 или явный blocked-record в procedure-run-journal",
        "note": "пустой корпус не бывает зелёным"
      }
    ]
  },
  "mode": "local",
  "home": {
    "kind": "none",
    "why": "инстансы живут в docs/local-sprint/<id>/ как прогоны OPEN/CLOSURE; отдельная форма дома пока не закреплена"
  }
}

```

## File: .cursor/skills/membrana-local-sprint/SKILL.md

```md
---
name: membrana-local-sprint
description: >-
  Runs Membrana local sprint, the single canonical local sprint procedure for agent tasks:
  register epic/phases as sprintKind=membrana-local-sprint, cut work into accountable blocks,
  ratify the cut, gate real context execution, write procedure-run-journal evidence/gaps, and
  record prediction ↔ outcome. Use when the user says membrana-local-sprint, локальный спринт,
  честный спринт, honest-sprint, спринт с честными исполнителями, нарезка задачи, план нарезки,
  ратифицируй нарезку, гейт исполнения, yarn sprint:cut / sprint:gate / sprint:experience.
---

# Membrana Local Sprint

Канон процедуры: [`docs/procedures/membrana-local-sprint`](../../../docs/procedures/membrana-local-sprint/README.md).
Происхождение: заседание [`sprint-honest-performers`](../../../docs/meeting/sprint-honest-performers/MEETING_VERDICT.md)
(10/10 вердиктов, ратифицирован владельцем 30.07) · шторм
[`storm-team-volume-in-work-2026-07-30`](../../../docs/storm/storm-team-volume-in-work-2026-07-30/REPORT.md) ·
контракт механизма
[`INTERFACE_CONTRACT.md`](../../../docs/cowork-sprint/cowork-honest-sprint/INTERFACE_CONTRACT.md) ·
решения владельца [`OWNER_ANSWERS.md`](../../../docs/cowork-sprint/cowork-honest-sprint/OWNER_ANSWERS.md).

## Имя и граница

Живое имя процедуры и скилла — **`membrana-local-sprint`**. Старое `honest-sprint`
понимать только как alias-триггер пользователя и сразу нормализовать в
`membrana-local-sprint`.

Для новых локальных задач не заводить `day-sprint`, `honest-sprint` или иной
локальный sprint-kind. Текущие карточки спринта регистрировать с
`sprintKind: "membrana-local-sprint"`, инстансы класть в `docs/local-sprint/<id>/`,
операторские указатели — `docs/LOCAL_SPRINT_ACTIVE.md` и `docs/LOCAL_SPRINT_LOG.md`.

Cowork, competition и night — исторические/специальные форматы, а не альтернативные
локальные спринты. Использовать их только по явному слову владельца.

## Зачем это существует

Участник виртуальной команды — **специализированный профильный контекст**, то есть ещё один
слой ревью. Пока нет нарезки, использование персоны вырождается в подпись под тем, что сессия
сделала бы и так: контур памяти теряет смысл, потому что персона ничего не решала.

Слово владельца: использование членов команды — **не про передоверить исполнение на сторону, а
про придать реализации больший объём и контроль через ответственность**. Медленнее, зато
прозрачнее. Когда нужен просто результат — есть вторая дверь (ниже), и она честно пишет
«персональной ответственности нет».

## Роли — закрытый список, слоты не совмещаются

| Роль | Предмет | Момент |
|---|---|---|
| **Владелец** | аудит **нарезки** через ратификацию | до работы |
| **Тимлид** (`tarasov`) | режет работу на блоки; не программирует. Сопоставляет нарезку с результатом | до · после |
| **Ангелина** (`angelina`) | ведёт спринт по этапам и **контролирует реальную ответственность**: был ли прогон через контекст, подготовлена ли сессия | по ходу |
| **Фаррелл** (`farrell`) | свободный голос: не гейт и не слот, говорит без приглашения | когда сочтёт |

**Ведущий ≠ исполнитель ≠ аудитор** (вердикт M6). Ведущая проверяет **наличие и метки**, а не
достаточность вещдока: она гейт, а не судья. Суждение надзора из её рта — «рот не тот».

## Жизненный цикл

```
1. НАРЕЗКА — тимлид пишет план: blockId · persona · context · zone[] · estimate.changedLines
     yarn sprint:cut --plan docs/sprint/cut/<sprintId>.json
   вердикт: contract | findings | unreadable   (findin

[... clipped at 3500 chars ...]

```

## File: .agents/skills/membrana-local-sprint/SKILL.md

```md
---
name: membrana-local-sprint
description: >-
  Membrana local sprint: cross-agent skill for the single canonical local sprint
  procedure. Use when the user says membrana-local-sprint, локальный спринт,
  честный спринт, honest-sprint, нарезка задачи, ратифицируй нарезку, гейт
  исполнения, sprint:cut, sprint:gate, sprint:experience, or asks to run an
  agent task through the sprint procedure.
---

# Membrana local sprint

Delegate to the project canonical playbook:
[`../../../.cursor/skills/membrana-local-sprint/SKILL.md`](../../../.cursor/skills/membrana-local-sprint/SKILL.md).

Run it verbatim. Normalize old `honest-sprint` wording to `membrana-local-sprint`.
New local sprint tasks use `sprintKind: "membrana-local-sprint"` and instances in
`docs/local-sprint/<id>/`.

```

## File: .claude/skills/membrana-local-sprint/SKILL.md

```md
---
name: membrana-local-sprint
description: >-
  Runs Membrana local sprint, the single canonical local sprint procedure for agent tasks:
  register epic/phases as sprintKind=membrana-local-sprint, cut work into accountable blocks,
  ratify the cut, gate real context execution, write procedure-run-journal evidence/gaps, and
  record prediction ↔ outcome. Use when the user says membrana-local-sprint, локальный спринт,
  честный спринт, honest-sprint, спринт с честными исполнителями, нарезка задачи, план нарезки,
  ратифицируй нарезку, гейт исполнения, yarn sprint:cut / sprint:gate / sprint:experience.
---

# Mirror — Membrana Local Sprint

**Canonical:** [`.cursor/skills/membrana-local-sprint/SKILL.md`](../../../.cursor/skills/membrana-local-sprint/SKILL.md)

Run that playbook verbatim. Канон: `docs/procedures/membrana-local-sprint` · вердикт
заседания `sprint-honest-performers` (10/10, ратифицирован 30.07) ·
`docs/cowork-sprint/cowork-honest-sprint/INTERFACE_CONTRACT.md` · `OWNER_ANSWERS.md`.

Живое имя — `membrana-local-sprint`. Старое `honest-sprint` понимать только как
alias-триггер и сразу нормализовать. Новые локальные задачи регистрировать с
`sprintKind: "membrana-local-sprint"` и инстансом в `docs/local-sprint/<id>/`;
другие локальные sprint-kind не заводить.

Ключевые инварианты:

- **Роли не совмещаются:** нарезку аудирует владелец ратификацией, исполнение — Ангелина
  (все этапы + реальная ответственность), Фаррелл — свободный голос без гейтящей силы.
  Ведущая проверяет **наличие и метки**, не достаточность вещдока: гейт, а не судья.
- **Мерка компактности не изобретается** — `OVERSIZED_CHANGED_LINES` импортом; порог
  применяется к **проходу** ревью, а не к блоку (класс исключений закрыт четырьмя условиями).
- **Списки закрыты:** шесть findings нарезки (+ седьмая «резчик ≠ исполнитель» как находка),
  четыре рода следа, семь вердиктов гейта, четыре причины второй двери. Род или причина вне
  списка — ошибка входа, а не «прочее».
- **Пустой корпус → «КОРПУСА НЕТ»**, никогда «нарушений 0». Нет `window`/`revisionAt` → ошибка
  входа, а не «всё свежее».
- **Перерезка = новая версия плана и новая ратификация**; правка тела сбрасывает ратификацию
  дайджестом. Переполнение в работе — управленческое решение с рекомендациями, не тихая резка.
- **Два носителя следа из четырёх и два входа петли опыта не построены** — метрики честно отдают
  `defined:false` с причиной, процент не печатается. Выдавать это за полноту запрещено.

```

## File: .opencode/skills/membrana-local-sprint/SKILL.md

```md
---
name: membrana-local-sprint
description: >-
  Membrana local sprint: cross-agent skill for the single canonical local sprint
  procedure. Use when the user says membrana-local-sprint, локальный спринт,
  честный спринт, honest-sprint, нарезка задачи, ратифицируй нарезку, гейт
  исполнения, sprint:cut, sprint:gate, sprint:experience, or asks to run an
  agent task through the sprint procedure.
---

# Membrana local sprint

Delegate to the project canonical playbook:
[`../../../.cursor/skills/membrana-local-sprint/SKILL.md`](../../../.cursor/skills/membrana-local-sprint/SKILL.md).

Run it verbatim. Normalize old `honest-sprint` wording to `membrana-local-sprint`.
New local sprint tasks use `sprintKind: "membrana-local-sprint"` and instances in
`docs/local-sprint/<id>/`.

```

## File: .cursor/skills/README.md

```diff
diff --git a/.cursor/skills/README.md b/.cursor/skills/README.md
index 3abc685c..61ee4767 100644
--- a/.cursor/skills/README.md
+++ b/.cursor/skills/README.md
@@ -46,7 +46,7 @@ Project-scoped skills for Cursor Agent and Claude Code (mirror in `.claude/skill
 | [`membrana-truth-crystallization`](./membrana-truth-crystallization/SKILL.md) | «кристаллизация правды», «токены правды», бриф при закрытии сессии: до 3 вопросов владельцу о невыводимых фактах → синтез парами (только дедукция); mirrored to Claude |
 | [`membrana-telegram-swallow`](./membrana-telegram-swallow/SKILL.md) | «ласточка»; тон — линза Ожегова; кликабельность — `yarn live-links` (отдельно); mirrored Claude/Codex |
 | [`membrana-cowork`](./membrana-cowork/SKILL.md) | коворк, `yarn cowork:open` — 3 изолированных блока одной разработки → Interface Consilium → интеграция адаптерами; mirrored to Claude/Codex |
-| [`membrana-honest-sprint`](./membrana-honest-sprint/SKILL.md) | честный спринт, нарезка задачи, гейт исполнения — `yarn sprint:cut` / `sprint:gate` / `sprint:experience`: тимлид режет, владелец ратифицирует, гейт проверяет что прогон через контекст СОСТОЯЛСЯ, обе стороны пишут «предсказание ↔ исход»; mirrored to Claude |
+| [`membrana-local-sprint`](./membrana-local-sprint/SKILL.md) | локальный спринт, честный спринт, нарезка задачи, гейт исполнения — единый local sprint-route; `yarn sprint:cut` / `sprint:gate` / `sprint:experience` + `procedure-run:journal`; mirrored to Claude / Codex agents / Opencode |
 | [`membrana-case-mining`](./membrana-case-mining/SKILL.md) | добыча кейсов из JSONL-транскриптов: `yarn sessions:scan/extract`, Raw только с указателями {sessionId, uuid, timestamp} и побайтовой сверкой; кандидаты по форме M4/case-meta-1; печать — слово капитана; mirrored to Claude |
 | [`membrana-bridge`](./membrana-bridge/SKILL.md) | мостик, «идём на мостик», зови попугая, долги мостика — комната капитана (Ангелина + Фаррелл + попугай): `yarn bridge open` (явно) / `tools` (инструментарий ведущей из кита `kits/angelina-bridge`) / `debt …`; закрытие — вечерним ритуалом, руками нельзя; mirrored Claude/Agents/OpenCode |
 | [`membrana-storm`](./membrana-storm/SKILL.md) | шторм, storm, «пошумим», породить тезисы, конспект будущего доклада — дивергентный формат: беседа → тезисы (Ангелина + 5 персон + питомец); регламент `STORM_REGULATION.md`; ≠ заседание; mirrored to Claude/Codex |

```

## File: docs/LOCAL_SPRINT_ACTIVE.md

```md
# Active membrana-local-sprint

Текущий локальный sprint-route: [`membrana-local-sprint`](./procedures/membrana-local-sprint/README.md).

## Focus

- **procedure-run-journal-2026-08-01** · OPEN [`docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md`](./local-sprint/procedure-run-journal-2026-08-01/OPEN.md) · F1 code pass, но процедура blocked: не было нарезки, ратификации и подключения команды · F2/F3 не заведены · ветка `codex/procedure-run-journal`

## Правило

Новые локальные задачи спринта регистрируются с `sprintKind: "membrana-local-sprint"`.
Старые `day-sprint` записи остаются историей, но не используются как новый вход.

```

## File: docs/LOCAL_SPRINT_LOG.md

```md
# Membrana local sprint log

Хронология локальных спринтов (`sprintKind: membrana-local-sprint` в реестре).
Активный спринт — [`LOCAL_SPRINT_ACTIVE.md`](./LOCAL_SPRINT_ACTIVE.md).

---

## 2026-08-01 — `procedure-run-journal-2026-08-01` — **OPEN**

- **Goal:** журнал прогона процедур: local trail с subject/evidence/gaps, чтобы прогон доказывал покрытие предмета, а не только факт запуска
- **OPEN:** [`local-sprint/procedure-run-journal-2026-08-01/OPEN.md`](./local-sprint/procedure-run-journal-2026-08-01/OPEN.md)
- **Prompt:** [`prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md`](./prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md)
- **F1:** `procedure-run-journal-f1-local-trail` — code pass / procedure blocked; local JSONL trail + CLI + tests; report [`F1_REPORT.md`](./local-sprint/procedure-run-journal-2026-08-01/F1_REPORT.md)
- **Procedure gap:** предрабочая нарезка, ратификация владельца и подключение команды не состоялись; pass по всей процедуре не засчитывается

```

## File: docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md

```md
# Membrana Local Sprint OPEN: procedure-run-journal-2026-08-01

| Поле | Значение |
|------|----------|
| Sprint | `procedure-run-journal-2026-08-01` |
| Procedure | `membrana-local-sprint` |
| Registry epic | `procedure-run-journal-2026-08-01` |
| Prompt | [`PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md`](../../prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md) |
| Lead | vesnin |
| Support | dynin · ozhegov |
| Status | blocked |

## Зачем

Хендоф 2026-08-01 поставил первым номером журнал прогона процедур: механизм
должен помнить, какой предмет он обещал покрыть, какие evidence предъявил и где
остались gaps. Без этого вечерние/ревью-процедуры могут быть механически зелёными
и предметно слепыми.

## Фазы

| Фаза | Карточка | Lead | Статус | Выход |
|------|----------|------|--------|-------|
| F1 | `procedure-run-journal-f1-local-trail` | dynin | code pass / procedure blocked | local JSONL trail + CLI + tests · [`F1_REPORT.md`](./F1_REPORT.md) |
| F2 | _(не заведена)_ | vesnin | planned | wire one real procedure into trail |
| F3 | _(не заведена)_ | dynin | planned | server/checkpoint or replay decision |

## F1 Definition of Done

- `docs/procedure-runs/README.md`
- `scripts/lib/procedure-run-journal.mjs`
- `scripts/procedure-run-journal.mjs`
- `scripts/procedure-run-journal.test.mjs`
- `package.json` script `procedure-run:journal`
- `node --test scripts/procedure-run-journal.test.mjs scripts/run-ledger.test.mjs`

F1 report: [`F1_REPORT.md`](./F1_REPORT.md). Процедурный статус не pass:
предрабочая нарезка, ратификация владельца и подключение команды не состоялись.

## Не делаем в F1

- Не строим проигрыватель процедур.
- Не подписываем серверный checkpoint.
- Не проводим все существующие процедуры.

```

## File: docs/local-sprint/procedure-run-journal-2026-08-01/F1_REPORT.md

```md
# F1 report: local procedure run trail

| Поле | Значение |
|------|----------|
| Sprint | `procedure-run-journal-2026-08-01` |
| Procedure | `membrana-local-sprint` |
| Phase | `procedure-run-journal-f1-local-trail` |
| Lead | dynin |
| Status | blocked at procedure frame |

## Что закрыто как кодовый F1 DoD

- `docs/procedure-runs/README.md` описывает локальный JSONL-home и честное ограничение F1.
- `scripts/lib/procedure-run-journal.mjs` строит, валидирует, читает и суммирует записи.
- `scripts/procedure-run-journal.mjs` даёт CLI `append` / `check` / `report`.
- `package.json` содержит `procedure-run:journal`.
- `scripts/procedure-run-journal.test.mjs` покрывает pass/evidence, gaps, append/read и report.

## Что НЕ прошло как `membrana-local-sprint`

- Не было предрабочей нарезки плана через `sprint:cut`.
- Не было явной ратификации владельца до работы.
- Команда не была подключена как реальные профильные контексты по фреймам.
- `sprint:gate` не проверял четыре рода следа `contract_signature` / `session_prep` /
  `context_run` / `review_pass`.

Вердикт: F1 code DoD выполнен, но процедура `membrana-local-sprint` для этого
задания **не прошла все фреймы**. Называть её pass нельзя до отдельного честного
прогона с планом, ратификацией и следом команды.

## Проверки

- `node --test scripts/procedure-run-journal.test.mjs scripts/run-ledger.test.mjs` — 14/14 pass.
- `node scripts/procedure-run-journal.mjs check --trail docs/procedure-runs/trail/2026-08-01.jsonl` — ok, 3 records.
- `node scripts/procedure-run-journal.mjs report --trail docs/procedure-runs/trail/2026-08-01.jsonl` — total 3, pass 2, blocked 1; gaps name missing planning, ratification, team contexts and sprint gate.
- `node scripts/test-scripts-run.mjs --group tasks` — 555/555 pass.

## Честный предел

`membrana-local-sprint` был нормализован после первоначального старта F1, поэтому этот
report не выдаёт себя за предрабочую ратификацию нарезки. Он фиксирует разделение:
кодовый предмет F1 выполнен, а процедурный прогон заблокирован на отсутствующих
фреймах планирования, ратификации и подключения команды.

```

## File: scripts/task-start.mjs

```mjs
#!/usr/bin/env node
/**
 * yarn task:start — канон START lifecycle (#722):
 *   GitHub Issue (опционально) → task:register → prompt stub + acceptance.
 *
 * Windows: body Issue только через tempfile + `gh --body-file` (не bash-heredoc).
 * Существующий `yarn task:register` не ломаем — вызываем его как шаг.
 *
 * Usage:
 *   yarn task:start --id <slug> --title "…" --size S|M|L
 *                   [--issue N] [--no-issue] [--body-file path] [--dry-run]
 *                   [--kind …] [--lead …] [--support a,b] [--prompt path]
 *                   [--parent-epic id] [--research] [--labels a,b]
 *                   [--linear DRU-N]
 *
 * Канон: Issue = удостоверение; Linear UI-доска = зеркало GitHub (не WIP);
 * слой движения = linear-snapshot@1 (ADR-0017). `task:start` пишет linearId,
 * состояние Linear не двигает (Started — follow-up после LGTM ADR).
 * Повторный START с тем же --id не создаёт второй Issue / Linear twin.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { makeLongTempDir } from './lib/long-temp-path.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseRegisterArgs } from './task-register.mjs';
import { loadRegistry, renderTaskPromptStub } from './lib/task-registry.mjs';
import { resolveGithubIssueAction, resolveLinearAttach } from './lib/task-start-links.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ACCEPTANCE_SECTION = `
---

## Acceptance criteria (scaffold)

> Заполнить до кода. Чеклист приёмки = Definition of Done + явные AC Issue.

- [ ] …
- [ ] …
`;

/**
 * @param {string[]} argv
 */
export function parseStartArgs(argv) {
  // Сначала вынуть флаги start: иначе parseRegisterArgs съест соседний аргумент
  // как value у неизвестного `--dry-run` / `--no-issue`.
  const pass = [];
  const out = {
    dryRun: false,
    noIssue: false,
    bodyFile: null,
    labels: ['tooling'],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (a === '--no-issue') {
      out.noIssue = true;
      continue;
    }
    if (a === '--body-file' || a.startsWith('--body-file=')) {
      out.bodyFile = a.includes('=') ? a.split('=')[1] : argv[++i];
      continue;
    }
    if (a === '--labels' || a.startsWith('--labels=')) {
      const val = a.includes('=') ? a.split('=')[1] : argv[++i];
      out.labels = String(val)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    pass.push(a);
  }
  return { ...parseRegisterArgs(pass), ...out };
}

/** Дефолтное тело Issue (Windows-safe через файл). */
export function defaultIssueBody({ id, title, size, promptPath }) {
  return `## Summary

**Размер:** ${size} · **Реестр:** \`${id}\`

${title}

## Acceptance criteria

- [ ] DoD из task-промпта выполнен
- [ ] Карточка в \`docs/tasks/registry.json\` (\`status: active\`)
- [ ] PR с \`Closes #<это-issue>\`

## Links

- Prompt: \`${promptPath || `docs/prompts/${id.replace(/-/g, '_').toUpperCase()}_PROMPT.md`}\`
- Registry: \`docs/tasks/registry.json\`
- Umbrella / parent: —

Started via \`yarn task:start\`.
`;
}

/**
 * Создать Issue через --body-file (не heredoc).
 * @returns {number|null} issue number
 */
export function createIssueWithBodyFile({ title, body, labels = [], dryRun = false, gh = execFileSync }) {


[... clipped at 3500 chars ...]

```

## File: scripts/task-register.mjs

```mjs
#!/usr/bin/env node
/**
 * task:register (#469 ti-3): регистрация карточки в docs/tasks/registry.json без
 * ручного JSON и merge-конфликтов. Схема-валидация → детерминированная вставка в
 * начало tasks[] → sync README → insight:drift-чек.
 *
 * Формат registry НЕ меняется (миграция хранилища = insight task-archive-storage).
 * Конфликт параллельных сессий лечится РЕГЕНЕРАЦИЕЙ, не ручным merge: при
 * --push отказе делаем pull --rebase и перестраиваем вставку на свежем реестре
 * (ephemeral regeneration, research Q1 консилиума agent-tooling-friction-2).
 *
 * Usage:
 *   yarn task:register --id <slug> --title "…" --size M [--issue N] [--linear DRU-N]
 *                      [--kind day-sprint] [--lead vesnin] [--support a,b] [--insight <id>]
 *                      [--notes "…"] [--prompt docs/prompts/X.md] [--research] [--push]
 *
 * Повторный register с тем же --id: дописывает недостающие githubIssue/linearId
 * (anti-duplicate), не создаёт twin-карточку.
 *
 * --research (#514): в промпт кладётся заготовка секции «Вопросы для research».
 * Вопросы формулирует агент из контекста спринта, затем `yarn research <id>`
 * шлёт их в Perplexity. Флаг опт-ин: три рана на «расскажи про X вообще» — не ресёрч.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { researchSectionStub } from './lib/deep-research.mjs';
import {
  buildTaskEntry,
  loadRegistry,
  renderTaskPromptStub,
  saveRegistry,
  syncTasksReadme,
} from './lib/task-registry.mjs';
import { registerOrLinkTask } from './lib/task-start-links.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Разбор `--flag value` / `--flag=value` / `--bool`. Экспорт ради тестов. */
export function parseRegisterArgs(argv) {
  const out = { support: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eq = a.startsWith('--') && a.includes('=') ? a.slice(2).split(/=(.*)/s) : null;
    const key = eq ? eq[0] : a.startsWith('--') ? a.slice(2) : null;
    const val = eq ? eq[1] : argv[i + 1];
    if (!key) continue;
    if (key === 'push') { out.push = true; continue; }
    if (key === 'research') { out.research = true; continue; }
    if (!eq) i++;
    if (key === 'support') out.support = val.split(',').map((s) => s.trim()).filter(Boolean);
    else out[key] = val;
  }
  return out;
}

function sh(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

const isMain = process.argv[1]?.endsWith('task-register.mjs');
if (isMain) {
  const cli = parseRegisterArgs(process.argv.slice(2));
  if (!cli.id || !cli.title || !cli.size) {
    console.error('Usage: yarn task:register --id <slug> --title "…" --size S|M|L [--issue N] [--kind …] [--lead …] [--support a,b] [--insight …] [--notes …] [--prompt <path>] [--parent-epic <id>] [--push]');
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);

  // Одна попытка: собрать запись, insert или upsert связей, sync README.
  const applyOnce = async () => {
    const registry = loadRegistry(root);
    const entry = buildTaskEntry(cli, today);
    const mode = registry.tasks.some((t) => t.id === entry.id) ? 'upsert-links' : 'insert';
    const result = registerOrLinkTask(registry, entry, mode);
    saveRegistry(result.registry, root);
    await syncTasksReadme

[... clipped at 3500 chars ...]

```

## File: scripts/archive-task.mjs

```mjs
/**
 * Архивирует задачу в docs/tasks/registry.json и создаёт карточку docs/tasks/archive/<id>.md
 *
 * Usage:
 *   yarn task:archive <task-id> [--notes "текст"] [--force]
 */
import {
  archiveCardPath,
  findTask,
  loadRegistry,
  saveRegistry,
  syncTasksReadme,
  validateTaskId,
  writeArchiveCard,
} from './lib/task-registry.mjs';
import { runLeadPersonaGate } from './trace-gate.mjs';

function printHelp() {
  console.log(`Usage: yarn task:archive <task-id> [--notes "…"] [--force]

  <task-id>   Поле id из docs/tasks/registry.json (kebab-case).
  --notes     Заметка в карточке архива (PR, итог).
  --force     Переархивировать, если уже archived.
  --dry-run   Показать, что будет сделано, и НЕ писать.
  --help      Эта справка.

Пример:
  yarn task:archive fft-indices-viz --notes "PR #45, plugin merged"`);
}

/**
 * Известные флаги. Неизвестный — ОТКАЗ, а не молчаливое игнорирование (TF-4, #554).
 *
 * Живой случай 16.07: `--dry-run` не поддерживался и просто отфильтровывался как
 * «что-то с двумя дефисами» → скрипт заархивировал задачу ПО-НАСТОЯЩЕМУ с заметкой
 * «test», пришлось перезархивировать через --force. Флаг, который молча делает
 * вместо того, чтобы показать, — деструктив под видом проверки.
 */
const KNOWN_FLAGS = new Set(['--help', '-h', '--force', '--notes', '--dry-run']);

export function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    return { help: true };
  }
  const positional = [];
  let notes = null;
  let force = false;
  let dryRun = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      if (!KNOWN_FLAGS.has(arg)) {
        throw new Error(
          `Неизвестный флаг: ${arg}. Известные: ${[...KNOWN_FLAGS].join(', ')}`,
        );
      }
      if (arg === '--force') force = true;
      else if (arg === '--dry-run') dryRun = true;
      else if (arg === '--notes') notes = args[++i] ?? null;
      continue;
    }
    positional.push(arg);
  }
  return { help: false, id: positional[0], notes, force, dryRun };
}

let opts;
try {
  opts = parseArgs(process.argv);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
if (opts.help) {
  printHelp();
  process.exit(opts.id === undefined && process.argv.length <= 3 ? 0 : 0);
}

if (!opts.id) {
  console.error('Укажите <task-id>. См. yarn task:archive --help');
  process.exit(1);
}

try {
  validateTaskId(opts.id);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const registry = loadRegistry();
const task = findTask(registry, opts.id);

if (!task) {
  console.error(`Задача не найдена

[... clipped at 2672 chars ...]

```

[ticket clipped: remaining zone files are listed above and available in the workspace]
