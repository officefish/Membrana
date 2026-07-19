# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-19T12:58:50.413Z |
| Команда | `yarn consilium` |
| Модель | claude-opus-4-8 |
| Файл | `docs/seanses/insight-archive-lifecycle-c2-state-axes-r4-2026-07-19.md` |
| Порядок ролей | Верстальщик → Музыкант → Структурщик → Математик → Teamlead |
| Повестка | `docs\meeting\insight-archive-lifecycle\C2_REPAIR3_TOPIC.md` |

**Вопрос:**

Исправить только C2 типологию: строго D=decision/MANDATE, L=delivery/SLICE, O=outcome/SLICE, V=archive-visibility/representation; четыре оси, ни одной больше. Сохранить Option, events, joins, no-inference, sources. Требуется ВЕРДИКТ C2; C3–C7 не решать.

---

# Консилиум: C2R3 — восстановление канонических четырёх осей D/L/O/V

**Повестка:** Заменить ошибочную типологию C2R2 строго каноническими record-осями D=decision/MANDATE, L=delivery/SLICE, O=outcome/SLICE, V=archive-visibility/representation. Четыре оси, ни одной больше. Сохранить `Option<assessment>`, events, joins, no-inference, sources. Выдать единственный ВЕРДИКТ C2; C3–C7 не трогать.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Верстальщик → Музыкант → Структурщик → Математик → Teamlead (циклически)

---

[Верстальщик]: Начну с потребителя вердикта — читатель это агент C3+ и человек в PR. C2R2 добавил пятую lifecycle-ось, и на «холсте» это сразу мёртвая дверь: пять колонок, из которых одна не имеет subject в замороженной таблице. Моя норма — один главный акцент и честная иерархия. Витрина вердикта обязана показывать ровно четыре записи, каждая со своим exact subject, без «призрачной» пятой строки, за которую цепляется глаз.

[Музыкант]: По касательной, аудио тут не задет, но ритм я узнаю — это как четырёхдорожечный микс, где C2R2 воткнул пятую дорожку без источника сигнала. Лишний трек не звучит, он только фонит. Мой флаг из `truth-graph`: не плоди сущность, у которой нет origin. Пятая ось — это фидбэк-петля без входа. Убираем, оставляем четыре чистые дорожки D/L/O/V.

[Структурщик]: Начну с термина, иначе DAG поплывёт. C2R2 совершил классическую подмену леммы: `supersede` — это **event над decision assertion**, а не отдельная ось жизненного цикла. Мы уже решали такой омоним в `code-review-honesty` 16.07: одно имя — один смысл. «Lifecycle-axis» — синоним-слой поверх D, его надо удалить и вернуть supersede туда, где он живёт по определению: событие на MANDATE/revision.

[Математик]: Формализую, иначе останется вкусовым. Запись — это кортеж из четырёх опциональных assessment: `Record = (D_opt, L_opt, O_opt, V_opt)`, где каждая ось — функция на своём exact subject. Домены не пересекаются: `dom(D)=MANDATE`, `dom(L)=dom(O)=SLICE`, `dom(V)=representation`. Пятая ось нарушает инвариант «число осей = 4»; это не расширение, это ошибка типизации. `None` — отсутствие assertion, не значение перечисления. Это надо зафиксировать явно.

[Teamlead]: Рамку фиксирую сразу, чтобы repair не сполз в новый спор. Мы **не** пересматриваем типологию — она заморожена. Мы восстанавливаем её дословно после того, как C2R2 её исказил. Форма следует функции: четыре оси оправданы четырьмя разными subjects, пятая — декор без конструкции, удаляется. Приоритет — буква замороженной таблицы. Идём по восьми исправлениям по порядку, каждое проверяем.

[Верстальщик]: Тогда исправление 1 и 3 — мои по читаемости. Воспроизводим таблицу дословно: D→decision→MANDATE, L→delivery→SLICE, O→outcome→SLICE, V→archive/visibility→representation. И V возвращаем с asserted values `active|archived` — это отдельная строка, не производная от D/L/O. На витрине V — самостоятельный столбец видимости, а не бейдж состояния решения.

[Музыкант]: Поддержу по исправлению 5 с живой стороны. `None` и `not-delivered` — это не одно и то же, как тишина в треке и намеренная пауза-глушение. Отсутствие assessment на SLICE — это «дорожку не писали». `not-delivered` — это «записали, и там провал». Свести их — потерять сигнал. L/O только на SLICE, отрицательные assessments реальны и не равны None.

