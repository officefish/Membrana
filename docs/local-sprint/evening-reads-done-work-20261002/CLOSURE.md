# Membrana Local Sprint CLOSURE: evening-reads-done-work-20261002

| Поле | Значение |
|------|----------|
| Sprint | `evening-reads-done-work-20261002` · [`OPEN.md`](./OPEN.md) |
| Plan | [`evening-reads-done-work-20261002.json`](../../sprint/cut/evening-reads-done-work-20261002.json) — ратифицирован владельцем 2026-10-02T10:26:49+03:00, digest `39de4c58…`, `sprint:cut` → `contract` |
| Blocks | b1 (vesnin) · b2 (tarasov) · b3 (angelina) |
| Traces | [`execution-traces.jsonl`](./execution-traces.jsonl) · ревью в [`reviews/`](./reviews/) |
| Segments | [`evening-reads-done-work-20261002.segments.json`](../../sprint/experience/evening-reads-done-work-20261002.segments.json) |
| Branch / tree | `codex/evening-reads-done-work-20261002` · `C:\Users\user190825\practice\Membrana-evening-reads-done-work` |
| PR | #2551 · `--no-merge`; merge/deploy запрещены словом владельца |

## Что изменено

- `review-done-ledger` и его порт сохраняют file-list oversized PR и печатают носители результата: `CLOSURE`/`AUDIT`/`OPEN`, sprint plan, sprint experience, report. Если `CLOSURE` в диффе нет, блок прямо пишет: `CLOSURE в диффе не найден — не выдумывать закрытие`.
- `day-work-diff` для oversized сегментов больше не отдаёт голую строку «дифф не развёрнут»: он тянет `git diff --name-only` и даёт replacement по носителям результата.
- `code-review:pr` task context теперь печатает provenance дневных документов: `cwd`, `git-root`, SHA последнего коммита для `docs/MAIN_DAY_ISSUE.md` и `docs/CURRENT_TASK.md`.

## Доказательства

### Focused tests

Команда:

```powershell
node --test scripts\lib\review-done-ledger.test.mjs scripts\team-evening-feedback-ritual.test.mjs scripts\day-work-diff.test.mjs scripts\code-review-ritual.test.mjs
```

Вывод:

```text
ℹ tests 73
ℹ pass 73
ℹ fail 0
ℹ duration_ms 5624.8642
```

### Live done-ledger 02.10

Команда:

```powershell
node --input-type=module -e "import { collectDoneLedgerBlock } from './scripts/lib/review-done-ledger-port.mjs'; const r = collectDoneLedgerBlock({ today: '2026-10-02', days: 2 }); console.log(r.block);"
```

Ключевой вывод:

```text
(книга сделанного недоступна: gh issue list ... — билеты не опрошены; судить «разбор не сделан» по этому блоку нельзя)
- **#2544** ... → билеты не опрошены; носители результата: `docs/discussions/personas-source-phase1-report.md` (report), `docs/sprint/cut/personas-source-phase1.json` (sprint plan); CLOSURE в диффе не найден — не выдумывать закрытие
- **#2543** ... → билеты не опрошены; носители результата: `docs/local-sprint/angelina-hostess-impl/AUDIT.md` (AUDIT), `docs/sprint/cut/angelina-hostess-impl-20261001.json` (sprint plan), `docs/sprint/experience/angelina-hostess-impl-20261001.segments.json` (sprint experience); CLOSURE в диффе не найден — не выдумывать закрытие
- **#2530** ... носители результата: `docs/local-sprint/ritual-reads-decisions/CLOSURE.md` (CLOSURE), ...
```

Смысл: #2543/#2544 больше не выглядят как пустые oversized; отсутствие `CLOSURE` не превращается в выдуманный «закрыт», но и не даёт объявить результат несделанным без проверки носителей.

### code-review:pr provenance

Команда:

