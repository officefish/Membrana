# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-18T08:45:16.461Z |
| Команда | `yarn consilium` |
| Модель | claude-opus-4-8 |
| Файл | `docs/seanses/insight-archive-lifecycle-c2-state-axes-2026-07-18.md` |
| Порядок ролей | Математик → Верстальщик → Музыкант → Teamlead → Структурщик |
| Повестка | `docs\meeting\insight-archive-lifecycle\C2_TOPIC.md` |

**Вопрос:**

Решить только C2 на основе C1_VERDICT.md: отдельные decision/delivery/outcome/archive-visibility axes, переходы и исчерпывающая cross-axis constraint matrix. Archive не доказывает другие оси; immutable scopes не мутируют. Evidence/storage/CLI/legacy не решать. Требуется ВЕРДИКТ C2 и premises.

---

# Консилиум: C2 — независимые оси состояния (decision / delivery / outcome / archive-visibility)

**Повестка:** Определить минимальную ортогональную модель состояний для сущностей C1 (INSIGHT-revision, MANDATE-claimset, SLICE-claim): отдельные typed axes для decision, delivery, outcome, archive/visibility; переходы по каждой оси; исчерпывающая cross-axis constraint matrix. Archive не доказывает другие оси; immutable scopes из C1 не мутируют. Evidence/storage/CLI/legacy — вне C2.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Математик → Верстальщик → Музыкант → Teamlead → Структурщик (циклически)

---

[Математик]: Формализую сразу, иначе «оси» останутся вкусовыми. Модель — это произведение четырёх независимых typed-множеств: `S = D × L × O × V`, где D=decision, L=delivery (delivery), O=outcome, V=archive/visibility. Ортогональность значит: проекция `π_D(s)` не определяется значениями на других осях. C1 уже дал нам non-implications (`accepted ⇏ transcribed`, `delivered ⇏ outcome-proven`) — это ровно утверждения о том, что рёбра между проекциями не тотальны. Моя задача — задать домен каждой оси и вычислимый предикат допустимости комбинации `valid(s) → bool`.

[Верстальщик]: С точки зрения потребителя вердикта — а потребитель это агент и человек, читающий карточку сущности — четыре оси должны быть четырьмя отдельными бейджами, а не одним слипшимся статусом. Моя норма из `main-day-accuracy`: если archive и delivered показаны одним индикатором, читатель видит мёртвую дверь — «заархивировано» выглядит как «доказано», хотя C1 прямо это запретил. Мне для честности экрана нужны раздельные визуальные слоты по каждой оси, иначе invariant `archive ⇏ delivered` не читается глазом.

[Музыкант]: По касательной — аудио тут не задет, голосую по ритму. Но четыре независимых клока я узнаю: это как четыре дорожки в проекте, у каждой свой fader, их нельзя сводить в один мастер до финального экспорта. Живой флаг из `ritual-inputs-echo`: если склеить delivery и outcome в одну дорожку, получим тот же обман, что три отражения одного снимка — `n=1` выданный за `n=2`. «Сдал работу» и «работа дала результат» — два разных звука, не смешивать на одном канале.

[Teamlead]: Рамку фиксирую сразу, чтобы C2 не колонизировал C3–C7. Мы решаем ровно оси, переходы и матрицу — не формат evidence, не storage, не CLI. Приоритет — вердикт C1: immutable `(subject, scope)` не мутирует, а оси описывают **assertion-state поверх** неподвижной идентичности. Мой профиль «форма следует функции»: четыре оси оправданы, только если каждая несёт функцию, невыводимую из других. Дынин уже показал — non-implications C1 доказывают именно это. Принимаю четырёхосную модель как несущую конструкцию.

[Структурщик]: Начну с термина, иначе DAG поплывёт. У нас четыре разные леммы, и C1 запретил их слипание: **decision** — «что команда постановила о mandate» (accept/reject/defer/supersede/reopen); **delivery** — «сделана ли работа Task→Mandate»; **outcome** — «подтверждён ли результат в мире»; **visibility** — «виден ли артефакт в рабочих экранах / заархивирован». Ключ: `transcribed` из C1 — это ребро Task→Mandate, оно **не** ось INSIGHT. Оно живёт на delivery-оси как предикат покрытия, а не как пятая ось. Это надо зафиксировать явно.

[Математик]: Согласен со Структурщиком по `transcribed` и добавлю домены. **D (decision):** `{proposed, accepted, rejected, deferred, superseded, reopened}` — терминальные: `rejected`, `superseded`; `reopened` возвращает в `proposed`. **L (delivery):** `{undelivered, in-progress, delivered, abandoned}`. **O (outcome):** `{unproven, outcome-proven, outcome-refuted}`. **V (visibility):** `{visible, archived-hidden}`. Инвариант ортогональности: `V=archived-hidden` не влечёт никакого значения на D/L/O — формально `π_D, π_L, π_O` свободны при любом V.

