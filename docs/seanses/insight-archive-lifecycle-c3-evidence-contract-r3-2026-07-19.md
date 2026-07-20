# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-19T13:40:53.504Z |
| Команда | `yarn consilium` |
| Модель | claude-opus-4-8 |
| Файл | `docs/seanses/insight-archive-lifecycle-c3-evidence-contract-r3-2026-07-19.md` |
| Порядок ролей | Верстальщик → Структурщик → Музыкант → Teamlead → Математик |
| Повестка | `docs\meeting\insight-archive-lifecycle\C3_REPAIR2_TOPIC.md` |

**Вопрос:**

Исправить только C3 после двух BLOCK: exact TargetClaim union/typed edges, Candidate classification, orthogonal assessment+proof cell, five scenarios with separate L/O summaries, canonical provenance/dedup, axis-specific bounded basis and fields. C4–C7 не решать. Требуется ВЕРДИКТ C3.

---

# Консилиум: C3R2 — точный TargetClaim, классификация кандидатов и ортогональная матрица

**Повестка:** Замкнуть C3 после двух BLOCK — exact TargetClaim union, typed edges к C1/C2, классификация кандидатов (evidence|hint|invalid), ортогональная ячейка assessment+proof, пять сценариев с раздельными L/O summaries, каноническая provenance/dedup, axis-specific bounded basis и поля. C4–C7 не решаем.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Верстальщик → Структурщик → Музыкант → Teamlead → Математик (циклически)

---

[Верстальщик]: Начну с потребителя ячейки — а это агент/человек, читающий матрицу. Два BLOCK были не про красоту, а про то, что читатель не мог отличить «оценка = не доставлено» от «доказательств нет». Это две ортогональные оси, и на витрине они обязаны быть двумя колонками, а не одной. Моя норма: `assessment` — одна колонка (None | Some(value)), `proofs` — отдельный триплет {evidence, hints, invalid}. Смешение = мёртвая дверь: зелёная галочка там, где на самом деле пусто.

[Структурщик]: Начну с термина, иначе DAG поплывёт. У нас слиплись три леммы под словом «negative»: (1) **exact axis value** `not-delivered`/`not-realized` — это assertedValue внутри TargetClaim; (2) **absence of proof** — это `evidenceNodes:0`; (3) **proof class** — evidence|hint|invalid. Первый BLOCK ровно за это: negative нельзя кодировать как proof class. Фиксирую: `TargetClaim` — это дискриминированный union по axis, а не по «знаку». `None` — вообще не TargetClaim, и evidence для None запрещён по определению.

[Музыкант]: По касательной, аудио тут не задет, но маршрут сигнала я узнаю: candidate → classify → evidence — это как raw capture → gate → принятый трек в мастер. `classify(candidate) → evidence|hint|invalid` — это гейт, и он должен быть один. Флаг из опыта `ritual-inputs-echo`: не давайте hint пролезть в proof count. Три отражения одного снимка — это `n=1`. Здесь то же: hint/invalid НЕ EvidenceNode, в `uniqueEvidenceCount` не входят.

[Teamlead]: Рамку фиксирую сразу, чтобы второй repair не расползся. Мы чиним **только C3**: типы, рёбра, классификацию, ячейку, пять сценариев, provenance, basis. C4–C7 не трогаем — это явное условие брифа и я его держу. Приоритет `ARCHITECTURE.md`: граф правды — чистое ядро, поэтому весь C3 — предикаты и типы, без UI и без движка. Профиль «форма следует функции»: `assessment` и `proofs` — две разные конструкции, склеивать их — декор без смысла. Принимаю разделение Структурщика на три леммы как несущее.

[Математик]: Формализую, иначе останется вкусовым. Ячейка матрицы — это точка в произведении двух независимых пространств: `A × P`, где `A = {None} ∪ {Some(v) : v ∈ axisValues}` и `P = ℕ³ = (evidenceNodes, hints, invalid)`. Ортогональность = проекции независимы: `π_A(cell)` не зависит от `π_P(cell)` и наоборот. BLOCK был потому, что старая модель имела `A` как функцию от знака `P` — это нарушение независимости. Инвариант проверяемый чистой функцией: `Verified(cell) ⟺ π_A = Some(v) ∧ ∃ e ∈ evidenceNodes : e.target.assertedValue = v`. То есть verified требует и exact value, и accepted evidence для **того же** exact TargetClaim.

