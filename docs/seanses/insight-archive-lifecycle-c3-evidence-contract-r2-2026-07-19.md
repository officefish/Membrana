# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-19T13:30:16.895Z |
| Команда | `yarn consilium` |
| Модель | claude-opus-4-8 |
| Файл | `docs/seanses/insight-archive-lifecycle-c3-evidence-contract-r2-2026-07-19.md` |
| Порядок ролей | Верстальщик → Структурщик → Музыкант → Математик → Teamlead |
| Повестка | `docs\meeting\insight-archive-lifecycle\C3_REPAIR_TOPIC.md` |

**Вопрос:**

Исправить только C3 после BLOCK: per-SLICE 0..N evidence, immutable scope completeness, derived epic summaries без pseudo-axis, bounded affirmative negative basis, target-aware provenance/dedup, contract-only DoD/sources. C4–C7 не решать. Требуется ВЕРДИКТ C3.

---

# Консилиум: C3-repair — evidence graph без pseudo-axis и closed-world вывода

**Повестка:** Исправить только C3 после BLOCK: per-SLICE 0..N evidence, immutable scope completeness, derived epic summaries без pseudo-axis, bounded affirmative negative basis, target-aware provenance/dedup, contract-only DoD/sources. C4–C7 не решать. Требуется ВЕРДИКТ C3.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Верстальщик → Структурщик → Музыкант → Математик → Teamlead

---

[Верстальщик]: Начну с потребителя графа — а потребитель это агент/человек, читающий evidence по SLICE claim. Моя боль из `main-day-accuracy` та же: сейчас evidence-узел может показывать «доказано», не показывая, какой именно SLICE claim он закрывает. Требую по контракту: каждый EvidenceNode несёт `targetClaim` в явном виде, и на витрине читается «этот node → ровно этот claim». Без этого будет мёртвая дверь: зелёная галочка на epic-уровне, за которой ноль per-SLICE оснований.

[Структурщик]: Начну с термина, иначе граф поплывёт. У нас слиплись три леммы под словом «доказано»: **evidence** (affirmative node на exact SLICE claim), **hint** (не-обязывающий сигнал) и **invalid** (не проходит basis-правило). Пункт 6 брифа их уже разводит: «просто не нашли»/timeout без declared rule — это hint или invalid, но **никогда** evidence. Фиксирую как несущую границу словаря: `EvidenceNode.kind ∈ {evidence}`, а hint/invalid живут отдельным типом и в weight не входят.

[Музыкант]: По касательной, аудио тут не задет, но у меня живой флаг из `ritual-inputs-echo`: три отражения одного снимка — это `n=1`, а не `n=3`. Здесь то же самое в пункте 5: один `originRef` может законно доказывать разные claims, но **дубликат одного target от одного origin не добавляет independent weight**. Это ровно декоррелированность детекторов: вес ансамбля не растёт от эха. Запишите в контракт явно, иначе roll-up соврёт громкостью.

[Математик]: Формализую, иначе останется вкусовым. EvidenceNode = `{targetClaim, kind: evidence|hint|invalid, originRef, digest?, predicate, version}`. Cardinality: один target claim имеет `0..N` independent evidence nodes; каждый node доказывает **ровно один** claim — это не биекция, а функция `node → claim`, сюръективность не требуется. Dedup key = `(targetClaim, originRef-or-digest, predicate/version)`. Independent weight = число **различных** dedup-ключей с `kind=evidence`, эхо схлопывается ключом автоматически. Это чистая, тестируемая функция.

[Teamlead]: Рамку фиксирую сразу, чтобы repair не расползся в C4–C7. Мы правим **ровно C3**: контракт evidence-графа, cardinality, provenance/dedup, negative basis и derived summaries. История/storage (C4), legacy (C5), UX/enforcement (C6), operational safety (C7) — закрыты для нас, только open-map. По конструкции: L-enum остаётся **только per-SLICE**, epic summary — производная, не ось. Это несущая стена, не декор.

[Верстальщик]: Держу C6 за дверью, но зафиксирую след для него, не решая: derived summary `complete|partial|unknown` — это отдельный визуальный слой над per-SLICE, не смешивать в один список с evidence-узлами. Смешанный поток = мёртвая дверь (мы это решили в `truth-graph-q1`). Сейчас только контракт: summary **не** является evidence target и **не** меняет L enum. Отрисовку оставляю C6.

[Структурщик]: Тогда термин completeness. Пункт 4: completeness считается по полному `mandate.scope` / declared immutable slice graph. Значит `unknown/incomplete` — это лемма «граф неполон», а не «получено отрицание». Missing link или required Slice=None → `unknown/incomplete`, **не** negative. Это критично: отсутствие ≠ опровержение. Closed-world вывод («не нашли → значит нет») здесь запрещён по определению.