[Верстальщик]: Тогда закреплю доменный факт из повестки — он прямо бьёт по витрине. Task archive сегодня содержит delivered, branch-only, wontfix, duplicate, defer. Это значит: **archived-hidden — не доказательство ни delivery, ни outcome, ни decision-terminal**. На экране это должно выглядеть так: бейдж visibility отдельно, и archived НЕ красит остальные три оси в «завершено». Иначе оператор читает «в архиве» как «сделано и доказано» — ровно та мёртвая дверь, что C1 запретил тремя hard-invariants.

[Музыкант]: Поддержу и добавлю живой флаг по `abandoned` на delivery. Это как трек, который писали и бросили: он не «сдан» и не «пустой» — он в третьем состоянии. Если этого состояния нет, branch-only и wontfix из архива некуда положить по delivery-оси, и они молча притворятся `undelivered`. Дайте `abandoned` явно, иначе на ресемплинге между delivery и visibility будет щелчок — потеря информации о том, почему в архиве.

[Teamlead]: Принимаю `abandoned` на delivery как оправданное конструкцией — оно несёт функцию «работа велась и прекращена без сдачи», невыводимую из `undelivered`/`delivered`. Но держу границу: `wontfix`/`duplicate`/`defer` — это **decision** и **visibility**, не delivery. Дынин прав про домены; Структурщик пусть проверит, что мы не размазали одну лемму по двум осям. Doubling смысла между `deferred` (D) и `undelivered` (L) — это анти-паттерн, который надо снять в матрице.

[Структурщик]: Снимаю. `deferred` (D) = «решение отложено», `undelivered` (L) = «работа не сделана». Они ортогональны: deferred-mandate может иметь delivered-slice (сделали, потом отложили решение) — редко, но допустимо, и матрица не должна это запрещать. А вот `superseded`(D) + `in-progress`(L) — запретить: нельзя вести работу под mandate, который уже заменён новой revision. Вот здесь матрица получает первое **forbidden** с обоснованием: терминальный decision замораживает delivery-прогресс.

[Математик]: Формализую переходы по каждой оси. **D-переходы:** `proposed→{accepted,rejected,deferred}`; `accepted→{superseded,reopened}`; `deferred→{proposed,rejected}`; `reopened→proposed`; `rejected`, `superseded` — терминальны, выход только через новую revision (новый ID по C1). **L:** `undelivered→{in-progress,abandoned}`; `in-progress→{delivered,abandoned}`; `delivered→undelivered` запрещён (delivery монотонна вперёд, откат только новой revision). **O:** `unproven↔{outcome-proven,outcome-refuted}` обратимы (новое свидетельство меняет вывод — outcome не терминален). **V:** `visible↔archived-hidden` полностью обратим.

[Верстальщик]: Про обратимость O и V — с витрины это важно. Outcome и visibility должны читаться как **изменяемые** бейджи (могут вернуться), а decision-terminal и delivery-forward — как **зафиксированные**. Если показать outcome-proven тем же «замком», что superseded, читатель решит, что доказанное нельзя опровергнуть — а Дынин прямо сказал: новое свидетельство меняет O. Разная визуальная семантика: замок для терминальных D, стрелка-вперёд для L, двусторонняя стрелка для O и V.

[Музыкант]: Тут вклинюсь с риск-флагом на reopen. Reopen(D) — это как достать мастер из архива и снять замок для новой сессии. Но C1 сказал: новая фаза = новый immutable ID, прошлое не мутирует. Значит reopen не «размораживает старую revision», а **порождает новую** и переносит на неё proposed-decision. Иначе мы перезапишем мастер-запись — то самое, что запрещено. Пусть матрица это отразит: reopen применительно к терминальной revision = создание преемника, не мутация.

[Teamlead]: Точно, и это ключевая граница C1↔C2. Reopen/supersede/reject/defer меняют **только assertion/state axes текущей или новой revision**, но immutable subject/scope/claims не мутируют. Формулирую вердикт-принцип: терминальный decision (`rejected`/`superseded`) не переоткрывается in-place — переход `reopened` легитимен только как атрибут новой revision-ID. Дынин, зафиксируй это как инвариант матрицы, а не как переход внутри одной сущности.