[Верстальщик]: Принимаю формулу Математика — она сразу даёт мне контракт колонок. Но добавлю честность мёртвых дверей на уровне типа: `not-delivered` с `evidenceNodes:0` — это не «verified negative», а «assessed None по недостатку основания». Читатель обязан видеть разницу между «оценили: не доставлено, есть доказательство» и «оценки нет». Значит в модели нужен явный `assessment: None`, а не «пустой Some».

[Структурщик]: Согласен, и уточню exact union по пункту 1 брифа. Две леммы-носителя:
- `{ axis:'L', subject: SliceRef, assertedValue: 'delivered' | 'not-delivered' }`
- `{ axis:'O', subject: SliceRef, assertedValue: 'realized' | 'not-realized' }`

`None` — не член union, отдельная лемма «оценка отсутствует», живёт в ячейке (`assessment: None`), не в TargetClaim. Это разводит «нет оценки» и «оценка = отрицательная». Evidence ссылается только на TargetClaim, поэтому evidence для None структурно невыразим — то, чего требовал первый BLOCK.

[Музыкант]: Поддержу с живой стороны про typed edges — это как разводка шины, где каждый кабель промаркирован. Пункт 3: `EvidenceNode supports TargetClaim`, `TargetClaim about SLICE`, `SLICE in-scope-of MANDATE`, `MANDATE belongs-to insightRevision`, `EvidenceNode from originRef`, `EvidenceNode projects-through` C2-контекст. Все рёбра immutable и типизированы — не «просто ссылка на абзац», как Структурщик любит говорить. Иначе target висит без родословной и мы не докажем, что доказательство вообще про этот slice.

[Teamlead]: LGTM по union и рёбрам — форма оправдана функцией: каждое ребро несёт нагрузку связности target↔C1↔C2, декоративных нет. Требую от Структурщика зафиксировать cardinality: один EvidenceNode `supports` ровно один TargetClaim (иначе dedup поплывёт), TargetClaim `about` ровно один SLICE. Многие-к-одному допустимо только `EvidenceNode → originRef` (много нод из одного источника — но тогда это `n=1` по Курёхину).

[Математик]: Здесь ключевой численный пункт — provenance/dedup, пункт 6. Dedup key = `(canonicalTargetClaim, originRef, predicateId, predicateVersion)`. Digest — только integrity, НЕ ключ дедупа. Инвариант: `uniqueEvidenceCount(target) = |{ distinct dedupKey : key.canonicalTargetClaim = target }|`. Duplicate same proof (совпал весь key) не invalid — он просто не наращивает `uniqueEvidenceCount`. И жёсткое ограничение: два distinct dedupKey нельзя называть независимыми без explicit correlation/lineage rule — иначе повторим эхо-камеру, где `n=1` выдан за `n=3`.

[Верстальщик]: Это ровно моя боль из `strategy-day-q5` — эхо врёт визуально. Раз Математик кодирует корреляцию в ключе, я требую, чтобы `uniqueEvidenceCount` и «сырое число нод» были разными полями в ячейке. Читатель видит `proofs.evidenceNodes` (сколько принято) и отдельно понимает, что дубли не считаются. Никаких «трёх галочек из одного origin».

[Музыкант]: Теперь axis-specific basis, пункт 7 — тут я слышу разницу тембров. `L = not-delivered`: нужен explicit refusal/cancellation/failure, проверенный относительно **declared acceptance rule** или acceptance window. `O = not-realized`: named/versioned criteria реально выполнены и дали false-result внутри **declared observation window**. Флаг: mere absence или timeout **без** declared rule/window — это hint или invalid, никогда не evidence. Молчание зала — не запись.