[Математик]: Поддержу и уточню численно. Пункт 1: удаляем `pending`. Отсутствие L/O assertion = `None`, а не третье состояние. Complete-check использует `Some(exactValue)` только там, где конкретный summary требует эту axis. Формально: `complete(scope) = ∀ requiredSlice ∈ scope : assertion(slice) = Some(v)`. Если хоть один `None` → summary = `unknown/incomplete`. Никакого open-world отрицания: `None` не эквивалентно `not-delivered`.

[Музыкант]: Вот тут — самый рискованный маршрут сигнала, и я его помечаю как в опыте `sunrise-flash`. Negative basis (пункт 6) не должен стать «магической кнопкой» отрицания. `not-delivered` = **явный** refusal/cancellation/failure относительно declared acceptance window. `not-realized` = **выполненная** проверка criteria с отрицательным результатом и observation window. Оба требуют affirmative bounded basis — есть окно, есть правило. Тишина в буфере — не отрицание, это пустой зал.

[Математик]: Именно, формализую negative как bounded predicate. `negative(claim)` валиден ⟺ `∃ declaredWindow ∧ (explicitRefusal ∨ (criteriaCheck.executed ∧ result=false ∧ observationWindow))`. Если `declaredWindow = None` → это **не** negative evidence, а hint или invalid. То есть negative — это affirmative утверждение о наблюдённом отсутствии внутри объявленной границы, а не «мы не встретили». Разница ровно как между `P(отказ)` и «выборки не было».

[Teamlead]: Принимаю разведение absence/negative как несущее. Добавлю границу источников (пункт 10), чтобы repair не тянул чужие премиссы. Sources: `C1_VERDICT` = immutable subject/scope/MANDATE/SLICE; `C2_VERDICT` = exact enums, linked tuple, no-inference; `C3_TOPIC` + brief/M0 = scenarios/scope. Всё. DESIGN и role-memory — **максимум non-binding analogies**, не логические премиссы и не основание dedup (пункт 9). Kuryokhin, твоё «эхо» — иллюстрация, не аксиома графа.

[Музыкант]: Согласен, беру аналогию как иллюстрацию, не как основание. Но контрактно эхо кодируется без меня — через dedup key Dynin'а. Мой вклад — требование, чтобы roll-up **не** суммировал коррелированные node. Это уже в пункте 5, просто подчёркиваю: «один origin → много claims — ок; много дублей → один claim — не множит вес».

[Структурщик]: Тогда task/scenario (пункты 2, 7). Task транскрибирует MANDATE с `1..N` **immutable** SLICE — никакого single-task=single-slice. Scenario — per linked slice/axis. Это разводит две леммы, которые слипались: «задача» (транспорт мандата) и «срез» (единица утверждения). Scenario matrix строится на связке `(slice, axis)`, и каждая ячейка ссылается на свои evidence nodes или на `None`. Матрица — derived, не источник истины.

[Верстальщик]: С точки зрения читаемости матрицы — каждая ячейка должна честно показывать одно из трёх: `evidence(N≥1)`, `None` (нет assertion) или `negative(bounded)`. Три разных состояния, не два. По моей норме «не только цвет для статуса»: `None` и `negative` нельзя красить одинаково серым — это разные двери. Но отрисовку фиксирует C6; здесь я лишь требую, чтобы контракт **различал** эти три значения как отдельные, а не схлопывал `None` в `negative`.

[Математик]: Закрою derived summary численно, чтобы не осталось pseudo-axis. `EpicDeliverySummary` = `f(per-slice assertions)` — чистая проекция, **не** новый enum на C2-оси. Значения summary (`complete|partial|unknown` или точные эквиваленты) **не** меняют L per-SLICE и **не** являются evidence target (пункт 3). Инвариант, проверяемый функцией: `∀ summary : summary ∉ evidence.targets ∧ summary.derivedFrom = sliceGraph`. Если кто-то повесит evidence на summary — это pseudo-axis, отклоняем.

[Структурщик]: И DoD-границу (пункт 8) как термин: DoD только для **verdict/contract**. Implementation, unit tests, UI/a11y/clickability — это C6, не наша словарная статья. Мы отдаём контракт EvidenceNode/edges/cardinality/provenance/negative-basis и scenario matrix. Тесты на эту чистую функцию — да, но их enforcement и UI — за дверью C6.

[Музыкант]: Поддержу — не тащим реализацию в вердикт. Мой единственный аудио-независимый вклад закрыт: negative bounded, эхо не множит вес, roll-up не суммирует коррелированное. Принимаю.

