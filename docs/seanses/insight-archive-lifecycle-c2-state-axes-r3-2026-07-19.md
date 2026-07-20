# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-19T12:54:57.311Z |
| Команда | `yarn consilium` |
| Модель | claude-opus-4-8 |
| Файл | `docs/seanses/insight-archive-lifecycle-c2-state-axes-r3-2026-07-19.md` |
| Порядок ролей | Музыкант → Верстальщик → Структурщик → Teamlead → Математик |
| Повестка | `docs\meeting\insight-archive-lifecycle\C2_REPAIR2_TOPIC.md` |

**Вопрос:**

Исправить только C2 после двух BLOCK: Option<assessment>, exact typed subjects/values, deferred, event-vs-assessment supersede, полный no-inference, abstract join predicates, reopen без transcription, корректные C6/C7. Требуется ВЕРДИКТ C2; C3–C7 не решать.

---

# Консилиум: C2R2 — optional typed assertions и проверяемая projection

**Повестка:** Окончательно определить C2 после двух BLOCK — `Option<assessment>`, exact typed subjects/values по осям D/L/O/V, `deferred`, разведение supersede-события и assessment, полный no-inference invariant, abstract join predicates, reopen без transcription, корректные границы C6/C7. Выдать единственный **ВЕРДИКТ C2**; C3–C7 не проектировать.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Верстальщик → Структурщик → Teamlead → Математик (циклически)

---

[Музыкант]: По касательной, аудио тут не задет, но ритм задачи я узнаю — это как разведение сухого сигнала и эффекта в цепочке. Два BLOCK были ровно потому, что смешали «событие» и «оценку» в один узел, как если бы reverb писался прямо в мастер. Мой флаг из опыта `ritual-inputs-echo`: одно слово без роли — это `n=1`, выданный за два. Держим supersede как отдельный тракт, не как перезапись мастера.

[Верстальщик]: С точки зрения потребителя вердикта — а потребитель это агент, читающий active-view утром — «отсутствие assertion» и «pending-значение» на экране выглядят одинаково серым, и это мёртвая дверь. По исправлению №1: если отсутствие оценки = `None/Absent`, а не enum-значение, то читатель видит честную пустоту, а не поддельный статус. Требую, чтобы `Option<assessment>` в вердикте был явно `None`, не строка «unassessed».

[Структурщик]: Начну с термина, иначе DAG поплывёт. У нас четыре разные леммы-оси: **D** (delivery), **L** (?), **O** (outcome), **V** (validation) — и каждая обязана иметь **exact subject**, а не общий «insight». По C1 subject неизменяем: `subject = insightRevision`, `scope = slice ∈ mandate.scope`. Assessment — это `Option<assessment>` **над** subject, никогда не мутирует subject. Это несущая: assertion immutable, assessment optional и добавляемый.

[Teamlead]: Рамку фиксирую сразу, чтобы этот repair не сполз в проектирование C3–C7. Мы решаем **ровно** C2: типы четырёх осей, `Option<assessment>`, события assert/revoke/supersede/reopen без мутации scope, и no-inference. Всё, что про хранение событий и derived-view — это C4, не мы (исправление №10). Всё про enforcement и CLID — C6/C7 (исправление №7). Приоритет `ARCHITECTURE.md`: ядро — чистые предикаты, не UI.

[Математик]: Формализую, иначе останется вкусовым. Каждая ось — функция `axis: subject → Option<assessment_axis>`. Домены дискретны и **заданы явно**. Для V (validation/decision) исправление №2 требует покрыть `{proposed, accepted, rejected, deferred}` — четыре значения, не terminal, не monotonic: нет частичного порядка, любой переход разрешён новым assertion. `Absent` — это `None`, не пятое значение enum. Итого тип: `Option<{proposed|accepted|rejected|deferred}>`.

[Музыкант]: Поддержу Математика с живой стороны: `deferred` — это как трек, поставленный на паузу в проекте, а не удалённый. Он звучит («решение отложено»), но не финал. Важно не спутать его с `Absent` — пауза это осознанный жест, тишина отсутствия — другое. В вердикте это должно читаться как две разные вещи.

[Верстальщик]: Согласен, и добавлю боль с витрины. `deferred` и `Absent` обязаны иметь **разный бейдж**: отложено — `badge-warning`, отсутствует — пустое поле без бейджа вовсе. Если оба серые — оператор путает «мы решили подождать» и «никто не смотрел». Но это уже C4/визуал; для C2 достаточно зафиксировать, что типы **различимы на уровне модели**: `Some(deferred) ≠ None`.

[Структурщик]: Теперь исправление №3 — самое опасное, тут был BLOCK. «Supersede» слипается в омоним: (а) **событие** `supersede(oldAssertion, successorRevision)` и (б) **assessment** `superseded`. Развожу словарно: событие добавляет старому subject assessment `superseded` **и** линкует successor-revision, **не мутируя scope старого**. Это два разных термина: глагол-событие и значение-оценки. Одно слово без роли — запрещено, как мы решили в `truth-graph-q1`.