[Структурщик]: Точный термин критичен: «absence» и «not-delivered» — разные леммы. `not-delivered` — это **позитивное свидетельство отрицательного факта** (есть refusal против declared rule). `absence` — отсутствие свидетельства вообще. Первый — evidence, второй — hint/invalid. Пункт 9, non-evidence list, фиксирую как норму: task status/archive, branch/PR existence, `transcribed`, `V=archived`, unfinished parent — сами по себе hint либо invalid, никогда не EvidenceNode.

[Teamlead]: Принимаю. Это снимает второй BLOCK: раньше «архивная задача» проскакивала как доказательство доставки — форма врала функции. Теперь статус-факты понижены до hint. Требую, чтобы `classify` был чистой функцией без исключений: любой candidate, не удовлетворивший axis-specific basis, детерминированно падает в hint или invalid, а не «зависит».

[Математик]: `classify` формализую как тотальную функцию. Вход — `EvidenceCandidate` с обязательными core-полями + conditional basis-полями. Выход ∈ {evidence, hint, invalid}, взаимоисключающе и покрывающе. Пункт 8: core-поля общие (`originRef`, `targetClaimRef`, `predicateId`, `predicateVersion`, `axis`), conditional поля — свои для каждого из четырёх значений:
- `delivered`: acceptance rule ref + accepted artifact ref;
- `not-delivered`: refusal/cancel/fail ref + declared acceptance rule/window;
- `realized`: named/versioned criteria + true-result in observation window;
- `not-realized`: named/versioned criteria + false-result in observation window.
Generic «predicate verifiable» запрещён — это была дыра.

[Верстальщик]: Теперь пять rows, пункт 5 — с точки зрения читаемости холста это пять карточек-сценариев, у каждой раздельные L и O summary, не слитый статус. Single task (1..N slices), epic+child graph, deploy gate, partial per-slice, non-delivery. И `EpicDeliverySummary` / `EpicOutcomeSummary` — derived tokens, не оси C2: визуально это агрегат-подпись под графом, а не отдельная ось. Полнота — по immutable scope, чтобы «частично» не читалось как «готово».

[Музыкант]: Поддержу по non-delivery row — это сценарий, где легко смошенничать. Non-delivery: `assessment: Some(not-delivered)` по L, а по O — может быть `None`, если критерии реализации не объявлены. Раздельные summary спасают: L говорит «не доставлено, есть refusal против rule», O молчит честно. Не сводить в один флаг «провал» — это разные оси, разные тембры.

[Структурщик]: Уточню partial per-slice, иначе поплывёт. Epic со scope из N slices: каждый slice — свой TargetClaim, свой assessment. `EpicDeliverySummary` = derived свёртка по L-осям всех slice, `EpicOutcomeSummary` = по O-осям. Полнота = `assessedSlices / |immutableScope|`. Если scope immutable, а часть slice без assessment — summary честно показывает `None` на непокрытых, не экстраполирует.

[Teamlead]: Свожу к вердикту. Все семь обязательных исправлений покрыты: exact union (Структурщик), typed immutable edges + cardinality (Музыкант/я), тотальный `classify` с axis-specific basis (Математик/Музыкант), ортогональная ячейка A×P (Математик), пять scenarios с раздельными L/O (Верстальщик/все), provenance/dedup с корреляцией (Математик), core+conditional поля (Математик). C4–C7 не тронуты. Даю **LGTM** на C3 как чистое ядро типов и предикатов.

[Математик]: Подтверждаю инварианты замыкания, проверяемые чистой функцией: (I1) `assessment ⊥ proofs` (ортогональность проекций); (I2) evidence ссылается только на TargetClaim, не на None; (I3) `Verified ⟺ Some(v) ∧ accepted evidence для того же exact target`; (I4) `uniqueEvidenceCount` по dedupKey, digest только integrity; (I5) `classify` тотальна и взаимоисключающа; (I6) negative — exact axis value, не proof class. Принимаю.