[Структурщик]: Уточню границу по исправлению 2 и 8. `supersede(oldDecisionAssertion, successorRevision)` добавляет `superseded` assessment **старому MANDATE/revision** либо только event-link — и всё. Generic subject запрещён: нельзя, чтобы supersede висел на «записи вообще». Это ссылка на конкретную статью словаря, а не на абзац из чужой главы. Ось D остаётся единственным носителем decision-семантики.

[Математик]: По исправлению 4 добавлю численно. D values = `{proposed, accepted, rejected, deferred}` — это домен значений assessment. `superseded` в него **не входит** как пятое значение — иначе снова расширяем перечисление контрабандой. Он остаётся assessment-событием, добавляемым supersede-event, **без** terminal/monotonic claim. То есть `superseded` не «финальное состояние», а факт-ссылка: старая ревизия вытеснена, но её prior assertions не переписываются.

[Teamlead]: Согласен, и это ключевая развилка repair. C2R2 промахнулся именно тут: превратил supersede в ось, потому что путал «событие вытеснения» с «состоянием жизненного цикла». LGTM-условие для C2: если в вердикте появится хоть намёк на terminal/monotonic для `superseded` — вердикт недействителен. Событие — да, состояние-ось — нет.

[Верстальщик]: По исправлению 6 — no-inference — это прямо визуальный контракт честности. `V ⇏ D,L,O` и обратно. На экране это значит: столбец видимости не подсвечивает и не гасит столбцы решения/поставки. Никакого auto-mutation каскадом. Читатель видит четыре независимых факта, и ни один не «дорисован» из соседнего. Мёртвых дверей быть не должно — каждая ячейка либо asserted, либо честный `None`.

[Математик]: Формализую no-inference строго. Это два запрета отображений: не существует функции `f: V → (D,L,O)` и не существует `g: (D,L,O) → V`. Оси взаимно независимы как случайные величины — совместное распределение не факторизуется в условное. Плюс `no auto-mutation`: assertion на одной оси не порождает и не мутирует assertion на другой. Это проверяемый предикат для C3, но объявляется здесь как инвариант.

[Структурщик]: И projection по исправлению 7 — это join с жёсткими предусловиями, не декартово произведение вслепую. `D_opt(mandate) × L_opt(slice) × O_opt(slice) × V_opt(representation)` легитимен **только** при трёх связях: `mandate belongs-to insightRevision`, `slice ∈ mandate.scope`, `representation represents exact subject/scope`. Unlinked или ill-typed join запрещён — это возврат с пометкой «нарушена слабая связанность» на уровне графа правды.

[Музыкант]: Поддержу — это как маршрутизация сигнала: нельзя патчить выход одного модуля во вход другого, если частоты не совпадают. `insightRevision` участвует в join-context как шина синхронизации, но **не** заменяет exact subjects. Он контекст, не ось. Если начнём подмешивать его как пятую сущность — снова фонящая дорожка.

[Teamlead]: Верно. Фиксирую: `insightRevision` — join-context, не subject-подмена. Это прямо в замороженной рамке. Теперь сохранённая основа — исправления «уже принятая основа». Проверяем, что repair их не сломал: `Option<assessment>` (None не enum-value), `transcribed` = Task→Mandate вне осей, reopen → new revision/new ID/initial D=`proposed`.

[Структурщик]: Подтверждаю по терминам. `transcribed` — это не ось и не значение оси, это отношение Task→Mandate **вне** четырёх осей. reopen создаёт новую ревизию с новым ID и начальным D=`proposed`, но это **не** transcription — две разные леммы, не путать. И immutability: subject/id/scope/claims неизменны, prior assertions не delete/rewrite. No-delete — семантический constraint, history/derived view — это C4, здесь не решаем.

[Математик]: Численно закрою основу. `Option<assessment>`: множество значений оси = `assessment ∪ {None}`, где `None ∉ assessment`. Это тип-обёртка, а не член перечисления — иначе `not-delivered` и `None` слиплись бы, что запрещено исправлением 5. reopen: `D(newRevision) = proposed` по инициализации, старая ревизия сохраняет свои assertions неизменными. Всё это чистые инварианты, тестируемые без побочных эффектов.

[Верстальщик]: И sources по последней строке основы — атрибуция C1/C2_TOPIC/repair/M0. С витрины: у каждого исправления должен быть видимый provenance, откуда оно пришло. Карта C6/C7 не меняется — не наша зона. Читатель PR должен видеть, что вердикт C2 опирается на замороженную таблицу и предшественников, а не выдуман.