[Математик]: Фиксирую инвариант **I-terminal:** для фиксированного revision-ID множество достижимых D-состояний из `{rejected, superseded}` пусто; `reopened` определён только на паре `(старая-revision.terminal, новая-revision.proposed)`. Теперь исчерпывающая cross-axis матрица. Классов комбинаций `6(D)×4(L)×3(O)×2(V)=144`, но ограничения кусочные — задаю их как предикаты, а не перечислением 144 клеток. Три hard-invariant C1 + производные.

[Структурщик]: Перечислю предикаты словарно, чтобы каждый имел один смысл. **F1** (C1 hard): `V=archived-hidden ⇒ ¬(L=delivered ∧ обязателен)` — уточню: archive **не влечёт** delivered, но и **не запрещает**; правильная форма — archive НЕ является доказательством L=delivered. То есть запрет не на комбинацию, а на **вывод**. Это разные вещи! Матрица разрешает `archived-hidden ∧ delivered` и `archived-hidden ∧ undelivered` одновременно — оба валидны, потому что архив ортогонален.

[Математик]: Верно, снимаю неточность. C1-invariants — это запреты на **импликацию**, не на со-присутствие. Переформулирую строго: разрешены ВСЕ комбинации `V × (D,L,O)`, потому что archive/visibility ортогональна по построению (`archived-hidden ⇏ delivered`, `⇏ outcome-proven`, `⇏ terminal decision` — это ⇏, отсутствие ребра, не запрет клетки). Реальные **forbidden-клетки** возникают только из внутренней монотонности осей и семантики decision↔delivery.

[Teamlead]: Хорошо, это чистит модель. Тогда forbidden-множество маленькое и оправданное, а не декоративное. Структурщик, собери его в матрицу: только те клетки, где две оси логически несовместимы **по смыслу**, а не по привычке. И явно: visibility ни одну клетку не запрещает — она свободная ось. Это и есть ответ на «archive не доказывает другие оси»: archive не запрещает и не влечёт, он независим.

[Структурщик]: Собираю forbidden (обоснование при каждом). **X1:** `D∈{rejected,superseded} ∧ L=in-progress` — запрещено: нельзя вести работу под отменённым/замещённым решением (delivery-прогресс требует живого decision). **X2:** `D=proposed ∧ O=outcome-proven` — запрещено: результат не может быть доказан до принятия решения о mandate (outcome предполагает delivered-работу под accepted-decision). **X3:** `L=undelivered ∧ O∈{outcome-proven,outcome-refuted}` — запрещено: нет доставленной работы → нечего доказывать/опровергать в мире. Всё остальное — allowed, включая любую комбинацию с V.

[Математик]: Проверю X2/X3 на непротиворечивость с C1. C1: `delivered ⇏ outcome-proven` — да, delivered НЕ влечёт proven (proven требует дополнительно свидетельства). Но обратное `outcome-proven ⇒ L=delivered` — это **необходимое условие**, не импликация, запрещённая C1. C1 запрещал только `delivered⇒proven` (в forward-сторону), а `proven⇒delivered` (backward-необходимость) он не запрещал — он его подразумевает. X3 корректен. X2 аналогично: proven требует accepted decision как необходимое, не как следствие. Непротиворечиво.

[Музыкант]: Последний живой флаг — про `abandoned` и outcome. Брошенный трек результата не даёт: `L=abandoned ∧ O∈{proven,refuted}` тоже надо в forbidden — это подкласс X3 по духу, но с abandoned вместо undelivered. Иначе кто-то положит «бросили, но доказали» — это щелчок. Пусть X3 читается как `L∉{delivered} ∧ O≠unproven → forbidden`, покрывая и undelivered, и in-progress, и abandoned.

[Верстальщик]: Согласен, и с витрины X3 в широкой форме — самый читаемый инвариант: outcome-бейдж (proven/refuted) физически не показывается, пока delivery-бейдж не `delivered`. Это одна строка правила на экране, глаз ловит сразу. А visibility — всегда отдельный свободный бейдж справа, никогда не влияет на цвет остальных трёх. Так три hard-invariant C1 становятся видимой конструкцией, а не спрятанной логикой.

[Teamlead]: Принимаю. Сводим. Четыре ортогональные оси, переходы per-axis, forbidden = {X1, X2, X3-широкий}, visibility свободна, reopen через новую revision, immutable C1-scopes не мутируют. Дынин закрыл непротиворечивость, Структурщик — словарь без дублей, Курёхин — abandoned и щелчки, Родченко — читаемость. Выдаю ВЕРДИКТ C2 без ветвления. LGTM.

---

## ВЕРДИКТ C2

### Четыре ортогональные typed axes

