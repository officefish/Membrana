<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-28T08:17:03.878Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/memory-subconscious-m2-priority-2026-07-28.md` |
| Порядок ролей | Архитектор → Верстальщик → Музыкант → Математик → Структурщик → Teamlead |
| Повестка | `docs/meeting/memory-subconscious/M2_AGENDA.md` |

**Вопрос:**

C2: приоритизация оперативной — pinned вне бюджета, TTL, классы записей, провод importance.json в отбор

---

# Консилиум: C2 — приоритизация оперативной памяти

**Повестка:** политика оперативного контура персоны: pinned/несущие вне бюджета, TTL временных, классы записей и право на место, провод `importance.json` в отбор, «сделанный стек» под бюджетом; кто остаётся в проекции, кто уходит в transfer (C1 ратифицирован).

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Архитектор → Верстальщик → Музыкант → Математик → Структурщик → Teamlead

---

[Архитектор]: Рамка узкая: C1 уже зафиксировал дома и переток — архив первичен, md-проекция вторична, erase нет. C2 — только **ранг** в проекции: кто остаётся под бюджетом B, кто уходит transfer'ом с `importanceSnapshot`. Форма: классы записей + права класса + провод человек-флага + правило pinned вне бюджета. Не трогаем MMR, расписание, численные веса.

[Верстальщик]: С витрины читателя журнала: сейчас шапка врёт — «важность — человек-флаг в importance.json», а в топе флаг не виден. Требую в контракте данных честные метки класса и статуса удержания: `pinned | budgeted | ttl | transferred`. Пустота флага тоже честна: нет ключа в importance.json → не pinned. Не рисую UI — только контракт полей проекции.

[Музыкант]: На слух боль ясна: пятидневная мастерская задачника утонула под протоколами одного дня — свежесть как единственный fader. Несущие принципы — это sustain, не one-shot take. «Сделанный стек» владельца слышу как working set: то, на чём сейчас играем, плюс pinned-рефрены, которые нельзя выкинуть из мониторов. Временная рутина — с TTL, как room tone после сессии.

[Математик]: Формализую без UI. Пусть кандидаты K — множество записей с meta. Бюджет: `|serialize(O)| ≤ B`. Человек-флаг: `imp(p) ∈ importance.json` по ключу provenance. Предикат pinned: `pinned(k) ⇔ imp(prov(k)) = pinned ∨ class(k) ∈ NonEvictable`. Инвариант: pinned ⊈ бюджетного конкурса — сначала кладём pinned, остаток B' = B − |serialize(pinned)| делим между budgeted. TTL: `expired(k, now) ⇔ ttl(k) ≠ ∅ ∧ now > ttl(k)` → обязательный кандидат на transfer (не erase). Численные веса score — слот v2/C5; здесь только **частичный порядок** классов и жесткие предикаты.

[Структурщик]: Леммы, иначе синонимы. **Класс записи** — закрытый enum в meta, не свободный тег. **Pinned** — удержание вне бюджетного вытеснения (человек-флаг или класс-норма). **Budgeted** — участвует в отборе под B'. **TTL** — опциональный срок в meta класса «временных». **importance.json** — отдельный словарь (ключ=provenance → уровень/флаг); extractor **обязан** читать его при пересборке — сегодня не читает (факт). **Сделанный стек** — не новый файл, а состав O после политики C2. Граница пакета: политика отбора — чистая функция/модуль ранжирования; home флага не смешивать с телом журнала.

[Teamlead]: Положение: матч проигран на том, что важность объявлена и не проведена — это не «улучшение», а несданный норматив. Решение комнаты — C2 до конца: классы, pinned вне бюджета, TTL, провод флага, порядок вытеснения, что машина/что владелец. Связка: Архитектор+Структурщик — словарь и контракт; Математик — предикаты; Музыкант — слух «принцип не тонет»; Верстальщик — честные метки. Планка: без списка посылок и DoD по C2 — BLOCK.

[Архитектор]: Кандидаты классов из практики проверяю на роль в системе, не на вкус: (1) `position` — позиция консилиума/сеанса; (2) `insight` — голос/вердикт инсайта; (3) `precedent` — прецедент-урок с провенансом; (4) `routine` — дневная рутина/отчётный хвост. Спорное: «позиция по ратифицированному вопросу» — не отдельный класс, а **состояние жизненного цикла** `lifecycle ∈ {active, settled}`: settled не значит erase, значит пониженный приоритет удержания в O (кандидат transfer при давлении B'), если не pinned.

[Верстальщик]: Четыре класса на витрине — четыре бейджа, без пятого «прочее»-помойка. Если provenance не маппится — класс `routine` по умолчанию + честный warning в отчёте пересборки, не молчаливый top-K. Settled-позиция: приглушённый статус в meta, не скрытие строки. Капитан в importance.json ставит pinned — бейдж pinned первичнее класса.

[Музыкант]: Settled после ратификации — как take, который ушёл в архив сессии: его можно достать, но он не занимает каждый бар в мониторах. Оставлять все позиции всех консилиумов в O — снова клиппинг бюджета. Поддерживаю lifecycle, не новый класс. Insight и precedent — длинный sustain: без pinned-человека всё равно выше routine.

[Математик]: Частичный порядок удержания (выше = раньше защищён):  
`pinned_flag ≻ class_non_evictable ≻ lifecycle_active ∧ class∈{position,insight,precedent} ≻ class_routine ∧ ¬expired ≻ expired_ttl`.  
При давлении B' вытеснение идёт **снизу вверх**: сначала expired, затем routine, затем settled non-pinned, затем active non-pinned низкого класса. Pinned и class_non_evictable из конкурса исключены. Если serialize(pinned) > B — это **ошибка конфигурации** (флаг-шум), не молчаливое усечение pinned: машина сигналит, не выкидывает.

[Структурщик]: `class_non_evictable` не плодим списком magics. Норма v1: non-evictable **только** через `importance.json` (человек) **или** явный class-policy table в одном модуле (не размазанный if по extractor). Предлагаю table:

| class | defaultRetain | mayTTL | notes |
|-------|---------------|--------|-------|
| position | budgeted | нет | settled → soft demote |
| insight | budgeted+boost | нет | boost = порядок, не число v2 |
| precedent | budgeted+boost | нет | |
| routine | budgeted | да | TTL по умолчанию кандидатом |

Boost в v1 = **ранг в сортировке**, не float-веса. Float — C5.

[Teamlead]: Table принимаю как рабочий скелет. Не размазывать policy по скриптам — один модуль политики, extractor его вызывает. Кто владелец слова: pinned/снять pinned — только человек (importance.json); class и TTL-default — машина по policy; transfer при переполнении — машина по порядку Математика. Слово владельца «сделанный стек» = active working set + pinned, не весь хвост истории.

[Архитектор]: Бюджет: **один B на персону**, не квоты по классам в v1. Квоты — преждевременная абстракция и второй рычаг без метрик. Цена квот — сложность и споры «сколько insight vs position». Цена единого B + partial order — проще зуб и честный отчёт. Рекомендую единый B; class-budget — только если C5 покажет систематическое утопление класса.

[Верстальщик]: Единый B согласен: на витрине одна шкала «N из K · budget tokens», не четыре спидометра. В отчёте пересборки — секции: pinned (вне конкурса), retained, transferred (поимённо с причиной: `expired_ttl | demoted_settled | budget_evict | class_routine`). Причина вытеснения — часть честной конструкции, иначе снова «48 исчезло».

[Музыкант]: Причина на каждом transfer — must: иначе попугай памяти снова ест take без mark. Слышу «сделанный стек» ещё так: не хранить в O длинные полные протоколы, если C1 дал archive+fullRef — в проекции compact refrain. Но сжатие тела — край C1/переток, не изобретаем заново; C2 лишь **выбирает кого** transfer'ить первым.

[Математик]: Провод флага — предикат отбора, не декоративная meta. Алгоритм v1 пересборки (детерминированный):  
(1) materialize K из архивных/событийных источников + текущих кандидатов;  
(2) join importance.json by provenance;  
(3) label pinned / expired / class / lifecycle;  
(4) O_pinned ← {k | pinned(k)}; assert |serialize(O_pinned)| ≤ B иначе fail-closed с отчётом;  
(5) R ← K \ O_pinned \ already_transferred; sort R by partial order + recency как **последний** ключ, не первый;  
(6) pack R в B' greedy; остаток → transfer queue с reason.  
Recency больше не единственный ключ — это и есть лечение регрессии 27–28.07.

[Структурщик]: Контракт `importance.json`: ключ = provenance (как сейчас в шапках); значение v1 — закрытое: `{ "level": "pinned" | "normal" }` минимум. Не плодим 5 уровней важности без C5. Снятие pinned = plain normal или удаление ключа — зафиксировать одно: **удаление ключа = normal**, less surprise. Extractor/policy читает файл; отсутствие файла = все normal, не crash. Слабая связанность: memory policy не импортирует UI; journal md — render view из результата политики.

[Teamlead]: fail-closed при pinned>B — правильно: лучше красный отчёт, чем тихий truncate несущих. Не плодить уровни. Дальше — TTL: кто ставит срок.

[Архитектор]: TTL — свойство **записи**, не глобальный cron (расписание — C4). Политика C2 задаёт: class routine **может** нести `ttlHours` default (константа-кандидат, не священная — калибровка C5); position/insight/precedent — TTL только если человек явно поставил (редкий case). Машина не гадает TTL на position. Истёкший TTL → reason `expired_ttl` → transfer при следующей пересборке.

[Верстальщик]: На витрине TTL не «таймер с анимацией» — поле `ttlUntil` ISO или absent. Expired видно статусом до пересборки, если показываем candidate set. Не прятать.

[Музыкант]: Default TTL на routine — да, иначе дневные хвосты снова забивают шину. На insight/precedent авто-TTL — нет: это как стереть камертон по таймеру. Только рука человека.

[Математик]: Default для routine параметризуем константой `ROUTINE_TTL_HOURS` в policy-модуле, без магии в промптах. Численное значение в DoD — **слот**: комната C2 фиксирует наличие default-TTL, не «правильные 72 часа». Пока нет C5 — поставить явную константу-заглушку в коде с пометкой calibrate — или оставить «TTL optional, без default»? Предлагаю: default есть, значение выносит Teamlead как временное, C5 пересматривает.

[Структурщик]: Имена полей meta единые: `class`, `lifecycle`, `ttlUntil`, `provenance`, `retain: pinned|budgeted`, `transferReason?`. Не `type`/`kind`/`tag` вперемешку. Проекция md сериализует subset; архив C1 несёт полное. Policy API: `selectOperational(candidates, importance, budget) → { retained, transferred, report }` — чистый контракт, зубом на инварианты pinned и «нет erase».

[Teamlead]: Константа TTL: временно **168h (7d)** для routine без явного ttl — достаточно, чтобы вечерние отчёты недели не жили вечно в O, и не режем сутки. C5 имеет право сменить. Не спорим о часах дольше минуты — фиксируем и идём.

[Архитектор]: «Сделанный стек» в определении формы: O = pinned ∪ pack(active working). Working ≈ lifecycle=active ∪ свежие budgeted по порядку. Settled non-pinned не держим «на всякий» при давлении. Это согласует слово владельца с бюджетом без квот.

[Верстальщик]: В шапке каждого memory/*.md — одна строка-легенда классов и пометка «pinned через importance.json проводится в отбор» — чтобы шапка перестала врать. Текст легенды — часть DoD документации, не UI-фича.

[Музыкант]: Серендипити и MMR — не здесь (C3). Но порядок вытеснения C2 не должен **запрещать** C3 потом поднять из архива: transfer ≠ смерть. C1 это уже дал; C2 только не вводит erase «для простоты».

[Математик]: Инвариант совместимости с C1: ∀k ∈ transferred: ∃ archive ref ∧ importanceSnapshot сохранён. Предикат «принцип не тонет»: если pinned(k) — k ∈ O; если ¬pinned и class boost — k вытесняется только после routine/expired. Вещдок регрессии Dynin 27.07 лечится именно join флага + demote routine/recency-last.

[Структурщик]: Миграция: старые записи без class — default `routine` + lifecycle `active` до первой классификации extractor'ом/backfill; не выдумывать insight задним числом. Backfill class — эвристика по provenance path (seanses→position, insights→insight) в C6 зоне реализации, но **правило default** фиксируем здесь. importance.json без изменений формата ключей — только читаем.

[Teamlead]: Default class=routine для неизвестных — жёстко и честно; лучше лишний transfer routine, чем вечный false-insight. C6 реализует эвристику path→class; C2 задал default и enum. Машина vs человек — сводная: человек: pinned/unpin, явный TTL override, правка importance.json; машина: class default/heuristic, sort, pack, transfer reasons, assert pinned≤B. Итоговая политика готова к вердикту — добиваем крайние кейсы.

[Архитектор]: Край: пустой candidates → O пустая, report ok. Край: все pinned и >B → fail-closed, человек снимает флаги. Край: settled position + pinned → остаётся (pinned побеждает lifecycle). Форма закрыта; ADR не нужен — вписывается в C1 homes.

[Верстальщик]: Край на витрине отчёта: fail-closed = красный статус `pinned_overflow`, список provenance-виновников, не stack trace. Честная пустота retained при overflow не маскируется «33 из 239».

[Музыкант]: Ещё край: дневная рутина с явной пометкой человека pinned — имеет право жить; это соло капитана, не ломаем. Политика это уже допускает через флаг.

[Математик]: Фиксирую comparator v1 (псевдопорядок ключей):  
`isPinned desc, isExpired asc, classRank desc, lifecycleRank desc, recency desc`  
где classRank: precedent=insight=3, position=2, routine=1 (равенство insight/precedent — ок для v1). Числа rank — ординалы, не калибруемые веса. Веса float запрещены до C5.

[Структурщик]: classRank table — в том же policy-модуле рядом с retain-table. Экспорт одной леммы `OperationalMemoryPolicy`. Журналы и RAG не тянут сырой importance.json в обход policy. Принимаю.

[Teamlead]: Вердикт комнаты: политику C2 принимаем. Pinned вне бюджета; единый B; enum классов; lifecycle settled; TTL на routine default 168h; importance.json в join обязателен; comparator Математика; fail-closed pinned>B; transfer с reason; без erase; без float-весов. Связка на реализацию — после C-комнат по M0, но DoD C2 самодостаточен для контракта. Принимаю. Кто против по существу — сейчас или молчание = принять.

[Архитектор]: Принимаю. Конструкция: ранг в проекции, не второй архив.

[Верстальщик]: Принимаю. Метки и причины — в контракте данных.

[Музыкант]: Принимаю. Принцип не тонет, routine дышит TTL.

[Математик]: Принимаю. Предикаты и comparator замкнуты; веса отложены.

[Структурщик]: Принимаю. Словарь, enum, один policy-модуль, default routine.

---

## Список посылок

| # | Посылка | Тип |
|---|---------|-----|
| P1 | Слово владельца 27.07: «в оперативной логично держать сделанный стек»; две памяти — оперативная и подсознание | норма (владелец) |
| P2 | M0: C2 — приоритизация оперативной; соседние C1/C3/C4/C5/C6 не предмет этой комнаты | норма (порядок M0) |
| P3 | C1 ратифицирован 28.07: архив первичен, md-проекция вторична; выбытие из O только transfer с importanceSnapshot; оператора erase нет | норма (вердикт C1) |
| P4 | Живой extractor пересобирает топ под бюджет ~5K токенов («N из K»); recency фактически единственный ключ | факт (журналы memory, поведение extractor) |
| P5 | 27.07 у Dynin вытеснены позиции мастерской (многодневные) протоколами одного дня; 28.07 «записано 46 · вытеснено 48» | факт (вещдоки регрессии / #1366) |
| P6 | `docs/virtual-team/memory/importance.json` — человек-флаг (ключ=provenance); объявлен в шапках журналов; extractor флаг в отбор не читает | факт (дерево + поведение) |
| P7 | Плотва 27.07 (#1366): несущие не подлежат вытеснению; у временных — TTL; иначе отчёт — памятник ушедшему | норма (вводная комнаты) |
| P8 | Research (#1366): importance как поле + boost; наивный top-K вреден; простое удаление не рекомендуется (закрыто C1); веса калибруют метриками | факт (research-сводка) |
| P9 | Бюджет сегодня единый на персону, бесклассовый, <5000 токенов | факт (шапки журналов / extractor) |
| P10 | Ограничение повестки: численные формулы весов не изобретать (v2/C5); MMR/serendipity — C3; расписание пересборки — C4 | норма (M2_AGENDA) |
| P11 | Кандидаты классов из практики: position · insight · precedent · routine; спор о «ратифицированной позиции» как о немедленном transfer | факт (повестка M2; практика сеансов) |

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Что такое «сделанный стек» в O | `O = pinned ∪ greedy-pack(budgeted под B')` где budgeted — active working set по partial order; не вся история персоны |
| Бюджет | **Один B на персону** (как сейчас ~5K). Квоты по классам — нет в v1 (пересмотр только после C5) |
| Pinned / несущие | Вне бюджетного конкурса. `pinned(k) ⇔ importance.json[prov(k)].level = pinned`. Non-evictable **не** плодим скрытыми class-magics сверх флага |
| Если serialize(pinned) > B | **fail-closed**: отчёт `pinned_overflow` + список provenance; pinned не усекать молча |
| Классы записей (закрытый enum) | `position \| insight \| precedent \| routine`. Нет класса «прочее»; unknown → `routine` |
| Lifecycle | `active \| settled` (ортогонально class). Settled non-pinned — soft demote при давлении B', не erase |
| Default class | Нет class в meta → `routine` + `active`. Backfill path→class — зона реализации (C6), правило default — здесь |
| TTL | Поле `ttlUntil` optional. **Default TTL** только у `routine` без явного срока: **168h**. position/insight/precedent — TTL лишь по явному слову человека. Expired → reason `expired_ttl`, transfer при пересборке |
| Порядок удержания / вытеснения | Comparator v1 (ординалы, не float): `isPinned ↓, isExpired ↑, classRank ↓, lifecycleRank ↓, recency ↓`; classRank: insight=precedent=3, position=2, routine=1. Вытеснение снизу. Recency **не** единственный и не первый ключ |
| Провод importance.json | Обязательный join by provenance на каждой пересборке. Нет файла → все normal. Нет ключа / снят ключ → normal. Формат v1: level `pinned \| normal` only |
| Машина vs человек | **Человек:** pinned/unpin, явный TTL override, содержимое importance.json. **Машина:** default class, comparator, pack, transfer+reason, assert pinned≤B |
| Причина transfer | Обязательна: `expired_ttl \| demoted_settled \| budget_evict \| class_routine` (и совместимые уточнения). Поимённо в report |
| Совместимость C1 | transfer ≠ erase; archive ref + importanceSnapshot; политика ранга не вводит delete |
| Веса float / MMR / cron | Не решать здесь (C5 / C3 / C4) |
| Policy-модуль | Один контракт `selectOperational(candidates, importance, budget) → {retained, transferred, report}`; tables rank/retain рядом; md-проекция — view |

**Definition of Done (C2):**

1. Зафиксирован закрытый enum `class` и `lifecycle`; default unknown→`routine`/`active`.
2. Спецификация comparator v1 и инвариант «pinned вне конкурса» + fail-closed при overflow — в контракте/доке заседания (без float-весов).
3. Контракт чтения `importance.json`: join by provenance, levels `pinned|normal`, отсутствие ключа = normal.
4. TTL: семантика `ttlUntil` + default 168h для routine; запрет авто-TTL на position/insight/precedent.
5. Контракт отчёта пересборки: секции pinned / retained / transferred с `transferReason`; статус `pinned_overflow`.
6. API policy-модуля `selectOperational(...)` описан; точка вызова — extractor (реализация — не колонизировать C6 сверх контракта).
7. Шапка `memory/<id>.md`: утверждение про importance.json приведено в соответствие с «проводится в отбор» (текст-легенда).
8. Явный запрет erase и явная отсылка к C1 transfer+importanceSnapshot в policy-доке.
9. Тесты-зубы (когда код): pinned не вытесняется при давлении; expired уходит раньше active insight; без флага recency-only не воспроизводит кейс «routine дня вытеснила position мастерской» на фикстуре 27.07; overflow pinned → ошибка, не truncate.

---

*Реплик в диалоге: 41; каждый участник высказался не менее одного раза.*