[Teamlead]: Собираю вердикт. Все восемь исправлений покрыты, основа сохранена, пятая ось удалена, supersede возвращён как event на D без terminal/monotonic. C3–C7 не трогаем — evidence meaning/criteria это C3, history/derived view это C4, карта источников C6/C7. Голосую за фиксацию канонической таблицы D/L/O/V как единственного вердикта C2. Кто «Принимаю»?

[Структурщик]: Принимаю. Термины разведены, subject-substitution исключён, join типизирован.

[Математик]: Принимаю. Инварианты (4 оси, None≠значение, no-inference, no auto-mutation, superseded=event) формализованы и проверяемы.

[Музыкант]: Принимаю. Четыре чистые дорожки, пятой фонящей нет, `insightRevision` — шина, не трек.

[Верстальщик]: Принимаю. Таблица дословна, V самостоятелен, provenance виден, мёртвых дверей нет.

[Teamlead]: Принимаю и фиксирую как ВЕРДИКТ C2. LGTM.

---

## Итоговое решение консилиума

### ВЕРДИКТ C2 — каноническая типология (четыре оси, ни одной больше)

| Ось | Единственный смысл | Exact subject | Optional asserted values (`Option<assessment>`, `None` = нет assertion) |
|-----|--------------------|--------------| ------------------------------------------------------------------------|
| **D** | decision | MANDATE / mandate-revision | `proposed` \| `accepted` \| `rejected` \| `deferred` |
| **L** | delivery | SLICE | asserted assessment (вкл. реальный отрицательный `not-delivered`) \| `None` |
| **O** | outcome | SLICE | asserted assessment (вкл. реальный отрицательный `not-realized`) \| `None` |
| **V** | archive / visibility | representation record | `active` \| `archived` |

**Events (не оси, не значения перечисления):**
- `supersede(oldDecisionAssertion, successorRevision)` → добавляет `superseded` **assessment** старому MANDATE/revision **или** только event-link. Без terminal/monotonic claim. Generic assertion subject/axis запрещён.
- `transcribed` = Task→Mandate, **вне** четырёх осей.
- `reopen` → new revision / new ID / initial `D=proposed`; это **не** transcription; prior assertions не delete/rewrite.

**Join / projection (строго):**
`D_opt(mandate) × L_opt(slice) × O_opt(slice) × V_opt(representation)` — легитимен **только** при `mandate belongs-to insightRevision` ∧ `slice ∈ mandate.scope` ∧ `representation represents exact subject/scope`. Unlinked/ill-typed join запрещён. `insightRevision` — join-context, **не** subject-подмена.

**Inference / mutation invariants (отдельно):**
- `V ⇏ D,L,O` и `D,L,O ⇏ V` (полный archive no-inference).
- `no auto-mutation`: assertion на одной оси не порождает/не мутирует assertion на другой.
- `None` ≠ отрицательный assessment (`not-delivered`/`not-realized`).
- subject/id/scope/claims immutable; no-delete — семантический constraint.

**Sources:** атрибуция C1 / C2_TOPIC / repair / M0. Карта C6/C7 не изменяется.

| Вопрос | Решение |
|--------|---------|
| Удалить придуманную пятую lifecycle-ось C2R2? | **Да** — удалена; supersede возвращён как event на D |
| Восстановить D/L/O/V дословно из замороженной таблицы? | **Да** — таблица выше, буква/subjects/число осей не изменены |
| `superseded` — ось или событие? | **Событие** на MANDATE/revision, без terminal/monotonic |
| `None` = отрицательный assessment? | **Нет** — `None` = отсутствие assertion; отрицательные реальны на SLICE |
| Сохранить Option / events / joins / no-inference / sources? | **Да** — все сохранены дословно |
| Решать C3–C7? | **Нет** — evidence/criteria (C3), history/derived (C4), карта (C6/C7) вне scope |

**Definition of Done:**
- Вердикт C2 содержит каноническую таблицу D/L/O/V с указанными subjects и optional values — **дословно**, без пятой оси.
- Отдельные блоки: optional values/events, projection/matrix, inference/mutation invariants, sources.
- Ни одного переименования оси, ни одной subject-substitution, ни одной пятой оси (иначе вердикт автоматически недействителен).
- `superseded` присутствует только как event/assessment без terminal/monotonic claim.
- C3–C7 не затронуты.

---

*Реплик в диалоге: 24; каждый участник высказался не менее одного раза (Верстальщик 5, Музыкант 4, Структурщик 5, Математик 5, Teamlead 6).*
