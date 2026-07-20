# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-19T12:50:03.909Z |
| Команда | `yarn consilium` |
| Модель | claude-opus-4-8 |
| Файл | `docs/seanses/insight-archive-lifecycle-c2-state-axes-r2-2026-07-19.md` |
| Порядок ролей | Математик → Teamlead → Музыкант → Верстальщик → Структурщик |
| Повестка | `docs\meeting\insight-archive-lifecycle\C2_REPAIR_TOPIC.md` |

**Вопрос:**

Исправить только C2 после BLOCK: typed axis records и well-typed projections, transcribed вне осей, reopen=new revision, без X1–X3/prerequisites/overwrite. Требуется ВЕРДИКТ C2; C3–C7 не решать.

---

# Консилиум: C2R — typed state records без ложных prerequisites

**Повестка:** Исправить только C2 после BLOCK: перевести state model в набор typed axis records и well-typed projections так, чтобы оси разных subjects не смешивались, ни один cross-axis prerequisite не появлялся без посылки, `transcribed` остался вне осей, `reopen` = новая revision, без X1–X3, без overwrite истории. Требуется единственный ВЕРДИКТ C2; C3–C7 не решать.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Математик → Teamlead → Музыкант → Верстальщик → Структурщик (циклически)

---

[Математик]: Формализую, иначе «оси не смешиваются» останется вкусовым. У нас четыре независимые оси на разных subjects: decision над MANDATE/revision, delivery и outcome над SLICE, visibility над representation record. Каждая ось — это функция `axis: subject → assessment`, а не общий enum. Смешение осей = ill-typed join двух функций с разными доменами. Инвариант, проверяемый чистой функцией: любая проекция объявлена над связанной tuple `(insightRevision, mandate, slice, representation)`, и её тип — произведение доменов, а не их слияние.

[Teamlead]: Рамку фиксирую сразу, чтобы repair не подобрал контрабанду из BLOCK-нутого C2. Мы правим ровно один узел: типизация осей и легальность проекций. Не решаем evidence (C3), не решаем history storage (C4). По конструкции — «форма следует функции»: если четыре оси описывают четыре разных subject, у них не может быть общего носителя-состояния. Общее состояние без общего subject — это декор без конструкции, ровно та ошибка, за которую C2 получил BLOCK.

[Музыкант]: По касательной, аудио тут не задет, но маршрут сигнала я узнаю. Четыре оси — это четыре независимых шины в микшере: decision, delivery, outcome, visibility. Ошибка старого C2 — свести их в один мастер-фейдер и решить, что движение одного тянет остальные. Флаг из опыта: не делайте «магическую кнопку» — cross-axis prerequisite без посылки это как автоматический дакинг, который душит канал без причины. Каждая шина двигается своим ассертом.

[Верстальщик]: С точки зрения потребителя проекции — а потребитель это агент и человек в PR — оси должны читаться как четыре отдельных индикатора, не как один смешанный статус. Моя норма из `main-day-accuracy`: смешанный поток = мёртвая дверь, читатель не понимает, что перед ним. Но это C4-витрина, здесь фиксирую только требование к типу: проекция обязана нести ярлык своей оси, иначе на экране склеятся две разные истины.

[Структурщик]: Начну с термина, иначе DAG поплывёт. «State» у старого C2 — омоним: он слил четыре леммы под одним словом. Разведу по subject строго: **decision** — статья над MANDATE/revision; **delivery** и **outcome** — две статьи над SLICE; **visibility** — статья над representation record. Один subject — один словарь значений. `transcribed` — это `Task→Mandate`, отдельная typed relation, НЕ ось: у неё нет assessment-значений, только факт связи. Это несущая граница, как §1 фиксации осей в топике.

[Математик]: Продолжу по значениям осей — топик требует минимальные values без синтетики. **decision**: `{open, accepted, rejected, superseded}` — где `superseded` не удаляет прежний assertion, а добавляет новый. **delivery** над SLICE: `{pending, in-progress, delivered}`. **outcome** над SLICE: `{unassessed, met, unmet}` — `unassessed` это отсутствие assertion, НЕ синтетический факт. **visibility**: `{active, archived}`. Ни одна пара не образует prerequisite: `outcome=met` не требует `delivery=delivered` — C1 такого ребра не давал, и я его не выдумываю.

[Teamlead]: Принимаю разведение по subject. Ключевое, за что был BLOCK: cross-axis prerequisite без посылки. Правило простое и жёсткое — legal ровно тогда, когда ребро есть в C1-фактах. C1 не дал `outcome→delivery` и не дал `outcome→accepted`; значит их нет. Все well-typed cross-axis комбинации разрешены; forbidden — только ill-typed join, вывод из visibility/archive и мутация immutable scope. X1–X3 удаляются целиком: они были синтетическими рёбрами.