```powershell
node --input-type=module -e "import { appendTaskContext } from './scripts/lib/code-review-ritual.mjs'; const block = appendTaskContext('pr'); console.log(block.split('\n').slice(0, 10).join('\n'));"
```

Вывод:

```text
## Task context (pr)

> Источник документов дня: cwd=`C:\Users\user190825\practice\Membrana-evening-reads-done-work`; git-root=`C:/Users/user190825/practice/Membrana-evening-reads-done-work`; docs/MAIN_DAY_ISSUE.md: 19b95bb908ab; docs/CURRENT_TASK.md: 4494c0fd10d5

### MAIN_DAY_ISSUE.md
```

Смысл: `code-review:pr` читает документы дня из рабочего дерева процесса (`cwd`), а не напрямую из `origin/main`; теперь это видно в самом контексте ревью.

## Прогноз ↔ исход

| Блок | Прогноз | Исход | Род |
|------|---------|-------|-----|
| b1 | Вечер получает закрытые/влитые результаты дня для oversized PR #2543/#2544: заголовок, ticket status, sprint/report carriers, запрет судить «не сделано» без сверки | так: #2544 report+plan, #2543 AUDIT+plan+experience; gh failure не пишет «не заведён» | hit |
| b2 | Daily/PR review заменяет пустой oversized premise на file-list/result-carriers; PR context печатает cwd/source документов дня | так: `day-work-diff` даёт replacement, `appendTaskContext` печатает cwd/git-root/SHA | hit |
| b3 | Живая проверка 02.10, gate, experience, ship без merge | живой done-ledger и provenance пройдены; gate/experience — ниже | hit |

## Признанные пределы

1. Носители результата выводятся только из путей диффа; содержимое `CLOSURE.md` глобально не сканируется.
2. При недоступном `gh issue list` билетный статус неизвестен; блок запрещает судить «разбор не сделан», но не придумывает tickets.
3. `code-review:pr` по-прежнему читает документы дня из `cwd`; правка не меняет источник, а делает его явным.
4. Подписанные дневные документы (`MAIN_DAY_ISSUE`, `DAY_PLAN`, `DAILY_STANDUP`) не правились.

## Гейт и опыт

Команда:

```powershell
node scripts\sprint-experience.mjs --plan docs\sprint\cut\evening-reads-done-work-20261002.json --traces docs\local-sprint\evening-reads-done-work-20261002\execution-traces.jsonl --segments docs\sprint\experience\evening-reads-done-work-20261002.segments.json --now 2026-10-02T11:10:00+03:00
```

Вывод:

```text
Запись рода собрана из ЖИВЫХ файлов: vesnin-evening-reads-done-work-20261002-cut-1 · исход записи: hit
точность нарезки: 100.0% (3/3) · blocksCount=3 · overflowRate=0.0% (0/3) · withoutOutcome=0 · unattributed=0 · missOverflow=0 · missOverCut=0

Журнал: ...\docs\sprint\experience\forecast-records.jsonl · добавлено 1, уже было 0, всего 1
Архив персон: доехало 1, отклонено 0, без исхода 0 (из 1)
```

Команда:

```powershell
node scripts\execution-gate.mjs --plan docs\sprint\cut\evening-reads-done-work-20261002.json --traces docs\local-sprint\evening-reads-done-work-20261002\execution-traces.jsonl --now 2026-10-02T11:12:00+03:00
```

Вывод:

```text
execution-gate · план evening-reads-done-work-20261002
корпус: следов 6 · блоков проверено: 3
  b1-evening-done-sprint-results · vesnin · honest_pair — пара полна: 2 вещдоков
  b2-review-oversized-premise-replacement · tarasov · honest_pair — пара полна: 2 вещдоков
  b3-live-evening-20261002-check · angelina · honest_pair — пара полна: 2 вещдоков
итог: остановок 0 из 3 блоков · зелёных 3 · вторая дверь 0 · находок 0
код возврата: 0
журнал: прогон спринта закрыт — close-запись pass в docs/procedure-runs/trail/2026-10-02.jsonl
```

