# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-19T13:18:49.693Z |
| Команда | `yarn consilium` |
| Модель | claude-opus-4-8 |
| Файл | `docs/seanses/insight-archive-lifecycle-c3-evidence-contract-2026-07-19.md` |
| Порядок ролей | Верстальщик → Структурщик → Математик → Teamlead → Музыкант |
| Повестка | `docs\meeting\insight-archive-lifecycle\C3_TOPIC.md` |

**Вопрос:**

Решить только C3: exact evidence claims для L/O SLICE values, scenario matrix single/epic/deploy/partial/non-delivery, evidence-vs-hint-invalid. C4–C7 не решать. Требуется ВЕРДИКТ C3 и premises.

---

# Консилиум: C3 — минимальный типизированный evidence contract для L/O

**Повестка:** Определить exact evidence claims для значений осей L (delivery) и O (outcome) сущности SLICE, построить scenario matrix (single task / epic / deploy gate / partial / non-delivery) и жёстко классифицировать evidence / hint / invalid inference. C4–C7 не решаются; identities, enums и events C1/C2 не меняются.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Верстальщик → Структурщик → Математик → Teamlead → Музыкант (циклически)

---

[Верстальщик]: Начну с потребителя evidence-контракта — это агент/человек, читающий доказательство delivery в PR или на витрине архива. Моя норма из `main-day-issue-accuracy`: экран не должен врать. Если контракт позволит показать «✅ delivered» без ссылки на конкретный immutable subject C1 — это мёртвая дверь, зелёная галочка поверх пустоты. Требую, чтобы каждый evidence-узел нёс видимый origin: какой SLICE, из какого C1-scope, какой assertedValue. Без этого доказательство визуально неотличимо от догадки.

[Структурщик]: Начну с термина, иначе спор поплывёт. «Evidence» — омоним двух разных лемм: **evidence** (типизированный узел, доказывающий конкретный assertedValue на оси) и **hint** (сигнал-корреляция без силы доказательства). Их нельзя слить в один тип, иначе граф правды потеряет ацикличность различения. Предлагаю словарную статью: `EvidenceNode {axis: L|O, subject: SliceId, assertedValue, kind: evidence, refs: [C1SubjectRef, C2TupleRef], predicate, origin-hash}`. Всё, что не заполняет обязательные поля, — не evidence по определению, а `hint` или `invalid`.

[Математик]: Формализую, иначе останется вкусовым. Каждая ось — функция `assert: SLICE → Option<value>`. L ∈ {delivered, not-delivered}, O ∈ {realized, not-realized}, и `None` — **отсутствие assertion**, не третье значение. Ключевой инвариант: `evidence(None)` не существует, потому что доказывать нечего — нет claim. Значит evidence определён только для двух положительных доменов каждой оси: positive claim (`delivered`/`realized`) и negative claim (`not-delivered`/`not-realized`) требуют **собственного** evidence-узла. Симметрии «отсутствие positive ⇒ negative» нет — это была бы `n=0`, выданная за доказательство.

[Teamlead]: Рамку фиксирую сразу, чтобы C3 не колонизировал C4–C7. Мы определяем **criteria и типы узлов**, не историю хранения (C4) и не enforcement (C6). По конструкции «форма следует функции»: evidence-контракт оправдан ровно тем, что замыкает C1-subject и C2-tuple в проверяемое утверждение об одной оси одного SLICE. Принимаю разделение Структурщика (evidence/hint/invalid) как несущую стену и формализм Дынина про `None` без evidence. Дальше нужен target claim в точной форме `(axis, subject, assertedValue)` — это наш выходной контракт.

[Музыкант]: По касательной, аудио не задет, но маршрут сигнала я узнаю. Evidence — это как чистый записанный трек с таймкодом источника; hint — это шум в соседнем канале, который коррелирует, но не является записью. Живой флаг из `ritual-inputs-echo`: три отражения одного снимка — это `n=1`. Если два evidence-узла делят один origin-hash, они не два доказательства, а одно. Граф обязан это кодировать явно, иначе roll-up эпика раздуется эхом.