[Музыкант]: Поддержу про reopen живой аналогией. `reopen(oldRevision)` — это не перезапись мастер-трека, это новая версия поверх, оригинал не трогаешь. Мы это уже решали в `truth-graph-q1`: ADR как мастер-запись, поверх — новая ревизия. Значит reopen рождает новую revision с новым ID и initial `decision=open`; старый scope immutable, не мутирует. `reopened` — не in-place D-состояние, это inter-revision event между двумя записями.

[Верстальщик]: Со стороны честности источника добавлю: `superseded` и `reopen` не должны на витрине выглядеть как удаление. Прежний assertion остаётся — это факт истории, а не мусор. Но саму историю рисует C4, я лишь фиксирую требование к типу: событие смены active assessment добавляет assertion, не затирает. Иначе получим ту же боль, что «✅ Runtime не затронут» в день слияний — экран, который врёт про прошлое.

[Структурщик]: Уточню well-typed projection, иначе снова слипнется. Общий view легален ТОЛЬКО как проекция связанной tuple `(insightRevision, mandate, slice, representation)`. Отсутствие assertion по оси проецируется как её минимальное «нет данных» значение (`unassessed`, `pending`) — НЕ как синтетический факт «выполнено». Запрещено: join осей с несвязанными subject (ill-typed), вывод decision из visibility, любое чтение архива как источника decision-факта.

[Математик]: Формализую allowed/forbidden matrix классами, а не перечислением клеток — их произведение велико, важен предикат. **Allowed:** любая tuple `(d, δ, o, v)` где каждая координата взята из домена своей оси, projection объявлена над связанной tuple. **Forbidden class 1:** ill-typed join — координата взята из домена чужой оси. **Forbidden class 2:** derive-from-visibility — decision или outcome выведены из `v=archived`. **Forbidden class 3:** mutate-immutable — любое изменение assertion прежней revision. Три класса, проверяемых чистой функцией, покрывают всё.

[Teamlead]: Это конструктивно и без декора. Проверю на посылки — топик требует разделить источники. **C1 facts:** нет prerequisites `outcome→delivery/accepted`, нет запрета cleanup после reject/supersede. **C2_TOPIC hard constraints:** оси по subject, transcribed вне осей, reopen=new revision, удалить X1–X3, не утверждать terminal/monotonic без посылок. **brief/M0:** repair того же узла, не новый DAG. Ничего из C1-archive-инвариантов я сюда не приписываю — их у нас нет.

[Музыкант]: Один живой флаг про terminal/monotonic. Топик прямо запрещает объявлять оси монотонными без посылки. В аудио это как утверждать, что фейдер только вниз — а он ходит в обе стороны. `rejected` не обязан быть терминалом: reopen даёт новую revision, а в рамках одной revision C1 не запретил обратных assertion. Значит C2 фиксирует минимальные values и события смены, но НЕ рисует стрелки «только вперёд». Порядок оставляем C4.

[Верстальщик]: Согласен, и с витрины это критично: монотонность нарисованная там, где её нет по данным, — это ложная стрелка, читатель поверит несуществующему ограничению. Фиксирую как требование к записи оси: поле «allowed assertion-events» перечисляет события смены active assessment, без implicit-порядка. `revoke`/`supersede` — тоже события, они добавляют assertion, не удаляют. История и derived current view — C4, не здесь.

[Структурщик]: Закреплю термин про revoke/supersede, иначе C4 получит размытую границу. `revoke(assertion)` и `supersede(assertion, newAssertion)` — оба **добавляют** запись-событие, прежний assertion остаётся в наборе. Active assessment оси = результат проекции истории (это уже C4), но САМА семантика «не удаляем» — C2. Точная reopen: `reopen(oldRev) → newRev{ id:new, decision:open }`, `transcribed` при этом — новая relation `Task→newMandate`, не перенос старой.

[Математик]: Сведу reopen/revoke/supersede в один инвариант, чтобы не осталось щели. Пусть `A` — множество assertion-событий. Все три операции — это `A' = A ∪ {new}`, монотонное **добавление** (это единственная монотонность, которую я утверждаю — рост множества фактов, не порядок значений). Удаление из `A` запрещено всегда. `reopen` дополнительно создаёт новый subject-ID revision. Проверяемый предикат: `|A'| > |A|` и `A ⊆ A'` для любой из трёх операций.

