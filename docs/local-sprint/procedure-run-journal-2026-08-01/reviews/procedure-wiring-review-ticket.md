# ??????: review ????????? ? ??????????????? ??????

Persona: vesnin
Block: procedure-wiring-review
Plan: docs/sprint/cut/procedure-run-journal-2026-08-01-code-review.json

## ?????? ?????

?? ??????????? ????????????? ?? ????? ????? membrana-local-sprint. ???????? ??? ???? ? ??? code-review verdict: LGTM ??? BLOCK. ???? BLOCK, ????????? ?????????? ????? ? ???????????. ?? ????????????? ?????????? ??????.

## ?????

- ???????, ??? membrana-local-sprint ???? ???????????? ????????? sprint-kind.
- ??????? ??????? ?????????, registry, skill mirrors ??? Cursor/Claude/Agents/OpenCode.
- ???????, ??? ????????? LOCAL_SPRINT_* ?????? ???????? ???????? ??????? ?????? ? ????? review-sprint.

## ????

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
   вердикт: contract | findings | unreadable   (findings и unreadable — оба красные)

2. РАТИФИКАЦИЯ — владелец говорит «ратифицирую», ИНСТРУМЕНТ пишет отметку
     yarn sprint:cut --plan <p> --ratify --at <ISO со смещением>
   правка тела после согласия СБРАСЫВАЕТ ратификацию (дайджест) — это не баг

3. РАБОТА — исполнители идут через свой профильный контекст; акты пишутся в ленту вещдоков
     docs/sprint/trail/<windowId>.jsonl   (append-only, четыре рода следа)

4. ГЕЙТ — Ангелина проверяет, что ответственность реальна
     yarn sprint:gate --plan <план> --traces <лента>
   код 0 — да · 1 — нет · 2 — проверка НЕ состоялась (это разные вещи)

5. ОПЫТ — сопоставление предсказания с исходом, два автора и две метрики
     yarn sprint:experience --record <прогон>

6. ЖУРНАЛ ПРОГОНА — локальная запись предмета, evidence и gaps
     yarn procedure-run:journal append --procedure membrana-local-sprint --run-id <id> --status pass|fail|blocked|skipped --subject "..."
```

## Что проверяет нарезка — шесть findings, список закрыт

`cut_shape` · `bl

[... clipped at 4500 chars ...]

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

[ticket clipped: remaining files are listed above; inspect workspace paths directly if needed]