[Teamlead]: Принимаю разведение Структурщика как несущее. Но зафиксирую границу: `superseded` — это assessment на **отдельной оси жизненного цикла assertion**, не на оси V (decision). Иначе мы смешаем «решение по инсайту» и «этот assertion заменён новым». Две оси — два словаря. Supersede не трогает `proposed/accepted/rejected/deferred`.

[Математик]: Формализую no-inference, исправление №4. Полный инвариант: `V ⇏ {D,L,O}` и `{D,L,O} ⇏ V`, для всех пар — ни одна ось не auto-mutates другую. Это `∀ axisᵢ, axisⱼ (i≠j): assert(axisᵢ) не порождает assert(axisⱼ)`. В premises включаю факт C2_TOPIC: **task archive неоднороден** — значит нельзя вывести V из наличия D. Дефолтов-по-умолчанию нет: отсутствие = `None`, а не «выведём из соседа».

[Музыкант]: Поддержу аналогией: это как четыре независимых аудио-канала без внутреннего sidechain. Если бы delivery авто-открывал validation — это скрытый sidechain-компрессор, «магическая кнопка», которую мы всегда режем. Каждый канал утверждается своим жестом. Честно и без магии.

[Верстальщик]: С точки зрения читателя — no-inference должен быть **виден**: четыре оси = четыре независимых поля, ни одно не подсвечивается автоматически от соседнего. Если V пусто, а D заполнено — экран показывает ровно это, без «додумывания». Моя норма из `main-day-accuracy`: экран не врёт, не дорисовывает статус.

[Структурщик]: Исправление №5 — развожу две нормы, которые тоже слипались. Первая: **forbidden scope mutation** — `subject/id/scope/claims` immutable, их нельзя переписать никогда. Вторая: **no-overwrite assertion** — новый assessment/revoke/supersede **разрешён**, но прежний assertion не delete и не rewrite. Это разные запреты: первый про неизменность subject, второй про append-only историю оценок. Не путать.

[Teamlead]: Принимаю. И источники — исправление №6. Sources вердикта по **фактическому происхождению**: C1 даёт immutable scopes, Task→Mandate, три one-way non-implications и delivery/outcome dimensions. Отсутствие прочих prerequisites — это **repair-правило** «не выводить без premise», а не факт C1. Не приписываем C1 то, чего он не утверждал.

[Математик]: Исправление №8, reopen. Формально: `reopen(subject) → newRevision` с новым `id` и initial assessment `proposed`. Reopen **не** создаёт transcription — это ключевой запрет. Если transcription позже возникает, relation указывает на **новый Mandate**, не на старый. То есть reopen — это порождение нового узла в графе, а не мутация или воскрешение старого. `reopen ≠ un-supersede`.

[Музыкант]: Поддержу: reopen — это новый дубль записи, а не откат к старому мастеру. Старый мастер остаётся в архиве нетронутым, новая ревизия стартует с `proposed` — чистый лист на том же материале. Никакой transcription из воздуха.

[Структурщик]: Исправление №9, join-предикаты. Well-typed tuple проверяется **абстрактными предикатами без схемы**: `mandate belongs-to insightRevision`, `slice ∈ mandate.scope`, `representation represents exact subject/scope`. Allowed join = все optional axis-assignments над **linked** tuple. Unlinked или ill-typed join — **forbidden**. Это чистый предикат связности, не хранилище.

[Математик]: Уточню численно: exhaustive matrix — **только** для linked optional assignments. Матрица = декартово произведение осей над корректно связанным tuple: `D_opt × L_opt × O_opt × V_opt`, где каждый `_opt = Option<domainᵢ>`. Inference-правила и mutation-правила — это **отдельные инварианты**, не ячейки матрицы. Матрица перечисляет допустимые состояния, инварианты ограничивают переходы между ними.

[Teamlead]: Границы C6/C7 — исправление №7, закрываю их явно как открытые. C6 = agent workflow/enforcement и возможный CLI surface. C7 = operational safety/concurrency/idempotency/rollback-reopen. Мы их **не решаем**. C3 (evidence), C4 (history/views), C5 (legacy) — тоже открыты. Наш вердикт — только типы, события, инварианты, join-предикаты.

[Верстальщик]: Последнее с витрины и принимаю вердикт: пусть в самом артефакте C2 будет **один главный акцент** — заголовок `ВЕРДИКТ C2`, под ним четыре оси таблицей с колонкой `Option<assessment>`, ниже — отдельный блок «инварианты» и отдельный «join-предикаты». Не сваливать инварианты в ячейки матрицы — это разные слои информации, разные блоки. Тогда читатель не спутает состояние и правило.

[Математик]: Принимаю. Численно всё замкнуто: домены явные, `None` вместо дефолтов, no-inference как ∀-квантор, матрица только над linked tuple, инварианты отдельно. Проверяемо чистой функцией без схемы.