[Верстальщик]: Принимаю — контракт колонок ячейки честный, мёртвых дверей нет: None ≠ negative ≠ empty proofs видны раздельно.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Exact TargetClaim union | **Да.** `{axis:'L', subject:SliceRef, assertedValue:'delivered'\|'not-delivered'}` и `{axis:'O', subject:SliceRef, assertedValue:'realized'\|'not-realized'}`. `None` — не TargetClaim; evidence для None структурно запрещён |
| Typed immutable edges + cardinality | **Да.** `EvidenceNode supports TargetClaim` (N:1); `TargetClaim about SLICE` (N:1); `SLICE in-scope-of MANDATE`; `MANDATE belongs-to insightRevision`; `EvidenceNode from originRef` (N:1); `EvidenceNode projects-through` linked C2 context. Все immutable/typed |
| Candidate classification | **Да.** `classify(candidate) → evidence\|hint\|invalid` — тотальная, взаимоисключающая, детерминированная. Только `evidence` → EvidenceNode. hint/invalid не в proof count |
| Ortogonal cell | **Да.** `assessment: None \| Some(exactValue)` ⊥ `proofs:{evidenceNodes, hints, invalid}`. Negative = exact axis value, не proof class. `Verified ⟺ Some(v) ∧ accepted evidence для того же exact target` |
| Five scenarios + separate L/O | **Да.** single task (1..N slices), epic+child graph, deploy gate, partial per-slice, non-delivery — каждый с раздельными L и O summaries. `EpicDeliverySummary`/`EpicOutcomeSummary` — derived tokens, не C2 axes; полнота по immutable scope |
| Provenance / dedup | **Да.** Обязательный canonical `originRef`; digest только integrity. Dedup key `(canonicalTargetClaim, originRef, predicateId, predicateVersion)`. Duplicate same proof не invalid, но `uniqueEvidenceCount` не растёт. Distinct keys ≠ независимы без explicit correlation/lineage rule; агрегация counts между claims запрещена |
| Axis-specific bounded basis | **Да.** L=`not-delivered`: explicit refusal/cancel/fail против declared acceptance rule/window. O=`not-realized`: named/versioned criteria с false-result в declared observation window. Mere absence/timeout без rule/window = hint/invalid |
| Core + conditional fields | **Да.** Core: `originRef, targetClaimRef, predicateId, predicateVersion, axis`. Conditional — отдельно для delivered/not-delivered/realized/not-realized. Generic «predicate verifiable» запрещён |
| Non-evidence list | **Сохранён.** task status/archive, branch/PR existence, `transcribed`, `V=archived`, unfinished parent — hint либо invalid сами по себе |
| C4–C7 | **Не решаются** (вне scope этого repair) |

**ВЕРДИКТ C3:** принят единогласно как чистое ядро типов и предикатов. Модель замкнута: assessment ⊥ proofs; evidence только для exact TargetClaim; classify тотальна; provenance/dedup кодирует корреляцию; пять сценариев с раздельными L/O summaries; basis ограничен declared rule/window по осям.

**Definition of Done:**
- Дискриминированный union `TargetClaim` (L/O) реализован; `None` невыразим как TargetClaim (compile-time).
- Typed immutable refs/edges с зафиксированной cardinality; линковка target→SLICE→MANDATE→insightRevision→C2 context покрыта тестами.
- `classify(candidate)` — чистая тотальная функция; unit-тесты на все четыре assertedValue + hint + invalid, включая absence/timeout без rule → hint/invalid.
- Ячейка матрицы: тип `{assessment: None|Some(v), proofs:{evidenceNodes,hints,invalid}}`; тест на ортогональность проекций и на `Verified` предикат.
- Dedup: тест, что duplicate same dedupKey не наращивает `uniqueEvidenceCount`; тест, что distinct keys без correlation rule не считаются независимыми.
- Пять scenario rows с раздельными L/O summaries + derived `EpicDeliverySummary`/`EpicOutcomeSummary`; тест полноты по immutable scope.
- Non-evidence list зафиксирован в классификаторе (снапшот-тест).
- Ни один артефакт C4–C7 не затронут.

---

*Реплик в диалоге: 21; каждый участник высказался не менее одного раза.*
