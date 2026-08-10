# Промпт: Хвост очереди S хендофа 09.08: вердикт долга typecheck + обязательность записи «предсказание ↔ исход»

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — вердикт-вещдок по долгу typecheck
> (+ карточка починки линков) и гейт обязательности записи прогноза.
> Реестр: `id` = `s-queue-tail-2026-08-10` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Процедура: `membrana-local-sprint`; прогон — `docs/local-sprint/s-queue-tail-2026-08-10/`.

---

## Контекст

Владелец 10.08 велел вести S-строки десятки хендофа 09.08 по очереди шотами или спринтами.
Две строки закрылись шотами (вердикты детекторов `e387e2ba`, проба резака `1ada87e4`);
на третьем шоте предикат `evaluateOneShotS` честно отказал `capability_chaining` (сумма
цепочки за 7 суток вышла из S). По прецеденту 04.08 (`sprint-dictionary-to-lib`) отказ
предиката шоту → спринт. Штамп маршрута — tarasov, 10.08.

Два предмета, две зоны, ничего общего кроме очереди:

**b1 — долг typecheck из ревью 08.08** (дважды в DoD `DAILY_CODE_REVIEW`, дважды перенесён).
Разведка сделана: `background-cabinet` — зелёный живьём; `background-office` — зелёный
в CI ствола на `273f936d`, локально красный ТОЛЬКО из-за резолюции в чужое дерево
(`node_modules/@membrana/core` → Membrana-grok от 29.07 без контракта static-registry #1828;
`@membrana/static-registry-service` в node_modules отсутствует). Класс #1647. Осталось:
записать вердикт вещдоком и завести карточку починки линков (условие tarasov из шота №1).

**b2 — долг `#forecast-record-step-optional`** (мостик, open с 07.08): провод
«предсказание ↔ исход» построен (`yarn sprint:experience`, `forecast-records.jsonl`),
но ни один гейт записи не требует — 13 нарезок с записью из 47, последняя 03.08,
роды пишутся руками. Нужен гейт: закрытие прогона спринта без записи прогноза — стоп.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`docs/procedures/membrana-local-sprint/README.md`](../procedures/membrana-local-sprint/README.md) | процедура прогона |
| [`docs/bridge/DEBTS.md`](../bridge/DEBTS.md) строка `forecast-record-step-optional` | точная формулировка долга b2 |
| [`docs/precedents/2026-08-10-detectors-red-ci-verdict-foreign-tree.md`](../precedents/2026-08-10-detectors-red-ci-verdict-foreign-tree.md) | тот же корень #1647, вещдоки |
| `scripts/execution-gate.mjs` · `scripts/lib/sprint-integration/` | шов для гейта b2 |

**GitHub Issue:** — (не заведён: S-очередь дня, след — реестр + спринт-прогон)

---

### Definition of Done

- [ ] b1: вердикт долга typecheck записан вещдоком (обе половины: cabinet живьём, office по CI ствола); карточка починки линков заведена в реестре.
- [ ] b2: закрытие прогона `membrana-local-sprint` без записи «предсказание ↔ исход» невозможно (стоп, не жалоба); зуб на оба исхода.
- [ ] `yarn test:scripts` зелёный; scope-typecheck затронутых скриптов зелёный.
- [ ] LGTM Teamlead.

### Out of scope

- Сама починка симлинков node_modules (отдельная карточка, её заводит b1).
- Правки `packages/background-*` (сервер) — их в спринте нет вовсе.
- Обязательность прогноза для других процедур (one-shot, ритуалы) — только спринт-прогон.