[Верстальщик]: Поддержу и переведу в витрину. Значит на экране архива каждому SLICE — ровно одна строка на ось, с бейджем состояния: `delivered`/`not-delivered`/`—(None)`. `None` рисуется как «Не установлено» (badge-neutral, как unlabeled в DESIGN.md), а не как «не доставлено». Смешать их — соврать. И hint должен быть визуально приглушён (`text-base-content/60`), никогда не кликабелен как доказательство.

[Структурщик]: Теперь типы рёбер. Ребро `evidence → SLICE` есть `attests(axis, assertedValue)`. Ребро `evidence → C1SubjectRef` — `scoped-in` (иммутабельная ссылка, не проекция). Ребро `evidence → C2TupleRef` — `projects-through` (linked tuple mandate/slice/representation). **Запрет по норме слабой связанности:** evidence одной оси не импортирует силу другой — cross-axis prerequisite не выводится без явного premise-ребра. Archive-visibility (V) не является ребром evidence ни для L, ни для O.

[Математик]: Добавлю обязательные и условные поля численно. Обязательные для любого evidence: `{axis, subject, assertedValue, kind=evidence, c1Ref, c2TupleRef, predicate, origin-hash}` — восемь полей, отсутствие любого ⇒ `invalid`. Условные: для L=`delivered` требуется `delivery-artifact-ref` (замкнутый linked slice, не branch/PR existence); для O=`realized` требуется `outcome-observation-ref` с проверяемым предикатом на C1-scope. Для negative claims (`not-delivered`/`not-realized`) — `negative-basis-ref`: зафиксированный факт отсутствия/отказа, тоже проверяемый, а не «мы не нашли».

[Teamlead]: Здесь ставлю жёсткую границу — то, что **не** является evidence. Task status, `archived`-флаг, branch/PR existence, `transcribed` (Task→Mandate) и незамкнутый parent — всё это **hint максимум**, никогда не evidence L/O. `transcribed` мы уже зафиксировали в C1/C2 как «вне осей»: он не доказывает ни delivery, ни outcome. V=`archived` — это представление, не доставка. Кто предъявляет их как доказательство — совершает `invalid inference`. Это несущее правило вердикта.

[Музыкант]: Поддержу с живой стороны — я на этом обжёгся. `archived` как доказательство delivery — это как считать трек сведённым только потому, что файл лежит в папке мастеров. Файл в папке ≠ финальный микс. Нужен сам поток: замкнутый slice-артефакт. И для эпика — roll-up только из **полного** linked slice graph: если хоть один child-slice даёт `None`, родитель не может звучать как `delivered`, максимум частичный.

[Верстальщик]: Тогда scenario matrix глазами витрины. **Single task**: один SLICE, одна L-строка, одна O-строка. **Epic**: заголовок-эпик + дерево child-slice; roll-up-бейдж эпика показывает `delivered` только если все дети `delivered`, иначе честный `partial`. **Deploy gate**: L может быть `delivered`, но O=`None` до наблюдения за гейтом — и это видно как разрыв, не как провал. **Partial**: per-slice бейджи, никакого усреднения в одну галочку. **Non-delivery**: `not-delivered` — это positive negative claim с evidence, отличать от `None`.

[Структурщик]: Уточню термин roll-up, иначе эпик поплывёт. Roll-up — это **derived-токен** графа правды, не owner. Его правило: `epic.L = delivered ⟺ ∀ child ∈ linkedSliceGraph: child.L = delivered ∧ graph.complete`. Если `graph.complete = false` (есть незамкнутый child или отсутствует link) — roll-up = `None`, **не** `not-delivered`. Незамкнутый parent сам по себе — hint неполноты, не доказательство провала. Полнота графа — предусловие любого roll-up.