[Teamlead]: Это и есть замок конструкции: история только растёт, оси типизированы по subject, cross-axis prerequisite только по C1-факту. LGTM на форму вердикта. Даю финальную рамку голосования: C2 выдаёт (а) четыре typed axis record, (б) правила well-typed projection и три forbidden-класса, (в) reopen/revoke/supersede через union без мутации, (г) использованные посылки по источникам. Evidence contract, история-хранилище, legacy, enforcement, CLI — явно C3–C7, здесь не трогаем.

[Музыкант]: Принимаю. Четыре шины, каждая своим ассертом, мастер не перезаписывается — чисто звучит.

[Верстальщик]: Принимаю. Тип несёт ярлык оси, история не затирается — витрина C4 сможет показать честно.

[Структурщик]: Принимаю. Один subject — один словарь, transcribed вне осей, проекция только над связанной tuple. Норма соблюдена.

[Математик]: Принимаю. Инварианты вычислимы чистой функцией, синтетических фактов нет.

[Teamlead]: Принимаю и фиксирую вердикт. C3–C7 не решены сознательно.

---

## ВЕРДИКТ C2

### Typed axis records

| Ось (subject) | Subject | Minimal values | Allowed assertion-events |
|---|---|---|---|
| **decision** | MANDATE / revision | `open`, `accepted`, `rejected`, `superseded` | assert(open) при создании; assert(accepted\|rejected\|superseded) добавляет новый assertion; порядок НЕ монотонный |
| **delivery** | SLICE | `pending`, `in-progress`, `delivered` | assert смены active assessment; обратные переходы не запрещены (C1 не давал ребра) |
| **outcome** | SLICE | `unassessed`, `met`, `unmet` | assert(met\|unmet); `unassessed` = отсутствие assertion, не синтетический факт |
| **visibility** | representation record | `active`, `archived` | assert(archived\|active); НИКОГДА не источник для decision/outcome |

**Вне осей:** `transcribed` — typed relation `Task → Mandate`, без assessment-значений; не участвует ни в одной проекции как ось.

### Well-typed projection

- Общий view легален **только** как проекция связанной tuple `(insightRevision, mandate, slice, representation)`.
- Отсутствие assertion проецируется минимальным «нет данных» значением оси (`unassessed`, `pending`) — **не** синтетическим фактом.
- Каждая проекция несёт ярлык своей оси; координаты берутся строго из домена своей оси.

### Exhaustive allowed / forbidden (классы)

| Класс | Тип | Правило |
|---|---|---|
| **Allowed** | любая tuple `(d, δ, o, v)` | каждая координата из домена своей оси; все well-typed cross-axis комбинации разрешены |
| **Forbidden 1** | ill-typed join | координата из домена чужой оси |
| **Forbidden 2** | derive-from-visibility/archive | decision/outcome выведены из `archived` |
| **Forbidden 3** | mutate-immutable | изменение/удаление assertion прежней revision |

### reopen / revoke / supersede

- `reopen(oldRevision) → newRevision{ id: new, decision: open }`; старый scope immutable; `reopened` — inter-revision event, **не** in-place decision-state; `transcribed` для новой revision — новая relation, не перенос.
- `revoke` / `supersede` — события, добавляющие assertion: `A' = A ∪ {new}`, `A ⊆ A'`, `|A'| > |A|`. Удаление из `A` запрещено всегда.
- Единственная утверждаемая монотонность — рост множества фактов; порядок значений осей НЕ монотонен без посылки.

### Фактически использованные посылки (по источникам)

| Источник | Что взято |
|---|---|
| **C1 facts** | нет prerequisites `outcome→delivery/accepted`; нет запрета cleanup после reject/supersede |
| **C2_TOPIC hard constraints** | оси по subject; transcribed вне осей; reopen=new revision; удалить X1–X3; запрет terminal/monotonic без посылок; assertion не overwrite |
| **brief / M0** | C2R — repair того же узла C2, не новый DAG |

### Явно отложено (не решается в C2)

- Evidence contract — **C3**
- History implementation / derived current view — **C4**
- Legacy — **C5**
- Operational enforcement — **C6**
- CLI — **C7**

**Definition of Done:** вердикт содержит heading `ВЕРДИКТ C2`; четыре typed axis record (subject, minimal values, allowed assertion-events); правила well-typed projection; exhaustive allowed/forbidden по классам; точную reopen/revoke/supersede семантику без мутации/удаления истории; таблицу использованных посылок по источникам; X1–X3 удалены; C3–C7 не затронуты.

---

*Реплик в диалоге: 22; каждый участник высказался не менее одного раза.*