[Верстальщик]: Принимаю. Контракт различает три состояния ячейки, summary — отдельный слой, C6 рисует. Мёртвых дверей на уровне контракта нет.

[Математик]: Принимаю. Cardinality, dedup, negative predicate и derived-projection — чистые функции с явными инвариантами, без pseudo-axis и без closed-world.

[Структурщик]: Принимаю. Термины разведены: absence≠negative, summary≠axis, task≠slice, evidence≠hint≠invalid. Границы словаря держат.

[Teamlead]: Принимаю и выношу ВЕРДИКТ C3. C4–C7 не тронуты, только open-map. LGTM на контракт.

---

## ВЕРДИКТ C3

### Corrected EvidenceNode / edges / cardinality / provenance

| Аспект | Контракт |
|--------|----------|
| **EvidenceNode** | `{ targetClaim, kind: evidence, originRef, digest?, predicate, version }` — доказывает **ровно один** SLICE claim |
| **kind** | `evidence` \| `hint` \| `invalid`; в independent weight входит **только** `evidence` |
| **Cardinality** | один target claim → `0..N` independent evidence nodes; `node → claim` — функция (не биекция) |
| **Dedup key** | `(targetClaim, originRef-or-digest, predicate/version)`; digest/hash условный |
| **Provenance** | generic immutable `originRef`; один origin может законно доказывать **разные** claims |
| **Weight** | independent weight = число различных dedup-ключей c `kind=evidence`; дубликат одного target от одного origin вес **не** увеличивает |

### Assertion / completeness (без closed-world)

| Правило | Значение |
|---------|----------|
| `pending` | **удалён** |
| Отсутствие L/O assertion | `None` (не третье состояние, не negative) |
| Complete check | `Some(exactValue)` только там, где конкретный summary требует axis |
| Completeness | по полному `mandate.scope` / declared immutable slice graph |
| Missing link / required Slice=None | summary `unknown/incomplete` — **не** negative |

### Negative basis (bounded affirmative)

| Тип | Условие валидности |
|-----|--------------------|
| `not-delivered` | explicit refusal/cancellation/failure относительно declared acceptance window/rule |
| `not-realized` | выполненная проверка criteria с отрицательным результатом + observation window |
| «не нашли» / timeout без declared rule | `hint` или `invalid` — **не** evidence |

`negative(claim)` валиден ⟺ `∃ declaredWindow ∧ (explicitRefusal ∨ (criteriaCheck.executed ∧ result=false ∧ observationWindow))`.

### Scenario matrix & derived summaries (без pseudo-axis)

| Правило | Значение |
|---------|----------|
| Task | транскрибирует MANDATE с `1..N` immutable SLICE; **нет** single-task=single-slice |
| Scenario | per linked slice/axis |
| Ячейка матрицы | одно из трёх различимых: `evidence(N≥1)` \| `None` \| `negative(bounded)` |
| `EpicDeliverySummary` | derived проекция `f(per-slice assertions)`; **не** C2 axis, **не** evidence target |
| Инвариант | `summary ∉ evidence.targets ∧ summary.derivedFrom = sliceGraph`; L enum остаётся только per-SLICE |

### Source premises & DoD

| Аспект | Решение |
|--------|---------|
| Sources | C1_VERDICT = immutable subject/scope/MANDATE/SLICE; C2_VERDICT = exact enums/linked tuple/no-inference; C3_TOPIC+brief/M0 = scenarios/scope |
| DESIGN / role-memory | максимум non-binding analogies; **не** premise, **не** основание dedup |
| DoD | только для verdict/contract |
| C4–C7 | не решены — open-map: C4 history/storage, C5 legacy, C6 UX/enforcement/implementation/tests/a11y, C7 operational safety |

**Definition of Done (contract-only):**
- EvidenceNode/edges/cardinality/provenance/negative-basis формально заданы, `pending` удалён, `None`≠negative;
- dedup key `(targetClaim, originRef-or-digest, predicate/version)` схлопывает эхо, coррелированные node не множат independent weight;
- negative — только bounded affirmative basis с declared window; absence → `unknown/incomplete`, не negative;
- derived summaries — проекция per-SLICE, не axis и не evidence target; L enum per-SLICE;
- scenario matrix различает `evidence | None | negative` как три отдельных значения;
- sources ограничены C1/C2/C3+brief; DESIGN/role-memory — non-binding;
- никаких решений C4–C7 (implementation, unit tests, UI/a11y/clickability, storage, legacy, operational safety).

---

*Реплик в диалоге: 21; каждый участник высказался не менее одного раза.*