[Математик]: Формализую полноту и acceptance без auto-inference. `complete(graph) ⟺ (∀ declared child имеет linked-ребро) ∧ (∀ leaf имеет assertion ≠ pending)`. Acceptance каждого evidence: `accept ⟺ все обязательные поля заполнены ∧ predicate верифицируем ∧ origin-hash уникален в наборе roll-up`. Критично: **нет auto-inference** — из `child.L=delivered` не следует `child.O=realized`; оси независимы, каждая требует своего узла. Дедуп по origin-hash: два узла с одним `sha(source@commit)` схлопываются в один, вес не удваивается.

[Teamlead]: Принимаю. Собираю target evidence claim в каноническую форму. Валидный evidence доказывает ровно **один** кортеж `(axis ∈ {L,O}, subject=SliceId, assertedValue)`, где для L assertedValue ∈ {delivered, not-delivered}, для O ∈ {realized, not-realized}. `None` не имеет evidence — это отсутствие узла, а не узел. Positive и negative — раздельные узлы с раздельным basis. Это финальная форма вердикта.

[Музыкант]: Ещё один флаг по deploy gate — он мой любимый стык клоков. Delivery и outcome тикают в разном темпе: код доставлен (L=delivered) на одном клоке, а результат за гейтом (O=realized) наблюдается позже, на другом. Не сводить их в момент захвата — иначе «щелчок на ресемплинге»: покажем realized там, где ещё только delivered. O=`None` до наблюдения — честный молчок, не ложный ноль.

[Верстальщик]: Согласен, и закреплю честность `None` на экране финально. Три состояния оси должны быть визуально различимы: positive (badge-warning/info), negative (badge-outline с текстом «Не доставлено»/«Не реализовано»), None (badge-neutral «Не установлено»). Никогда не полагаться только на цвет — иконка + текст, по DESIGN.md a11y. Hint — отдельный приглушённый слой, `aria`-помечен как вспомогательный, не как доказательство.

[Структурщик]: Финальная сверка словаря классификации. **evidence** — узел с полным контрактом, доказывающий один `(axis, subject, assertedValue)`. **hint** — сигнал-корреляция (task status, PR existence, `transcribed`, незамкнутый parent, `archived`): может ориентировать, не доказывает. **invalid inference** — предъявление hint как evidence, или cross-axis без premise, или evidence для `None`. Три статьи, границы жёсткие.

[Математик]: Подтверждаю численно и закрываю. Множества не пересекаются: `evidence ∩ hint = ∅`, `evidence ∩ invalid = ∅`. Проверка принадлежности — чистая функция `classify(node) → {evidence|hint|invalid}` на обязательных полях и предикатах. Никакой вероятностной серой зоны: либо контракт замкнут (evidence), либо это ориентир (hint), либо ошибка вывода (invalid). Принимаю.

[Teamlead]: Всё сходится, границы C3 соблюдены, C4–C7 не тронуты. Выношу единый вердикт. Принимаю.

---

## ВЕРДИКТ C3

### Target evidence claim (каноническая форма)

Валидный evidence доказывает **ровно один** кортеж:

```
(axis ∈ {L, O}, subject = SliceId, assertedValue)
  L.assertedValue ∈ {delivered, not-delivered}
  O.assertedValue ∈ {realized, not-realized}
```

- `None` = **отсутствие assertion** ⇒ evidence для `None` **не существует** (нет claim — нечего доказывать).
- Positive и negative значения требуют **собственного, раздельного** evidence-узла.
- Оси **независимы**: `L=delivered` не выводит `O=realized` (нет auto-inference).

### Типы узлов и рёбер

| Элемент | Определение |
|---------|-------------|
| Узел `EvidenceNode` | `{axis, subject: SliceId, assertedValue, kind=evidence, c1Ref, c2TupleRef, predicate, origin-hash}` |
| Ребро `attests` | `EvidenceNode → SLICE (axis, assertedValue)` |
| Ребро `scoped-in` | `EvidenceNode → C1SubjectRef` (immutable, не проекция) |
| Ребро `projects-through` | `EvidenceNode → C2 linked tuple (mandate/slice/representation)` |
| Ребро `roll-up` (derived) | `epic → linkedSliceGraph`, только при `complete=true` |