| Ось | Домен состояний | Терминальные | Обратимость |
|-----|-----------------|--------------|-------------|
| **D — decision** | `proposed, accepted, rejected, deferred, superseded, reopened` | `rejected`, `superseded` (in-place) | Только через новую revision-ID |
| **L — delivery** | `undelivered, in-progress, delivered, abandoned` | — (delivery монотонна вперёд) | Откат только новой revision |
| **O — outcome** | `unproven, outcome-proven, outcome-refuted` | нет | Полностью обратима (новое свидетельство) |
| **V — archive/visibility** | `visible, archived-hidden` | нет | Полностью обратима |

`transcribed` — **не ось**: отношение Task→Mandate, живёт как предикат покрытия на оси L (C1-неподвижное).

### Переходы по осям

| Ось | Разрешённые переходы |
|-----|----------------------|
| **D** | `proposed→{accepted,rejected,deferred}`; `accepted→{superseded,reopened}`; `deferred→{proposed,rejected}`; `reopened→proposed`; из `rejected`/`superseded` — **нет** (только новая revision) |
| **L** | `undelivered→{in-progress,abandoned}`; `in-progress→{delivered,abandoned}`; `delivered→undelivered` **запрещён** |
| **O** | `unproven↔outcome-proven`; `unproven↔outcome-refuted`; `outcome-proven↔outcome-refuted` (все обратимы) |
| **V** | `visible↔archived-hidden` (полностью обратим) |

### Инвариант I-terminal (граница C1↔C2)

Для фиксированного revision-ID достижимость из терминальных D-состояний пуста. `reopened` определён **только** на паре `(old-revision.terminal → new-revision.proposed)`; immutable subject/scope/claims из C1 не мутируют, новая phase/revision получает новый ID. Reopen/supersede/reject/defer меняют **только** assertion/state axes.

### Исчерпывающая cross-axis constraint matrix

Базовое правило: **все** комбинации `D × L × O × V` разрешены, КРОМЕ трёх запретов ниже. C1-invariants (`archived-hidden ⇏ delivered/outcome-proven/terminal-decision`) — это отсутствие **импликации**, не запрет клетки; поэтому visibility (V) **не запрещает ни одной комбинации** и не влечёт значений других осей.

| # | Forbidden-комбинация | Обоснование |
|---|----------------------|-------------|
| **X1** | `D∈{rejected,superseded} ∧ L=in-progress` | Нельзя вести работу под отменённым/замещённым решением; delivery-прогресс требует живого decision |
| **X2** | `D=proposed ∧ O∈{outcome-proven,outcome-refuted}` | Результат не доказывается/опровергается до принятия решения (accepted — необходимое условие O≠unproven) |
| **X3 (широкий)** | `L∉{delivered} ∧ O≠unproven` (покрывает `undelivered`, `in-progress`, `abandoned`) | Нет доставленной работы → нечего доказывать в мире; `delivered` — необходимое (не следствие) условие для O |

Всё остальное (включая `archived-hidden ∧ delivered`, `archived-hidden ∧ undelivered`, `deferred ∧ delivered`, `abandoned ∧ visible` и т.д.) — **allowed**.

### Обратимость и особые переходы

- **D:** необратим в терминалы (`rejected`/`superseded`) in-place; `reopened`/`deferred` — обратимы только через новую revision.
- **L:** монотонна вперёд; откат — новой revision.
- **O:** полностью обратима.
- **V:** полностью обратима; независима от всех осей.
- **supersede/reject/defer/reopen:** меняют только state axes; immutable C1-идентичность неприкосновенна.

### Список фактически использованных посылок

1. C1: closure относится к immutable `(subject, scope)`, не определяет status.
2. C1 non-implications: `accepted⇏transcribed`, `transcribed⇏delivered`, `delivered⇏outcome-proven` — как **отсутствие рёбер** между проекциями.
3. C1 hard-invariants: `archive/hidden ⇏ delivered / outcome-proven / terminal-decision`; delivery/outcome не меняют visibility.
4. C1: `transcribed` — отношение Task→Mandate, не ось INSIGHT.
5. C1: новая фаза = новый immutable ID; reopen/supersede/reject/defer меняют только state axes.
6. Доменный факт повестки: task archive содержит delivered/branch-only/wontfix/duplicate/defer → archive не доказывает ни одной оси.
7. Требование: раздельные typed axes для decision/delivery/outcome/archive-visibility; delivery и outcome не объединять.

**Не решалось (вне C2):** evidence format/contract, storage/history, CLI, legacy classification — остаются C3–C7.

**Definition of Done:** неприменимо — C2 — вердикт-артефакт для DAG заседания, не задача в коде. Выход: раздел `ВЕРДИКТ C2` + матрица + premises, потребляемый C3.

---

*Реплик в диалоге: 23; каждый участник высказался не менее одного раза.*
