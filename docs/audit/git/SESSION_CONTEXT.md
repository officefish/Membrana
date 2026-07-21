# SESSION_CONTEXT — git audit container followup

Краткий рабочий контекст для продолжения. При старте сессии читать **перед** Scenario A/B.

| | |
|---|---|
| **Worktree** | `C:\Users\user190825\practice\Membrana-codex` |
| **Ветка** | `docs/audit-git-container-followup` |
| **Цель** | Подготовить контейнер веток как **удобный ассортимент** под рефакторинг спринта и code review — покрыть любую работу |
| **Не путать с** | `Membrana-grok` — другое дерево/сессия (`feature/scripts-boundary-container`) |

## Задание владельца (2026-07-21, вечер)

Контейнер `docs/audit/git/` — не только hygiene/GC. Нужен ассортимент веток,
которым можно **покрыть любую работу** при рефакторинге спринта и code review.
Для этого агент обязан хорошо знать:

1. **Структуру работы** — форматы (`docs/FORMATS.md`), единицы счёта
   (`UNITS_DICTIONARY`), классы деревьев (`WORKTREE_CLASSES`), грамматику веток
   Р4 (`[<персона>/]<kind>/<slug>` + ортогональные теги).
2. **Историю пушей** — оси имён из 500 merged PR + живые open PR + ретроспективу
   таксономии (501 PR → 6 стихийных осей).

Гигиена (7 категорий Scenario A/B) остаётся органом контейнера; поверх неё —
второе измерение: **покрытие жанров работы** (kind / формат / держатель).

## Регламент исполнения (обязателен)

Работа идёт как **day-sprint** по канону:

| Норма | Канон |
|-------|--------|
| Постановка M/L | [`TASK_PROMPT_WORKFLOW.md`](../../prompts/TASK_PROMPT_WORKFLOW.md) · `yarn task:start` |
| Эпик + фазы | `parentEpic` · отдельная карточка/Issue/промпт на фазу · archive по фазе |
| Держатель фазы | `leadPersona` = виртуальный программист (не исполнитель-агент) |
| Роли | [`VIRTUAL_TEAM_PROMPT.md`](../../VIRTUAL_TEAM_PROMPT.md) |
| Закрытие | [`TASK_CLOSURE_REGULATION.md`](../../prompts/TASK_CLOSURE_REGULATION.md) · `yarn task:archive` |
| Образец нарезки | `procedural-layer-impl` (#781): Р1 angelina → Р2 ozhegov → Р3 dynin → Р4 rodchenko → Р5 vesnin |

**Запрещено до слова владельца:** `task:start` / регистрация эпика «с потолка»,
расширение scope без Issue, GC `--execute` без ok.

### Спринт зарегистрирован (2026-07-21 вечер)

Эпик: `branch-assortment-sprint` · [#801](https://github.com/officefish/Membrana/issues/801) · lead **vesnin** · L  
Linear R1: **pending** (MCP Druid fetch failed в сессии; `linearId: null` допустим).

| Фаза | id | Issue | leadPersona | Суть |
|------|-----|------:|-------------|------|
| Ф0 | `ba-f0-brief` | [#802](https://github.com/officefish/Membrana/issues/802) | **vesnin** | эпик-промпт, границы, DoD |
| Ф1 | `ba-f1-inventory` | [#803](https://github.com/officefish/Membrana/issues/803) | **ozhegov** | Scenario A + история пушей |
| Ф2 | `ba-f2-coverage` | [#804](https://github.com/officefish/Membrana/issues/804) | **dynin** | карта покрытия жанров |
| Ф3 | `ba-f3-assortment` | [#805](https://github.com/officefish/Membrana/issues/805) | **ozhegov** | орган ассортимента в контейнере |
| Ф4 | `ba-f4-review-lens` | [#806](https://github.com/officefish/Membrana/issues/806) | **rodchenko** | линза CR / ship |
| Ф5 | `ba-f5-closure` | [#807](https://github.com/officefish/Membrana/issues/807) | **angelina** | CLOSURE / handoff |

Цепь: Ф0→Ф5. **Статус вечер 21.07:** Ф0–Ф4 артефакты в дереве; **Next:** коммит/PR + Ф5 archive.  
Не колонизировать: Р4 / `procedural-layer-impl`, `repo:clean --execute`.

## Картина истории (снято 2026-07-21 вечер, 500 merged PR)

Префиксы (первый сегмент имени ветки), топ:

| Count | Prefix | Ось |
|------:|--------|-----|
| 197 | `feat` | kind (тип) |
| 68 | `chore` | kind |
| 56 | `fix` | kind |
| 51 | `docs` | kind |
| 23 | `feature` | kind-дубль (Р4: умирает) |
| 17 | `night` | формат / freeze-тег |
| 10 | `codex` | агент (вне канона Р4) |
| 7 | `developer-rhythm-lifecycle` | long-lived task branch |
| 7 | `claude` / `techies68` | агент / legacy |
| 6 | `truth` / `sprint` | формат |
| 5 | `vesnin` | персона-грамматика (растёт 21.07) |
| ≤4 | `tooling`, `meeting`, `research`, `night-hunt`, `cursor`, `angelina`, `cowork`, `comp`… | формат / персона |

Из последних 200 merged: type≈146 · format≈28 · persona≈6 · agent≈6 · other≈14.
Живая грамматика Р4 уже в main: `angelina/storm/…`, `vesnin/meeting/…`,
`angelina/feat/pl-r1-home`, `vesnin/chore/…`.

Open PR (на момент снимка): #798 `feat/pl-r2-vocabulary`, #759/#709 night-hunt,
#575/#574/#525/#517 — старый хвост.

## Структура работы (опоры)

| Слой | Канон | Что даёт ассортименту |
|------|-------|------------------------|
| Форматы | `docs/FORMATS.md` | competition · cowork · hackathon · night · meeting · storm |
| Единицы | `docs/tasks/UNITS_DICTIONARY.md` | счёт = GitHub-issue; контейнер Linear ≠ счёт |
| Деревья | `docs/WORKTREE_CLASSES.md` | lifecycle (canon/sprint-*) ⊥ sync (fresh/ff/diverged) |
| Грамматика | M4 / EPIC Р4 | `[persona/]kind/slug` + теги; night ≠ держатель |
| Процедуры | `docs/procedures/` · T10–T13 | скрипт ≠ кит ≠ процедура |
| Паттерн | `GROUP_CONTAINERIZATION` | контракт·реестр·кеш·инструменты·агент |

## Два измерения контейнера

| Измерение | Вопрос | Орган сейчас |
|-----------|--------|--------------|
| **Гигиена** (7 cat) | Можно ли трогать / сносить / salvage? | `registry/BRANCHES_DECOMPOSE_LIST.md` + Scenario B |
| **Ассортимент** (покрытие работы) | Есть ли представитель каждого жанра работы для рефактора спринта и CR? | [`analysis/branch-assortment-coverage-2026-07-21.md`](./analysis/branch-assortment-coverage-2026-07-21.md) · Scenario Assortment в AGENT_PROMPT §8 |

Жанры, которые ассортимент обязан уметь указать (из истории + форматов):

- kind: `feat` `fix` `docs` `chore` `tooling` (+ отказ `feature`)
- формат: `storm` `meeting` `cowork` `comp` `night`/`night-hunt` `truth` `sprint` `research`
- держатель: persona-prefix vs явная карточка vs long-lived (`developer-rhythm-lifecycle`)
- доставка: open PR · salvage · leftover · persona · baseline `base/*`
- деревья: canon vs sprint-open/closed

## Gotcha

`cursor` `move_agent_to_root` → Membrana-codex **падает** (ветка уже занята в другом дереве / коллизия с grok). Продолжать по пути Membrana-codex явно (`cd` / `working_directory`), не ждать re-root.

## Недавний GC (2026-07-21)

- cat6 — почищена
- cat5 A4 + cowork — discarded
- likely-discard wave — shipped **#779**
- Осталось на ревью: **codex / comp-alarm / night / cat7**

## Следующие шаги

1. ~~Scenario A~~ — done (`944d1172`, Meta + dated).
2. ~~Coverage + орган + линза~~ — done (analysis + README/AGENT_PROMPT §8).
3. **Коммит / PR** постановки + артефактов спринта (по слову владельца).
4. **Ф5** — CLOSURE + `yarn task:archive` фаз/эпика со свидетельством PR.
5. Deep / GC leftover — только после явной категории (HARD GATE Scenario B).

## Опоры

- Entry: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md)
- Layout: [`README.md`](./README.md)
- Skills: `membrana-branch-audit` · `membrana-branch-decompose`
- Ретро: [`analysis/branch-taxonomy-retrospective-2026-07-21.md`](./analysis/branch-taxonomy-retrospective-2026-07-21.md)
- Шторм: [`docs/storm/storm-branch-taxonomy-2026-07-21/`](../../storm/storm-branch-taxonomy-2026-07-21/REPORT.md)
- Паттерн: [`docs/patterns/GROUP_CONTAINERIZATION.md`](../../patterns/GROUP_CONTAINERIZATION.md)