### Обязательные и условные поля

| Тип | Поля |
|-----|------|
| Обязательные (все) | `axis, subject, assertedValue, kind=evidence, c1Ref, c2TupleRef, predicate, origin-hash` |
| Условно (L=delivered) | `delivery-artifact-ref` (замкнутый linked slice) |
| Условно (O=realized) | `outcome-observation-ref` (верифицируемый предикат на C1-scope) |
| Условно (negative) | `negative-basis-ref` (зафиксированный факт отказа/отсутствия) |

### Scenario matrix

| Сценарий | Правило |
|----------|---------|
| **Single task** | 1 SLICE → до 1 evidence на L, до 1 на O; отсутствие узла = `None`. |
| **Epic + child graph** | roll-up = derived: `epic.L=delivered ⟺ ∀child.L=delivered ∧ complete(graph)`; иначе `partial` или `None`. |
| **Deploy gate** | L=`delivered` допустим при O=`None` до наблюдения гейта; разрыв показывается честно, не как провал. |
| **Partial** | per-slice evidence; **без** усреднения в единую галочку; roll-up ≠ delivered при любом child=`None`. |
| **Non-delivery** | `not-delivered` = positive negative claim с `negative-basis-ref`; строго отличать от `None`. |

### Полнота графа и acceptance

- `complete(graph) ⟺ (∀ declared child имеет linked-ребро) ∧ (∀ leaf: assertion ≠ pending)`.
- `accept(evidence) ⟺ обязательные поля заполнены ∧ predicate верифицируем ∧ origin-hash уникален в наборе roll-up`.
- Parent/epic roll-up — **только** из полного linked slice graph. Незамкнутый parent = hint неполноты, не evidence провала.
- Дедуп по `origin-hash`: узлы с общим `sha(source@commit)` схлопываются (эхо ≠ независимое доказательство).

### Классификация evidence / hint / invalid

| Класс | Содержание |
|-------|------------|
| **evidence** | Узел с полным контрактом, доказывающий один `(axis, subject, assertedValue)`. |
| **hint** | Task status, `archived` (V), branch/PR existence, `transcribed`, незамкнутый parent — ориентируют, **не** доказывают. |
| **invalid inference** | hint предъявлен как evidence; cross-axis prerequisite без premise-ребра; evidence для `None`; auto-inference L→O. |

Множества не пересекаются: `evidence ∩ hint = evidence ∩ invalid = ∅`. Классификация — чистая функция `classify(node)`.

---

### Definition of Done

- Тип `EvidenceNode` с 8 обязательными + условными полями зафиксирован в контрактах C1-scope (без изменения C1/C2 enums/events).
- Чистая функция `classify(node) → {evidence|hint|invalid}` покрыта unit-тестами по всем пяти сценариям matrix.
- `roll-up` реализован как derived-токен с проверкой `complete(graph)`; тест на незамкнутый parent → `None`, не `not-delivered`.
- Дедуп по `origin-hash` протестирован (эхо не удваивает вес).
- Витрина: три различимых состояния оси (positive / negative / None) с иконкой + текстом (a11y, DESIGN.md); hint визуально приглушён и не кликабелен как доказательство.

---

### Использованные premises / sources

- `C3_TOPIC.md` — неподвижный predecessor (axes L/O/D/V, enum-ы, `None` = отсутствие assertion, `transcribed` вне осей, projection только для linked tuple, cross-axis без premise запрещён).
- `C2_VERDICT.md` — linked tuple mandate/slice/representation (referenced, не изменён).
- `docs/seanses/truth-graph-unify-or-split-2026-07-17.md` — граф правды: DAG, owner/derived-токены, ацикличность.
- `docs/seanses/ritual-inputs-echo` (память ролей) — декорреляция по `origin-hash`, эхо = `n=1`.
- `DESIGN.md` — ground-truth badge-состояния (drone/not-drone/unlabeled) как образец различения positive/negative/None, a11y (не только цвет).

---

*Реплик в диалоге: 19; каждый участник высказался не менее одного раза.*
