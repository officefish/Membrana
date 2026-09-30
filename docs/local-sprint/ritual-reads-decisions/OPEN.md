# Membrana Local Sprint OPEN: ritual-reads-decisions

| Поле | Значение |
|------|----------|
| Sprint | `ritual-reads-decisions` |
| Procedure | `membrana-local-sprint` |
| Registry epic | `ritual-reads-decisions` (M; Issue с первым PR) · фазы `ritual-reads-decisions-b1…b5` |
| Prompt | [`RITUAL_READS_DECISIONS_PROMPT.md`](../../prompts/RITUAL_READS_DECISIONS_PROMPT.md) |
| Cut | [`ritual-reads-decisions.json`](../../sprint/cut/ritual-reads-decisions.json) — **ждёт ратификации владельца** (`sprint:cut` → `findings`: единственная находка `plan_unratified`) |
| Cutter | ozhegov → [`cut-ritual-reads-decisions-ozhegov.md`](../../discussions/cut-ritual-reads-decisions-ozhegov.md) · лента актов [`trail/ritual-reads-decisions.jsonl`](../../sprint/cut/trail/ritual-reads-decisions.jsonl) |
| Lead | ozhegov |
| Support | dynin · vesnin · tarasov · angelina (гейт) |
| Source | остаток [`ritual-reads-done-work`](../ritual-reads-done-work/CLOSURE.md) (#2514) по первому боевому прогону 29.09 |
| Branch / tree | `fix/decisions-reach-evening` от `origin/main` `0ecbc2f5` · `Membrana-orphans` |
| Status | **фаза А — нарезка**; фаза Б после ратификации |

## Зачем

Вчерашний спринт научил вечер видеть **сделанное, заведённое билетами**. Первый боевой прогон 29.09 показал,
чего он не закрыл: читатель судит по тексту, написанному **до** решения (ревью PR, карточка реестра), и не
видит решения, принятого **после**. Сделанное теперь видно; **решённое — нет**. Три симптома одного класса:

1. **Вечер просит тест на снятое окно.** Дынин: «граничный тест на 36-часовое окно свежести (P2 из ревью
   #2506)». Окно снял сам #2506 (`d3be15f1`, влит 28.09 15:50Z). Ещё 28.09 вечер (18:05Z, после мерджа) просил
   тест «ровно на `NIGHT_RUN_MAX_AGE_MS = 36 ч`» по ревью 13:04+03 — до мерджа.
2. **Вечер просит проверить снятый атрибут.** Родченко: «`aria-current` на активной странице». Снят в #2513
   (`dfaac9f3`) — решение (1) из `//decisions` плана `sample-library-paging-a11y.json`, ратифицировано владельцем
   29.09 15:13+03.
3. **Утро предлагает закрытый спринт.** `scripts/day-plan.mjs` третий день кладёт в top-3
   `batch-collection-run-contour` — прогон закрыт 29.09 (close-запись `pass` 16:22+03 в
   `docs/procedure-runs/trail/2026-09-29.jsonl`, стек #2517–#2521 влит), карточка `active`, фазы 4/4 `active`.

## Что показал замер (30.09)

- **Широта.** Закрытых прогонов `membrana-local-sprint` за 16–30.09 — **4**; карточек архивировано — **0**
  (trace-freeze-dual-candidate-sprint L, ritual-reads-done-work M, sample-library-paging-a11y M,
  batch-collection-run-contour L). Планов с ратифицированными `//decisions` / `//recut-*` за окно 7 дней — **3**.
- **Кандидаты магистрали.** `candidatesFromRegistry(tasks, {size: 'L'})` фильтрует только `status === 'active'`:
  41 кандидат, зоны не размечены → ранг по id; top-3 = angelina-hostess-impl, assets-container,
  batch-collection-run-contour. Закрытых прогонов генератор не читает вовсе.
- **Зуб утверждений.** `classifyToken('NIGHT_RUN_MAX_AGE_MS = 36 ч')` → `opaque` («форма не опознана»), хотя
  `git grep NIGHT_RUN_MAX_AGE_MS origin/main` → 0 (в `d3be15f1~1` — `night-summary.mjs:8`). `aria-current` →
  `card|doc` → «сомнение: карточки нет» — адрес не тот; ратифицированное решение зуб не читает.
- **Носители решений в машинном виде:** план нарезки (`//decisions`, `//recut-*` + `ratification{by:owner,at}`),
  лента прогонов (`runPhase=close`), реестр (`status`, фазы через `parentEpic`), ствол (символ есть/нет).
  **Не машинный носитель:** тело PR (#2506 — проза), `CLOSURE.md`. Это признанный предел спринта: 36-часовое
  окно ведомость показать не может; символ по стволу ловит зуб утверждений (b4), фраза без токена — не ловится.

## Блоки

| Блок | Персона | Зона | Оценка |
|------|---------|------|-------:|
| b1 `decisions-ledger-core` | dynin | `scripts/lib/decisions-ledger.mjs` (+test) | 240 |
| b2 `evening-reads-decisions` | vesnin | `scripts/lib/decisions-ledger-port.mjs` · `scripts/lib/team-evening-feedback-ritual.mjs` · `scripts/team-evening-feedback.mjs` · `scripts/team-evening-feedback-ritual.test.mjs` | 220 |
| b3 `day-plan-reads-closures` | ozhegov | `scripts/lib/day-plan-frame.mjs` · `scripts/day-plan-frame.test.mjs` · `scripts/day-plan.mjs` | 180 |
| b4 `claims-probe-reads-decisions` | tarasov | `scripts/lib/feedback-claims/atoms.mjs` (+test) · `verdict.mjs` (+test) · `scripts/feedback-claims-probe.mjs` (+test) | 220 |
| b5 `live-check-closure` | angelina | `docs/local-sprint/ritual-reads-decisions/` · `docs/LOCAL_SPRINT_ACTIVE.md` · `docs/LOCAL_SPRINT_LOG.md` · `docs/sprint/experience/segments-ritual-reads-decisions.json` | 280 |

Порядок: b1 → b2 → {b3, b4} → b5. b2 импортирует ядро b1; b3 и b4 импортируют порт b2 (один порт на трёх
читателей — вторая копия чтения планов или лент запрещена).

**Зоны — контракт.** Зоны b2–b4 нарисованы по файлам до исполнения b1 и от формы записи ведомости не зависят
(импорт — единственная связь). **Точка перерезки — после b1, явно:** если форма ведомости потребует читателя
окна лент вне зон (например, в `scripts/lib/procedure-run-journal.mjs`) — стоп, перерезка и новая ратификация
до старта b2, не задним числом (урок 29.09: `batch-collection-run-contour`, `trace-freeze-dual-candidate-sprint`).

## Прогноз до исполнения

| Блок | Что даст | Чем проверяется | Чем опровергается |
|------|----------|-----------------|-------------------|
| b1 | Чистое ядро: `ratifiedDecisionsOf` (только `ratification.by === 'owner'`, окно по `at`), `closedSprintRunsOf`, `joinClosedSprintsWithCards` (карточка/фазы `active` → «не архивирована»), `staleCandidates`, `formatDecisionsBlock` | Зубы с порчей: план без ратификации / `by ≠ owner` — не решение; `//recut-*` с ратификацией — решение; close-запись `fail` — «закрыт красным», отдельно от `pass`; карточка `archived` — не stale; фаза `active` при архивном эпике — stale по фазе. На живых файлах: 3 плана, 4 закрытых прогона, 4 карточки `active` | Если у batch/trace-freeze `ratification.by` окажется не `owner` — записей меньше; это факт, не дефект. Если ядру понадобился доступ к ленте иначе, чем через переданные `records` — блок не сдан |
| b2 | Порт (планы, ленты за 7 дней, реестр) + блок «Решённое» в промпте вечера ПОСЛЕ книги сделанного и ДО документов дня; нечитаемый вход — счётом с причиной | Зуб: на фикстурах 29.09 промпт несёт «aria-current … снят» и «batch-collection-run-contour: прогон закрыт 29.09, карточка не архивирована»; порядок блоков; битый план → «не прочитан: <файл>», не исключение. Живой `team-evening-feedback:dry --no-rag --no-save` | Если команда всё равно просит проверить `aria-current` — судит по RAG прежних протоколов; чинить RAG-вход, не здесь. 36-часовое окно (#2506) блок показать не может — предел носителя |
| b3 | Карточки закрытых спринтов исключены из top-3 и названы посылкой поимённо («карточка не архивирована — долг закрытия»); `--dry-run` без LLM | Зуб: карточка `active` L + close-запись → не в top-3 и в посылке; без записи → в top-3; порядок остальных не меняется. Живой `day-plan --dry-run` 30.09: без batch-collection-run-contour и trace-freeze-dual-candidate-sprint | Слово владельца «только помечать» — блок перерезается, не miss |
| b4 | Голова выражения → `symbol`; вещдок `decidedIn` в причине вердикта полным якорем носителя; `OUTCOMES` без изменений | Зуб: `NIGHT_RUN_MAX_AGE_MS = 36 ч` → `symbol`, при нуле вхождений «не подтверждено»; `aria-current` при решении в окне — причина несёт `sample-library-paging-a11y.json#//decisions`; порча: убрать `decidedIn` → строки нет. Живой `feedback:claims` на протоколах 28.09 и 29.09 | Фраза «36-часовое окно» без токена в бэктиках зубом не ловится — признанный предел (проза) |
| b5 | Живая приёмка на файлах 28–30.09; gate pass; опыт записан | `sprint:gate` pass 5/5 `honest_pair`; `sprint:experience` hit/miss по блокам; выдержки трёх `:dry` в `CLOSURE.md` | Гейт красный по следам — блок не исполнен, а подписан. Объём: 280 по уроку 29.09 (120 → 294) |

## Вердикт резчика (ozhegov, прогон контекста 12:02Z)

Контракт — да, с двумя правками, обе внесены: b5 поднят 140 → 280; точка перерезки после b1 — в BLOCK.
Ответы на развилки: `//recut-*` = решение при `ratification.by === 'owner'` (различать по имени ключа —
искусственная синонимия; в вещдоке печатать полный якорь `#//recut-29-09-retro`); закрытые спринты исключать
**и** помечать («только пометка» вернёт баг 30.09, «только исключение» скроет долг); один порт на трёх
читателей — норма, горячим станет с четвёртым читателем с иной семантикой окна.

**Отклонено по замеру:** формулировка BLOCK b2 «`dry-run` на 28.09 показывает `NIGHT_RUN_MAX_AGE_MS` в
„Решённом“» — #2506 не спринт, ратифицированного носителя не имеет; ведомость его показать не может (предел
`//carriers`); символ по стволу ловит b4.

## Развилки на слово владельца (не решаются спринтом)

1. Исключать карточки закрытых спринтов из кандидатов магистрали (умолчание — исключать **и** помечать) или только помечать.
2. Кто архивирует карточки закрытых спринтов — 4 закрытых прогона, 0 архивных карточек; ритуал только сообщает долг.
3. `//recut-*` = решение владельца наравне с `//decisions` (умолчание — да, при `ratification.by === 'owner'`).
4. Носитель решений вне спринтов (тело PR #2506) — нужна ли машинная форма («## Решения» в теле PR) или остаётся прозой.
5. Новый исход «противоречит решённому» в зубе утверждений — тронет предикат вечернего гейта; спринт только аннотирует причину.
6. От резчика: образец текста блока «Решённое» и формулировка посылки b3 («долг закрытия»).

## Не one shot

Три читателя (вечер, каркас дня, зуб утверждений), новое ядро, порт и живая приёмка; пять персон и пять
непересекающихся зон. Малым намерением с одним исполнителем это не является.