[Структурщик]: Принимаю. Каждая лемма получила однозначное имя: subject-immutable, assessment-optional-append, supersede-событие vs superseded-оценка, scope-mutation-forbidden vs assertion-no-overwrite, reopen-new-revision. DAG не плывёт.

[Музыкант]: Принимаю. Четыре независимых канала, никакого sidechain, deferred ≠ absent, reopen — новый дубль. Аудио не задет, но ритм чистый.

[Teamlead]: **LGTM.** Вердикт C2 замкнут в своих границах, C3–C7 не тронуты, оба прежних BLOCK сняты: событие и оценка разведены, no-inference полный, reopen без transcription. Принимаю как единый вердикт консилиума.

---

## Итоговое решение консилиума

### ВЕРДИКТ C2

**Оси и типы (exact subject, `Option<assessment>`, минимальные asserted values):**

| Ось | Exact subject | `Option<assessment>` — домен | Absent |
|-----|---------------|------------------------------|--------|
| **D** (delivery) | `insightRevision` | `Option<{ delivered \| not-delivered }>` (минимальный asserted набор из C1 delivery dimension) | `None` |
| **L** (lifecycle того же assertion) | `assertion` | `Option<{ active \| superseded }>` — значение `superseded` ставится событием supersede | `None` |
| **O** (outcome) | `insightRevision` | `Option<{ realized \| not-realized }>` (C1 outcome dimension) | `None` |
| **V** (validation/decision) | `insightRevision` | `Option<{ proposed \| accepted \| rejected \| deferred }>` — не terminal, не monotonic | `None` |

- **Absent ≠ enum-value.** Отсутствие оценки = `None`, не `pending`/`unassessed`. Никаких дефолтов-по-умолчанию.
- `Some(deferred) ≠ None` — отложенное решение и отсутствие оценки различимы на уровне модели.

**События assessment (без in-place scope mutation):**

| Событие | Семантика |
|---------|-----------|
| `assert(axis, value)` | добавляет asserted assessment по оси; прежний assertion не delete/rewrite |
| `revoke(axis)` | снимает ранее asserted assessment (append-only, не стирает историю) |
| `supersede(oldAssertion, successorRevision)` | **событие**: ставит старому subject L-assessment `superseded` **и** линкует successor-revision; scope старого **не мутируется** |
| `reopen(subject)` | порождает `newRevision` с новым `id`, initial V=`proposed`; **не** создаёт transcription; будущая transcription (если возникнет) ссылается на **новый Mandate** |

**Инварианты (отдельно от матрицы, не ячейки):**

| # | Инвариант |
|---|-----------|
| I1 | **No-inference (полный):** `V ⇏ {D,L,O}` и `{D,L,O} ⇏ V`; ∀ пар осей i≠j: assert(axisᵢ) не auto-mutates axisⱼ. Premise: task archive неоднороден (C2_TOPIC). |
| I2 | **Forbidden scope mutation:** `subject/id/scope/claims` immutable. |
| I3 | **No-overwrite assertion:** новый assessment/revoke/supersede разрешён; прежний assertion не delete/rewrite (append-only). |
| I4 | **Supersede-событие ≠ `superseded`-оценка:** глагол-событие и значение оси L — разные термины. |
| I5 | **Reopen ≠ un-supersede ≠ transcription:** reopen = новый узел графа. |

**Join-предикаты (abstract, без схемы):**

- `mandate belongs-to insightRevision`
- `slice ∈ mandate.scope`
- `representation represents exact subject/scope`
- **Allowed** = все optional axis-assignments над *linked* tuple; **exhaustive matrix** = `D_opt × L_opt × O_opt × V_opt` только над linked tuple. **Unlinked / ill-typed join — forbidden.**

**Sources (по фактическому происхождению):**

- C1: immutable scopes, Task→Mandate, три one-way non-implications, delivery/outcome dimensions.
- Repair-правило (не факт C1): «не выводить prerequisites без premise».
- C2_TOPIC: неоднородность task archive → в premises I1.

**Оставлены открытыми (не решаем):** C3 evidence · C4 history/views (в т.ч. как хранить события и вычислять active/derived) · C5 legacy · C6 agent enforcement/CLI · C7 operational safety/concurrency/idempotency/rollback-reopen.

**Definition of Done (для узла C2):**
- В артефакте C2 присутствует единственный heading `ВЕРДИКТ C2`.
- Для D/L/O/V заданы exact subject, `Option<assessment>` и минимальные asserted values.
- События assert/revoke/supersede/reopen описаны без in-place scope mutation.
- Exhaustive matrix — только для linked optional assignments; inference/mutation — отдельными инвариантами, не ячейками.
- Sources проставлены по фактическому происхождению.
- C3–C7 явно помечены открытыми, не спроектированы.
- Оба прежних BLOCK сняты (event-vs-assessment разведены; no-inference полный).

---

*Реплик в диалоге: 24; каждый участник высказался не менее одного раза.*
