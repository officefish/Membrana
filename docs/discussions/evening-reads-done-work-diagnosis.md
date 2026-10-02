# Диагноз Фазы 1 — evening-reads-done-work

Дата замера: 2026-10-02. Дерево: `C:\Users\user190825\practice\Membrana-evening-reads-done-work`, `origin/main` → `75668adb`.

## Что получила книга сделанного 01.10

Команда:

```bash
node --input-type=module -e "import { collectDoneLedgerBlock } from './scripts/lib/review-done-ledger-port.mjs'; const done=collectDoneLedgerBlock({cwd:process.cwd(),today:'2026-10-01'}); console.log('DONE ok='+done.ok+' oversized='+done.oversized+' ticketed='+done.ticketed+' reason='+(done.reason??'')); console.log(done.block.split('\n').filter(l=>/#2543|#2544|#2545|Итого|Источники|Окно/.test(l)).join('\n'));"
```

Вывод:

```text
DONE ok=true oversized=27 ticketed=10 reason=
Окно: мерджи с 2026-09-24.
- **#2544** (2026-10-01 · 482 строк) docs(sprint): document persona roster source plan (#2544)
- **#2543** (2026-10-01 · 643 строк) docs(sprint): audit Angelina hostess verdicts (#2543)
  → разбор заведён билетами: #2545 (2026-10-01, OPEN)
Итого: 27 oversized-PR, разбор заведён у 10, не заведён у 17.
Источники: git log origin/main с 2026-09-24 (порог oversized и природа коммита — как у review:oversized; docs-only oversized не показаны: 7), gh issue list created:>=2026-09-24 (47 билетов).
```

Итого: #2543/#2544 не были пустотой и не были отрезаны недельным окном. #2543 дошёл как заголовок + билет #2545. #2544 дошёл только как заголовок. Итог спринта, CLOSURE/AUDIT и решения блоков в этот блок не попали.

## Кандидаты (а)-(г)

Команда:

```bash
rg -n "collectDoneLedgerBlock|doneWorkBlock|collectDecisionsLedger|docs/discussions|CLOSURE|local-sprint|gh issue list|git log|origin/main|MAIN_DAY_ISSUE" scripts\team-evening-feedback.mjs scripts\lib\team-evening-feedback-ritual.mjs scripts\lib\review-done-ledger-port.mjs scripts\lib\review-done-ledger.mjs scripts\lib\decisions-ledger-port.mjs
```

Вывод-существенное:

```text
scripts\lib\review-done-ledger-port.mjs:100:  // Ствол — origin/main, если он есть в клоне: вечер может идти с ветки, а мерджи живут в стволе.
scripts\lib\review-done-ledger-port.mjs:101:  const ref = run('git', ['rev-parse', '--verify', '--quiet', 'origin/main'], cwd).ok ? 'origin/main' : 'HEAD';
scripts\lib\review-done-ledger-port.mjs:124:    const reason = reasonOf(gh, 'gh issue list');
scripts\lib\team-evening-feedback-ritual.mjs:343:    (p.doneWorkBlock ? `${p.doneWorkBlock}\n\n---\n\n` : '') +
scripts\team-evening-feedback.mjs:76:const doneWork = collectDoneLedgerBlock({ cwd: process.cwd(), today });
scripts\team-evening-feedback.mjs:85:const decisions = collectDecisionsLedger({ cwd: process.cwd(), today });
```

Вывод:

- (а) подтверждена только как ограничение старой очереди PR-review, но не как причина книги: `docs/discussions/pr-*-code-review.md` игнорируется, однако `review-done-ledger-port` вообще не читает `docs/discussions`; он читает `git log origin/main` и `gh issue list`.
- (б) подтверждена: книга сделанного не читает `docs/local-sprint/*/CLOSURE.md`, `AUDIT.md`, execution traces или summaries. Ведомость решений читает планы/ленты и знает closed sprint, но это отдельный блок без подробного итога PR.
- (в) подтверждена: done/decisions блоки стоят до документов дня, но итоговый протокол 01.10 явно опирается на `MAIN_DAY_ISSUE` и `DAILY_CODE_REVIEW`.
- (г) опровергнута: окно с 2026-09-24 включает #2543/#2544.

## Вечер 01.10: где победили посылки

Команда:

```powershell
Select-String -LiteralPath docs\seanses\team-evening-feedback-2026-10-01.md -Pattern '2543|2544|магистраль|не продв|2503|PERSONAS|angelina-hostess|persona roster|hostess' -Context 1,1
```

Вывод-существенное:

```text
docs\seanses\team-evening-feedback-2026-10-01.md:13:Итоги дня: Магистраль `angelina-hostess-impl` открыта, но контракт `docs/procedures/angelina-hostess-contract.md` в диффе не появился...
docs\seanses\team-evening-feedback-2026-10-01.md:13:... #2503 (`PERSONAS`) — шестой день без движения.
docs\seanses\team-evening-feedback-2026-10-01.md:94:- **Соответствие стратегии дня:** ... главный DoD (контракт + один автономный цикл с `isValid=true`) не выполнен — магистраль открыта, но не продвинута.
docs\seanses\team-evening-feedback-2026-10-01.md:97:- **Вердикт дня:** День инструментально полезный, но магистраль не продвинута...
docs\seanses\team-evening-feedback-2026-10-01.md:113:| НЕ ПОДТВЕРЖДЕНО | `docs/procedures/angelina-hostess-contract.md` | ... | файла нет @d22d3042771a |
```

То есть сторож claims уже видит, что файл-посылка отсутствует, но это дописано после оценки и не меняет вердикт.

## Daily review и oversized

Команда:

```powershell
Select-String -LiteralPath docs\DAILY_CODE_REVIEW.md -Pattern '2543|2544|Oversized|2503|PERSONAS|ritual-day|cabinet|Вердикт|Контур ревью' -Context 1,1
```

Вывод-существенное:

```text
docs\DAILY_CODE_REVIEW.md:7:> ⚠ Oversized (>400 строк, дифф не развёрнут — ревьюить отдельно): 433038cc #2537 (532), 00257180 #2541 (1066), f9e9ad64 #2543 (643), 0bc3258f #2538 (424), fd463d7a #2544 (482), b39d3aad (1549), d22d3042 (697)
docs\DAILY_CODE_REVIEW.md:19:- **B6 ...** ... Второй прогон `r2` открыт, но в диффе нет записи close для него ...
docs\DAILY_CODE_REVIEW.md:41:- `PERSONAS` в `scripts/lib/personas.mjs` (#2503) — в диффе движения нет, шестой день...
docs\DAILY_CODE_REVIEW.md:76:3. `yarn turbo run test --filter=@membrana/background-cabinet` — красный тест, корень не назван...
```

Причина: `scripts/lib/day-work-diff.mjs` для oversized возвращает пустой `diff` и строку `(oversized — дифф не развёрнут, ревьюить как отдельный PR)`. Replacement из CLOSURE/локального спринта или summary PR в daily review не подаётся.

## Откуда `code-review:pr` читает документы дня

Команда:

```bash
rg -n "MAIN_DAY_ISSUE_PATH|CURRENT_TASK_PATH|appendTaskContext|readOptionalFile|Task context" scripts\lib\code-review-ritual.mjs scripts\code-review.mjs
node --input-type=module -e "import { appendTaskContext } from './scripts/lib/code-review-ritual.mjs'; const text=appendTaskContext('pr'); console.log(text.split('\n').slice(0,14).join('\n'));"
```

Вывод:

```text
scripts\lib\code-review-ritual.mjs:15:export const MAIN_DAY_ISSUE_PATH = 'docs/MAIN_DAY_ISSUE.md';
scripts\lib\code-review-ritual.mjs:311:  const taskBlock = appendTaskContext('pr');
scripts\lib\code-review-ritual.mjs:545:export function appendTaskContext(kind) {
scripts\lib\code-review-ritual.mjs:546:  const main = readOptionalFile(MAIN_DAY_ISSUE_PATH);
scripts\lib\code-review-ritual.mjs:547:  const buffer = readOptionalFile(CURRENT_TASK_PATH);
## Task context (pr)

### MAIN_DAY_ISSUE.md

<!-- Сгенерировано: 2026-10-02T06:04:37.862Z (yarn main-day-issue@cc58d6f6) -->
...
# MAIN_DAY_ISSUE — 2026-10-02
```

Вывод: `code-review:pr` читает документы дня из текущего рабочего дерева (`process.cwd()`), не из `origin/main`. Поэтому запуск из старого `practice/Membrana` действительно мог подмешать устаревший `MAIN_DAY_ISSUE`.

## Подтверждённый план ремонта

1. Подать в вечер не только ledger по PR↔issue, но и короткие итоги закрытых/влитых локальных спринтов за день: CLOSURE/AUDIT/OPEN fallback + closed runs из decisions-ledger. Porcha: синтетический день с oversized #2543/#2544 и CLOSURE/AUDIT сейчас даёт в `doneWorkBlock` только заголовки; должен дать “закрыт/аудит/результат”.
2. Подать в daily/PR review replacement для oversized и фактов: для oversized сегмента показывать summary из PR metadata + sprint closure/audit pointers; для `code-review:pr` явно печатать provenance `MAIN_DAY_ISSUE` из cwd и блок live states/claims до вердикта. Porcha: #2543/#2544 в daily сейчас только oversized; review на старом cwd читает старый `MAIN_DAY_ISSUE`.
3. Живая проверка 02.10: `team-evening-feedback` и `code-review` не выносят отказ на посылках, которые `feedback:claims` или GitHub/live states опровергают на стволе; protocol names claim uncertainty before verdict.
