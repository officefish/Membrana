<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-28T08:32:07.245Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/memory-subconscious-m5-metrics-2026-07-28.md` |
| Порядок ролей | Математик → Музыкант → Teamlead → Архитектор → Верстальщик → Структурщик |
| Повестка | `docs/meeting/memory-subconscious/M5_AGENDA.md` |

**Вопрос:**

C5: метрики и логирование — операции памяти, сигнал «утонуло и не всплыло», третья строка token 121, эмиттеры

---

# Консилиум: C5 — метрики и логирование контура памяти

**Повестка:** C5 — что контур памяти измеряет и логирует по ратифицированным C1–C4: обязательный лог операций памяти; метрики v1 (счётные, без порогов); сигнал «утонуло ценное и ни разу не всплыло»; третья строка token 121 («всплывало сегодня»); эмиттеры логов и ребро C5→C6; граница v1/v2.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Математик → Музыкант → Teamlead → Архитектор → Верстальщик → Структурщик

---

[Математик]: Формализую предмет без UI. C5 — не новый контур, а измерительная обвязка над C1–C4. Вход: события с носителей (архив, operational, cloud, receipts). Выход: (1) append-only лог операций, (2) счётные агрегаты v1, (3) предикат сигнала sunk_unsurfaced, (4) наполнение третьей строки token 121. Пороги, веса MMR, эталонные recall-наборы — вне области: это v2-слоты, не контракт v1.

[Музыкант]: На слух C5 — это meters на шине, не новый эффект в цепи. C1 пишет в архив, C3 поднимает в микс, C4 даёт такт E/M — C5 только показывает уровни: что записали, что утонуло, что всплыло, что отвергли. Если метр врёт или рисует «зелёный» без события — это клиппинг доверия, хуже тишины. Третья строка token 121 — finally take count за сутки, не ambient noise.

[Teamlead]: Положение: C1–C4 ратифицированы; эта комната — приборная панель и контракт лога, не провод в код (C6) и не UI-дашборд. Планка: закрытый словарь операций, счётные метрики без порогов, машинный сигнал «утонуло и не всплыло», наполнение строки 3 кристалла 121, эмиттеры поименованы, ребро C5→C6 подтвердить или снять явно. Связка: Математик — предикаты; Структурщик — леммы/homes; Архитектор — границы; Верстальщик — честная пустота отчёта; Музыкант — слух на фальшь счётчиков. Поехали.

[Архитектор]: Конструкция: C5 — слой наблюдения, не несущая контура. Он читает то, что C1–C4 уже определили, и пишет измерения в свои homes. Не определяет transfer, priority, cloud или cycle. Цена ошибки: смешать метрику с политикой (порог в контракте v1) — получим скрытое управление контуром через «прибор». Форма: dictionary ops + counters + один предикат-сигнал + schema строки token 121. Рекомендация: форма, не ADR сверх заседания.

[Верстальщик]: С витрины капитана token 121 — три честные строки на персону, не декор. «Всплывало сегодня» обязана быть либо числом с provenance (сколько act-emerge за date), либо явной пустотой `0` / `n/a (no surface)`, не «—» без смысла. Фальшивый ненулевой счётчик без лога C3 — нарушение конструктивизма. Layout панели не рисуем; требую, чтобы контракт строки был машиночитаем и человекочитаем в одном отчёте.

[Структурщик]: Леммы, иначе синонимы. **Op-log** — append-only журнал операций памяти с закрытым enum verb. **Metric v1** — счётчик/гистограмма без threshold-констант в контракте. **Signal** — булев/счётный предикат над логами, не «ощущение». **Emitter** — именованный шаг/скрипт-лемма, обязанный писать op при успехе/отказе. **Report line** — проекция агрегата в кристалл/отчёт. Homes C5: op-log (date-addressable), metrics snapshot, signal scan result — отдельные статьи словаря, не простыня в DAY_MEMO.

[Математик]: Закрытый enum операций v1 фиксирую кандидатом: `write_operational | transfer_to_archive | rebuild_report | cloud_query | emerge | reject | surface_invoke | evening_compress | morning_warmup | receipt_close`. Каждая запись лога: `{ts, persona, verb, ref?, reason?, origin?}` — reason из словарей C2/C3, где применимо. Метрики v1 = count(verb) и count(verb×class|importance) за окно date/persona — без деления «плохо/хорошо».

[Музыкант]: По тракту эмиттеров: write/transfer — шина C1/extract-evening; cloud_query/emerge/reject — C3 surface; compress/warmup/receipt — C4. Не плодить третий оркестр «metrics-daemon», который сам угадывает события: метр слушает тот же take, что и инструмент. Иначе рассинхрон «в логе есть, в памяти нет» — классический phase issue.

[Teamlead]: Держим запрет: эталоны LongMemEval, калибровка весов, UI-дашборд, правка extractor — не вердиктим. Ребро C5→C6: C5 называет *что* эмитить и *кто по роли шага*; C6 сажает зуб и провод. Без имён эмиттеров C6 получит «пожалуйста, логируй» — это не контракт. Требую в вердикте таблицу verb→emitter-lemma.

[Архитектор]: Граница пакетов: C5 не создаёт app и не лезет в React. Носители — scripts/rituals + jsonl homes рядом с memory contour (как receipts C4, как archive C1). Образец каталога — `docs/audit/llm-calls`: дом-мастерская метрик, не продуктовый UI. Стык с team-memory-report и day-memo Facts — проекции, не второй source of truth: source = op-log + receipts.

[Верстальщик]: Третья строка кристалла 121: подпись канона «всплывало сегодня». Наполнение v1 — только act-level emerge с why (C3), не warmup_feed и не сырой cloud top-K. Warmup без act-reason — это прогрев шины, не «вспомнил». Иначе витрина врёт капитану: «всплывало 12», а персона ни разу не сказала «потому что».

[Структурщик]: Уточняю словарь строки 3: `surfaced_today(persona, date) = |{ op | verb=emerge ∧ persona ∧ day(ts)=date }|`. Reject не входит в «всплывало»; cloud_query без emerge — тоже нет. Для отчёта допустим соседний счётчик `rejected_today` и `cloud_queries_today` — но не в кристалле 121, а в расширенном memory-report, чтобы не размывать три строки.

[Математик]: Сигнал «утонуло и не всплыло». Кандидат из повестки проверяю как предикат, не как политику:  
`sunk_unsurfaced(r; N) ⇔ importanceSnapshot(r)∈{pinned} ∨ class(r)∈{position,insight}`  
`∧ transferred(r) ∧ age_days(r)≥N ∧ count_emerge(r)=0`.  
N — параметр отчёта/скана, не константа контракта. Выход сигнала — множество id + count, не alarm-threshold. Пороги «критично если >k» — v2.

[Музыкант]: На слух сигнал — это detector на хвосте, не сирена каждые 5 минут. Скан после E (когда transfer уже применён) или отдельный evening-tail слот — разумно; не на каждый reject в free jam. Иначе капитан оглохнет. Музейные routine, ушедшие по C2, не должны орать «утонуло ценное» — class/importance фильтр обязателен, иначе false positive как room tone.

[Teamlead]: Принимаю конструкцию сигнала как счётный предикат с параметром N. Не принимаем «забыли ценное» = retrieval recall по эталону в v1 — research прямо говорит: тяжело, наборы строить. Слот v2 именуем: `metric.retrieval_recall_benchmark`, `metric.weight_calibration` — пустые, видимые, без forge цифр.

[Архитектор]: Ребро C5→C6: **подтверждаю условное**. C5 задаёт контракт op-log schema, enum verb, metric names, signal predicate, emitters-as-lemmas. C6 — единственный, кто вязает это в extractor/yarn/зубы. Снять ребро нельзя: без него метрики — проза в протоколе. Цена: C6 не вправе изобретать новые verb без возврата в словарь C5.

[Верстальщик]: Честная деградация на витрине отчёта: нет op-log за день → строки token 121 показывают `n/a (no log)`, не нули, притворяющиеся измерением. Ноль осмысленен только при `receipt`/`op-log` exists ∧ count=0. Прецедент M4: запрет forge_done — здесь запрет forge_metrics. Пустота видима в том же месте, где были бы числа.

[Структурщик]: Таблица эмиттеров (леммы, не файлы-импорты):  
• `write_operational` → extract/#569 path (после shown);  
• `transfer_to_archive` / `rebuild_report` → `memory.evening_compress` (C4);  
• `cloud_query` / `emerge` / `reject` → `memory.surface_invoke` (C3 act);  
• `surface_invoke` (момент) → C4 Σ;  
• `morning_warmup` → `memory.morning_warmup`;  
• `receipt_close` → закрытие E/M.  
Скан `sunk_unsurfaced` — отдельная лемма `memory.signal_scan`, consumer логов C1+C3, не писатель памяти.

[Математик]: Метрики v1 (имена, все count/sum, окно persona×date или global×date):  
`ops.write_operational`, `ops.transfer_to_archive`, `ops.emerge`, `ops.reject`, `ops.cloud_query`,  
`ops.receipt_done|miss|degraded|late`,  
`transfer_by_class.*`, `retained_pinned_count`,  
`surfaced_today` (≡ строка 3), `sunk_unsurfaced_count(N)`.  
Никаких ratio-порогов, precision/recall, «здоровье %». Ratio как *отображение* (emerged/transferred) допустим в report prose, но не как gated metric v1.

[Музыкант]: Research-плотва: без приоритета отчёт — памятник. C2 уже дала классы — C5 обязана светить *состав* transfer: position/insight vs routine. Не «всего утонуло 40», а разрез по class — иначе не видно, съедает ли routine ленту. Это всё ещё counts, не порог. Слухом: если routine_transfer растёт, а emerge по position = 0 днями — сигнал sunk_unsurfaced как раз для этого.

[Teamlead]: Вердикт по обязательности лога: каждая успешная/отклонённая операция из enum — **обязательный** append в op-log. Best-effort «если успеем» — BLOCK. Частичный день = `degraded` в мета-квитанции лога (по аналогии C4), не молчаливая дыра. Связка на исполнение после ратификации — C6; эта комната сдаёт словарь и предикаты.

[Архитектор]: Token 121 — кристалл с limit «наполнение не задано»; C5 закрывает limit для трёх строк:  
(1) write_operational count (окно day/persona),  
(2) transfer_to_archive count,  
(3) emerge count (act).  
Источник строк — op-log, не пересказ journal prose. Если extract не shown — строка 1 не растёт (гейты #569), и это честно.

[Верстальщик]: Расширенный team-memory-report может нести вторичные ряды (reject, cloud_query, sunk_unsurfaced top-ids), но кристалл 121 остаётся тремя строками — не раздуваем до «приборной панели на полстены» в самом кристалле. Панель v2/UI — out of scope; текстовый report — допустимая проекция без нового app.

[Структурщик]: Homes (path-схема, date-addressable, без привязки к несуществующим пакетам):  
`memory/op-log/{persona}/{date}.jsonl`,  
`memory/metrics/{date}.json` (агрегаты v1),  
`memory/signals/{date}.json` (результат scan).  
Проекции: team-memory-report читает metrics+op-log; token 121 builder — три поля из metrics. Никакого прямого UI→jsonl. Словарь verb версионируется в каноне заседания/ADR-следе — один термин, один смысл.

[Математик]: Предикат done для «метрики дня собраны»: `metrics_built(date) ⇔ op-log readable ∧ snapshot written ∧ (signal_scan ran ∨ explicit skip)`. Skip скана — только явный, с reason в snapshot (`scan:skipped`), не молчание. Это стыкуется с C4: miss(E) ⇒ transfer мог не пройти ⇒ sunk_unsurfaced за этот день помечается `degraded_input`, не «всё чисто, count=0».

[Музыкант]: Утро: progressive load метрик не нужен в warmup — warmup кормит контекст, не прибор. Метры читают вечером и по жесту отчёта. Иначе утренний jam начинается с бухгалтерии. Оставляем signal_scan и metrics snapshot на evening-tail / post-E, плюс on-demand для token 121 builder.

[Teamlead]: Сводка матча: словарь ops — да; v1 counts — да; сигнал с N-параметром — да; строка 3 = emerge acts — да; recall/калибровка — v2 слоты; эмиттеры — леммы C3/C4/extract; ребро C5→C6 — подтверждено; UI — нет. Возражения по существу — сейчас или принимаем.

[Архитектор]: Возражений по форме нет. Одна оговорка в вердикт: C5 не меняет C1 schema archive entries и не добавляет обязательных полей в body воспоминания «для метрик» — только op-log рядом и ссылки ref/id. Иначе измерительный слой начнёт гнуть несущую. Принимаю.

[Верстальщик]: Принимаю. На витрине: три строки 121, честные n/a, secondary counters только в report. Не прошу бейджи «здоровье памяти» — это был бы декор-порог.

[Структурщик]: Принимаю. Леммы и homes зафиксировать в итоговке; синонимы «event log / audit / trace» для op-log в каноне не плодить — одно имя `op-log`. Ребро C5→C6 = контракт schema → зуб/провод.

[Математик]: Принимаю. Численно: v1 = counts + predicate-set; v2 = recall@K on gold + weight fit. Никакого «≈ качества» без эталона в v1.

[Музыкант]: Принимаю. Метры на шине, сирена только как счётный хвост sunk_unsurfaced, не compressor на весь микс.

[Teamlead]: LGTM комнаты. К ратификации владельца. Исполнение провода — после C6, не втихаря в этом PR смысла.

---

## Список посылок

| # | Посылка | Тип |
|---|---------|-----|
| P1 | C1 ратифицирован: append-only архив per-persona, transfer-события, summary+fullRef | норма |
| P2 | C2 ратифицирован: классы position\|insight\|precedent\|routine, importance pinned\|normal, отчёт rebuild с причинами закрытого словаря | норма |
| P3 | C3 ратифицирован: Cloud+queryPlan, emerge/why, reject/reason; act всплытия за персоной; warmup_feed ⟂ act-reason | норма |
| P4 | C4 ратифицирован: слоты E/M, receipts enum done\|miss\|degraded\|late, запрет forge_done, леммы evening_compress / morning_warmup / surface_invoke | норма |
| P5 | Кристалл token 121 ратифицирован владельцем: три строки на персону («записал в оперативку / утонуло в подсознание / всплывало сегодня»); limit — наполнение строк не было задано | норма |
| P6 | Research #1366: логирование операций памяти (извлечено/инъецировано/эвиктировано/суммаризовано) — обязательная практика отладки | факт |
| P7 | Research #1366: retrieval recall по эталонным важным записям (LongMemEval/BEAM-класс) — тяжёлая метрика, эталоны надо строить | факт |
| P8 | Плотва #1366: без приоритизации отчёт памяти — «памятник ушедшему»; C2 дала приоритизацию | норма (сессия) + факт (формулировка research) |
| P9 | Живые носители: team-memory-report (поимённо, exit 3); day-memo слой Фактов; образец каталога метрик docs/audit/llm-calls | факт |
| P10 | Гейт #569 / extract: в память пишется только shown | норма |
| P11 | M0-порядок: C5 после C1–C4; C6 — терминал провода; метрики не определяют контур | норма |
| P12 | Ограничение повестки M5: пороги, веса, эталонные recall, UI-дашборд, провод эмиттеров в код — не решать в C5 (v2 / C6 / вне) | норма |

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Суть C5 | **Слой наблюдения** над C1–C4: op-log + metrics v1 + signal scan + наполнение token 121; не политика контура, не UI-app, не провод кода |
| Обязательный op-log | Закрытый enum verb: `write_operational`, `transfer_to_archive`, `rebuild_report`, `cloud_query`, `emerge`, `reject`, `surface_invoke`, `evening_compress`, `morning_warmup`, `receipt_close`. Запись: `{ts, persona, verb, ref?, reason?, origin?}`. Best-effort запрещён |
| Метрики v1 | Счётчики/разрезы без threshold-констант: ops.* по verb; transfer_by_class; retained_pinned_count; receipts by status; `surfaced_today`; `sunk_unsurfaced_count(N)`. Ratio только как отображение в prose, не gate |
| Сигнал «утонуло и не всплыло» | Предикат `sunk_unsurfaced(r;N)`: (pinned ∨ class∈{position,insight}) ∧ transferred ∧ age≥N ∧ emerge_count=0. N — параметр отчёта. Выход — множество id + count. Alarm-пороги — v2 |
| Третья строка token 121 | `surfaced_today` = count **emerge** (act+why) за persona×date. Не cloud_query, не reject, не warmup_feed. Строки 1–2: write_operational / transfer_to_archive из того же op-log |
| Честная пустота | Нет op-log → `n/a (no log)`, не forge нулей. Ноль валиден только при существующем логе/snapshot. miss(E) ⇒ signal/metrics с пометкой `degraded_input` |
| v2 (именованные пустые слоты) | `metric.retrieval_recall_benchmark`, `metric.weight_calibration` (+ пороги health) — не заполнять цифрами без эталона |
| Эмиттеры | Леммы: extract/#569 → write; `memory.evening_compress` → transfer/rebuild/receipt_E; `memory.morning_warmup` → warmup/receipt_M; `memory.surface_invoke` → cloud_query/emerge/reject; `memory.signal_scan` → consumer C1+C3 (не писатель памяти) |
| Ребро C5→C6 | **Подтверждено**: C5 = schema/enum/predicates/emitter-lemmas; C6 = зуб и провод. Новые verb только через обновление словаря C5 |
| Homes | `memory/op-log/{persona}/{date}.jsonl`, `memory/metrics/{date}.json`, `memory/signals/{date}.json`; проекции — team-memory-report, builder token 121 |
| Когда считать/сканировать | Metrics snapshot + signal_scan: post-E / evening-tail (и on-demand для отчёта); не в morning_warmup |
| Out of scope | UI-дашборд; эталоны recall; калибровка MMR/весов; реализация extractor/yarn (C6); изменение schema body воспоминаний «под метрики» |
| Вердикт Teamlead | **LGTM** — к ратификации владельца |

**Definition of Done (C5-контракт):**

1. В каноне заседания/ADR-следе зафиксированы: enum verb op-log, schema записи, имена metrics v1, предикат `sunk_unsurfaced(r;N)`, правило трёх строк token 121, таблица verb→emitter-lemma, homes path-схема.
2. Явно записано: source of truth для 121 и report — op-log (+ receipts C4), не prose журнала; emerge-only для строки 3.
3. Запрет forge_metrics и правило n/a vs zero сформулированы предикатами, пригодными для зуба в C6.
4. Ребро C5→C6 подтверждено; v2-слоты поименованы и пусты.
5. Нет обязательств UI-панели, gold-наборов recall, порогов health и кода extractor внутри DoD C5.
6. Список посылок присутствует и не содержит выводов этой комнаты.

---

*Реплик в диалоге: 33; каждый участник высказался не менее одного раза.*
