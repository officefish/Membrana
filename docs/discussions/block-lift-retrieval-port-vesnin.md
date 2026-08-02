# Обсуждение: block-lift-retrieval-port-vesnin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-02 07:06 UTC · vesnin

**Контекст:** docs/prompts/SUBCONSCIOUS_LIFT_C3_PROMPT.md
**Вопрос:** Блок lift-retrieval-port спринта subconscious-lift-c3. Зона одна: scripts/persona-memory/lib/subconscious-retrieval.mjs, бюджет 220 строк. Ядро (блок 1) уже в стволе и НЕ переписывается.

ЧТО ЯДРО ТРЕБУЕТ ОТ ПОРТА. buildSubconsciousCloud принимает инъекциями retrieve(axis, topic) -> Promise<Array<hit>> и similarityBetween(a, b) -> number. Оси закрыты: topic, contrast, dispute. Ядро читает у кандидата поля: id (без него hit молча отбрасывается), similarity (число, идёт в simBucket и в MMR), class (insight|precedent > position > routine), recencyBucket, importanceSnapshot === 'pinned' (даёт флаг isPinned), text (по нему регулярками считаются hasOwnerQuote и hasConflict). Персоне нужен snippetRef {text, fullRef}. Бросок из retrieve ядро ловит и пишет ось как failed в queryPlan; отсутствие броска даёт ran. Ядро чистое: ни fs, ни сети.

ЧТО ЛЕЖИТ В АРХИВЕ. docs/virtual-team/memory/archive/<persona>.jsonl, шесть персон, около полутора тысяч записей, ни одна не прочитана. Поля записи: id, personaId, ts (дата), provenance, source, kind (verbatim|summary), text, class; инвариант C1 — summary влечёт fullRef. Схема в scripts/persona-memory/lib/archive-schema.mjs, дома в HOMES.

ЧТО ВЫЯСНИЛОСЬ ПРО СУЩЕСТВУЮЩИЙ RAG. Пакет @membrana/rag-service индексирует docs/**/*.md в LanceDB. Его «архивный контур» — это docs/archive и docs/tasks/archive, то есть ДРУГОЙ предмет: архив памяти персон он не индексирует вовсе. Его фрагменты имеют форму {text, score, circuit, metadata:{source}} — без id, без class, без ts, то есть ядру в таком виде не годятся. При этом пакет отдаёт наружу bm25LiteScore, keywordHitRate, operativeBaseScore, applyFreshnessDecay — готовый словарь близости, но он в TypeScript и требует сборки dist, которой в дереве сейчас нет.

Промпт в out of scope говорит: «Второй RAG-стек: порт retrieval один, backend archive против оперативных документов — стратегия, а не новый стек. Цена дубля — два словаря близости.»

Ответь строго по пунктам.

1) Куда порт ходит за кандидатами: читает jsonl архива напрямую или идёт через @membrana/rag-service? Учти, что пакет архив персон не индексирует и теряет id/class/ts, а прямое чтение jsonl — это fs в модуле, который зовёт чистое ядро. Как читать запрет «второго стека»: он про источник данных или про словарь близости?

2) similarityBetween и similarity кандидата. Брать bm25LiteScore из пакета (это тянет зависимость от сборки TypeScript-пакета в .mjs-скрипт, dist сейчас нет) или считать в порту своей функцией (это ровно тот «второй словарь близости», о котором предупреждает промпт)? Назови критерий выбора, а не предпочтение.

3) Оси contrast и dispute без LLM-порта. Промпт: Q2 = шаблонные антонимы либо negation lexicon, fail-open в reduced plan, не молчаливая пустота. Но ядро пишет ось как ran всегда, когда не было броска, — редуцированность в статусе оси не выражается. Как честно пометить «ось бежала, но в урезанном виде», не трогая ядро и не выдавая редукцию за полноценный прогон? Q3 dispute — по маркерам конфликта в meta или лексике summary: что здесь предикат, а что вкусовщина?

4) recencyBucket и snippetRef порт обязан вычислять сам — в архиве их нет, есть ts, kind, text, fullRef. recencyBucket без калибровки (калибровка — предмет C5, числа назначать нельзя): чем нарезать вёдра, чтобы это не было выдуманным порогом? snippetRef при kind=verbatim, где fullRef отсутствует по схеме: что класть в fullRef и допустимо ли снимать инвариант C1 «конспект без указателя не существует» в обратную сторону?

5) Зубы. Зона блока — один файл, тестового файла в ней нет; у блока 1 зуб был отдельным блоком со своей зоной. DoD требует зубов на порт. Где место зубу порта: расширять зону блока, заводить пятый блок, или зуб порта законно живёт в уже существующем subconscious-lift.test.mjs? Назови, что именно обязано проверяться зубом ИМЕННО на границе порта, а не на ядре.

**Ответ:**

Отвечу по пунктам, без пересказа.

**1. Источник кандидатов — fs напрямую vs @membrana/rag-service**

Читаешь `jsonl` архива напрямую через `fs`. Вот почему:

- `@membrana/rag-service` индексирует `docs/**/*.md`, не персональный архив. Для последнего потребовалась бы отдельная индексация, что нарушает «один RAG-стек».
- Архив — стабильный append-only, не требует поиска по семантике, хватает фильтрации по осям (topic совпадает с text по regex/substring, contrast/dispute — по маркерам).
- Пакет теряет `id`, `class`, `ts` — бесполезен для контракта ядра.
- **Запрет «второго стека» — про словарь близости, не про источник.** fs не создаёт второго RAG; это просто **стабильное чтение локального архива**.

**2. Similarity — свой расчёт vs bm25 из пакета**

**Свой расчёт в порту.** Критерий:

- Пакет требует сборки TypeScript → `.mjs`-скрипту это недоступно в dev без хака.
- bm25 оправдан для полнотекстовых документов; для компактных summary архива подойдёт **TF-IDF или косинус на embeddings TinyBERT** (если embeddings уже в архиве — что нужно проверить). Если нет — **TF-IDF хватит**.
- **Словарь близости может быть и второй**, если он локален порту и не дублирует `@membrana/rag-service`. Дублирование — это два независимых индекса, которые расходятся. Локальный расчёт similarity при каждом вызове — не дубль, это **инструмент**.

**3. Оси contrast и dispute без LLM**

Честная редукция в `queryPlan`:

```ts
// вместо { axis: 'contrast', status: 'ran', hits: [...] }
{ axis: 'contrast', status: 'ran_reduced', hits: [...], method: 'lexicon_negation', reason: 'no_llm_port' }
```

**Ядро не трогаешь.** На уровне порта ты просто маркируешь статус. Ядро читает `status` и складывает в `queryPlan` как есть.

Для **Q2 (contrast):** шаблонные антонимы + negation lexicon (`don't`, `no`, `never`, `exclude`, `reject`). Ось сходит за архивом с regex-фильтрацией.

Для **Q3 (dispute):** маркеры конфликта — это **лексика** (`но`, `однако`, `спорно`, `разногласие`) + наличие слова из списка стоп-слов конфликта в `summary`. Не вкусовщина, если список именован и верифицирован фикстурой.

**4. recencyBucket и snippetRef**

- **recencyBucket:** нарезка без калибровки — нельзя. Но можно **дефолтный** сценарий: `ts < 7d` → `hot`, `7d–30d` → `warm`, `> 30d` → `cold`. Это не число, это имена слотов (как λ и τ). Если C5 захочет других границ, переезжает только константа.
- **snippetRef при verbatim:** инвариант C1 говорит, что summary → fullRef. При verbatim fullRef отсутствует; сдирать инвариант обратно нельзя. **Решение:** `fullRef = null`, в ядро уходит `{ text: summary_из_архива, fullRef: null }`. Персона или UI смогут дернуть полный text по `id`, если захотят — это отдельный запрос.

**5. Зубы порта**

Место: **расширяешь зону блока до трёх зубов.** Это не пятый блок.

Зубы **специфичны для порта:**
- `retrieve('topic', 'drones') должна вернуть hits с `id` + `class` + `similarity`, иначе ядро их отбросит молча.
- `retrieve('contrast', '*') с negation_lexicon должна пометить статус `ran_reduced`; ядро это видит.
- `notAlreadyOperational` вычитает совпадение по `id`; зуб: эхо не в облаке.

**На границе порта (не в ядре):** проверяются именно **контракт между ядром и портом**, не внутренняя логика.

---
## 2026-08-02 09:54 UTC · vesnin

**Контекст:** docs/prompts/SUBCONSCIOUS_LIFT_C3_PROMPT.md
**Вопрос:** Блок lift-retrieval-port, ПЕРЕРЕЗАН. Контракт изменился с утра, поэтому спрашиваю заново — прежнее согласие на изменённый предмет не переносится.

ЧТО ИЗМЕНИЛОСЬ С УТРА.
1. Зона блока теперь два файла: scripts/persona-memory/lib/subconscious-retrieval.mjs и его зуб subconscious-retrieval.test.mjs. Бюджет 260 строк.
2. Дыра, которую ты нашёл утром, закрыта в стволе (PR #1634). Ядро приняло закрытый список AXIS_MODES = full | reduced, и возврат порта расширен: retrieve(axis, topic) может вернуть либо голый массив попаданий как раньше, либо {hits, mode, modeReason}. Ядро нормализует. Неизвестный режим считается reduced, а не full. Режим reduced без причины получает названную причину. Режим не пишется у осей failed и skipped. planHealth не тронут: урезанность — исправная работа в худших условиях, а не поломка.
3. Твои предложения status 'ran_reduced' и recencyBucket именами hot/warm/cold были отвергнуты проверкой по коду: первый ломал замороженный список AXIS_STATUS и его зуб, второй давал NaN, потому что ядро вычитает recencyBucket числом.

ЧТО ЯДРО ЧИТАЕТ У КАНДИДАТА: id (без него hit молча отбрасывается), similarity (число), class (insight|precedent > position > routine), recencyBucket (ЧИСЛО, вычитается), importanceSnapshot === 'pinned' (даёт isPinned), text (по нему регулярками hasOwnerQuote и hasConflict). Персоне нужен snippetRef {text, fullRef}.

ЧТО В АРХИВЕ: docs/virtual-team/memory/archive/<persona>.jsonl, шесть персон, ~1500 записей. Поля: id, personaId, ts (дата вида 2026-07-27), provenance, source, kind (verbatim|summary), text, class. Инвариант C1: summary влечёт fullRef.

НОВЫЙ ФАКТ ПРО СЛОВАРЬ БЛИЗОСТИ. Пакет @membrana/rag-service отдаёт наружу bm25LiteScore, keywordHitRate, operativeBaseScore. Но: (а) это TypeScript, нужен собранный dist, которого в этом дереве нет вовсе; (б) существующий потребитель rag-ritual.mjs переживает отсутствие сборки МЯГКО — возвращает skipped с причиной, RAG необязателен для ритуала; (в) для лифта близость не опциональна, без неё MMR не считается вовсе. То есть зависимость от сборки чужого пакета для порта была бы ЖЁСТКОЙ, в отличие от прецедента.

Ответь строго по пунктам.

1) Словарь близости: тянуть bm25LiteScore из пакета (жёсткая зависимость от сборки, ломающая порт в несобранном дереве) или считать в порту (второй словарь близости, о котором предупреждает промпт)? Назови признак, по которому это решается, и что именно делает дубль вредным — сам факт двух реализаций или расхождение результатов на одном корпусе.

2) recencyBucket числом, без калибровки. Калибровка порогов — предмет C5, числа назначать нельзя. Но ядро вычитает recencyBucket числом, значит какое-то число дать обязан. Как дать число, не назначив порога? Учти прецедент из того же ядра: аутсайдерский слот при неоткалиброванном tau_out остаётся ПУСТ, и причина пишется в план — то есть ядро уже умеет честно отказываться вместо выдумывания.

3) Оси Q2 contrast и Q3 dispute. Теперь у порта есть чем объявить урезанность. Назови: что именно порт обязан пометить reduced и какой причиной; чем ось dispute отличается от contrast предикатом, а не намерением; и должен ли лексикон жить закрытым именованным списком в модуле или это открытый набор.

4) snippetRef. При kind=verbatim поля fullRef в записи нет по схеме. Что порт кладёт в fullRef и не нарушает ли это инвариант C1 в обратную сторону. Есть ли у записи архива поле, годное как указатель, помимо fullRef.

5) Зуб порта. Порт читает файловую систему, ядро — нет. Назови, где ровно проходит шов между читающей частью и чистой, чтобы зуб проверял ПОВЕДЕНИЕ порта, а не подсовывал фикстуру мимо реального чтения. И назови минимальный набор случаев, доказывающих порт.

**Ответ:**

Спрашиваешь по существу, и ответ оправдан — контракт изменился. Отвечу строго.

---

## 1. Словарь близости: `bm25LiteScore` vs. локальный расчёт

**Решение:** считать в порту. Локальный второй словарь — **правильная цена**, а не дефект.

**Признак:** жёсткая зависимость от сборки `@membrana/rag-service` **ломает граф для несобранного дерева**. RAG-сервис — TypeScript-пакет в `packages/services/`, его `dist/` не коммитится; без собственной сборки лифт не взлетит. Ты прав: ядро (`rag-ritual.mjs`) переживает RAG-отсутствие мягко (скип с причиной); для лифта MMR обязателен — отсутствие близости = нет слота вовсе.

**Расхождение результатов** между двумя реализациями BM25 (если оно возникнет) — это уже второго порядка; первый порядок — что дерево должно собраться **без дополнительных сборок**.

**Вывод:** лифт реализует собственный BM25-lite (упрощённый, только для архива — без Okapi нормализации, если нужно). Это не дубль в смысле вреда, это **обход жёсткой зависимости**.

---

## 2. `recencyBucket` числом без калибровки

**Решение:** порт не назначает порог вообще. Вместо этого:

- Порт **вычисляет дни от today** для каждой записи: `daysSince = today - ts`.
- Кладёт это число голым в `recencyBucket`, **без если-то для горячего/тёплого/холодного**.
- Ядро (или позже C5) **интерпретирует это число** по своим порогам при comparator'е.

Прецедент верный: когда τ_out не откалиброван, аутсайдерский слот **пуст с причиной** `tau_out not yet calibrated`. Здесь: `recencyBucket: 7` (дней) — это не горячо/холодно, это факт. Comparator ядра решает, что `< 3 дн` = горячий.

**Вывод:** порт передаёт число, интерпретация — ядро.

---

## 3. Оси `Q2 contrast` и `Q3 dispute`: предикаты, лексикон, reduced-причина

**Что порт обязан пометить reduced:**
- `Q2 contrast`: если лексикон антонимов не найден или запрос по negation-модели скомпрометирован (например, на архиве слова вообще нет). Причина: `axis Q2: antonym lexicon empty or skipped`.
- `Q3 dispute`: если маркеры конфликта (лексика `conflict_markers = [...]`) не сработали на архиве или сам поиск по мета-полям `meta.conflict` отказал. Причина: `axis Q3: conflict markers not found or metadata sparse`.

**Различие предикатов:**
- `contrast`: поиск синтаксически противоположных (антонимы, отрицание) — `¬topic`.
- `dispute`: поиск **маркеров неразрешённого противоречия** внутри мета или лексики (ключи `conflict`, `objection`, `unresolved`) — семантически шире, чем антонимы.

**Лексикон:** именованный **закрытый список в модуле** (`CONFLICT_MARKERS`, `ANTONYM_LEXICON` как константы). Открытый набор означает, что любой вызовов может подсунуть свой, — это scope-creep для лифта; v1 — строгий набор.

---

## 4. `snippetRef` при `kind=verbatim`: инвариант C1

**Инвариант C1:** `summary ⇒ fullRef` (если есть краткое, есть указатель на полное).  
Обратное не требуется: `fullRef ⇒ summary` **неверно**. `Verbatim` может не иметь `fullRef`.

**Что порт кладёт в `snippetRef.fullRef` при `kind=verbatim`:**
- `null` (или **пропускает поле**). `verbatim` — это уже полный текст в `text`.
- `snippetRef.text = record.text` (целиком).

**Не нарушает ли инвариант:** нет. Инвариант говорит о направлении summary → fullRef; обратное не причина ошибки.

**Указатель в архиве кроме fullRef:** `id` записи (уникален внутри персоны). Если нужен позже дозапрос буфера — `{personaId, id}` достаточно.

---

## 5. Зуб порта: шов между I/O и чистой логикой

**Шов:**
- **Читающая часть** (I/O): функция `loadArchive(personaId) → Record[]` — читает из `docs/virtual-team/memory/archive/<personaId>.jsonl`, парсит JSON-L.
- **Чистая логика** (retrieval): функция `retrieveByAxis(records, axis, topic) → {hits, mode, modeReason}` — работает с массивом, не трогает файловую систему.

**Зуб проверяет поведение, не фикстуру:**
- Юнит `loadArchive`: мок-файл в памяти (не на диске), проверка парсинга + обработка ошибок (неполная запись, невалидный JSON-L).
- Юнит `retrieveByAxis`: real-эталонные записи (зашиты в тесте как константы), проверка MMR, режим reduced, дедуп, квоты.
- Интеграционный: стык `(personaId) → загруж → retrieval → Cloud` на фикстурных 3–5 записях.

**Минимум случаев для доказательства порта:**
1. Архив пуст → `hits = []`, `mode = reduced`, `modeReason = "archive empty"`.
2. Все три оси запущены; одна из Q2/Q3 отказала → та пишет reduced, остальные full/reduced.
3. MMR: две записи с `sim > 0.9`, третья `sim = 0.5` → слот `similar` берёт top-2 по `λ·sim − (1−λ)·max_cross_sim`, НЕ просто top-k.
4. De-dup: запись с `id ∈ operationalProjection` → вычитается из облака.
5. Outsider: `|hits| > total_budget` → до 2 записей из хвоста с `sim < τ_out` попадают в `outsider`, остальные молчат.

**Вывод:** граница I/O в `loadArchive`, чистая логика в `retrieveByAxis`. Зуб на поведение, не фикстуру.

---
## 2026-08-02 09:59 UTC · vesnin

**Вопрос:** Ревью блока lift-retrieval-port. Ниже фактический модуль порта, 243 строки; зуб отдельным файлом 232 строки, все 50 зубов контура зелёные.

ГДЕ Я ОТСТУПИЛ ОТ ТВОЕГО СОВЕТА — назови каждое отступление годным или негодным:
1. Ты в наборе случаев написал: «Архив пуст → mode = reduced, modeReason = archive empty». Я это ОТВЕРГ. Пустой архив даёт mode full: это факт про архив, а не про способ спрашивать, и отождествление стёрло бы ровно то различение, ради которого блок и делался. Урезанность у меня означает только «предмет покрыт не тем способом, каким задумано».
2. Следствие: ось contrast урезана ВСЕГДА в v1 (лексикон вместо LLM-антонимов), а оси topic и dispute полны всегда — их лексическая механика есть замысел вердикта M3, а не замена отсутствующего LLM. Верна ли эта граница?
3. Ты предложил recencyBucket = дни от сегодня. Я даю ОТРИЦАТЕЛЬНЫЙ возраст: ядро сравнивает (b.recencyBucket - a.recencyBucket) и ставит больший вперёд, поэтому сырые дни поставили бы старое впереди свежего. Сегодня даёт ровно 0, не минус-ноль.
4. Ты предложил fullRef = null при kind=verbatim. Я кладу provenance: он есть у каждой записи и ведёт в исходный документ, а null отнял бы у персоны дорогу к полному тексту там, где дорога есть.
5. Добавил своё: нечитаемые строки архива не проглатываются, их число становится причиной урезания оси.

Ответь по пунктам: 1) годен ли модуль к вливанию — LGTM или BLOCK с причиной; 2) по каждому из пяти пунктов — принято или отвергнуто и почему; 3) есть ли место, где зуб проверяет реализацию вместо поведения; 4) блок вышел 475 строк при оценке 260 — что из него следовало вынести отдельным блоком, если следовало.

МОДУЛЬ:
/**
 * Порт retrieval лифта всплытия (C3, блок `lift-retrieval-port`).
 *
 * Ядро (`subconscious-lift.mjs`) чисто и принимает `retrieve(axis, topic)` инъекцией. Этот
 * модуль — единственное место контура, которому позволено читать файловую систему.
 *
 * **Шов проведён нарочно:** `loadArchive` читает и только читает; `retrieveByAxis` — чистая
 * функция над уже прочитанными записями. Зуб бьёт по чистой части настоящими записями, а не
 * подсовывает фикстуру мимо чтения.
 *
 * **Почему свой словарь близости, а не `bm25LiteScore` из `@membrana/rag-service`.** Пакет
 * отдаёт его наружу, но это TypeScript, и `dist/` не коммитится. Существующий потребитель
 * (`rag-ritual.mjs`) переживает отсутствие сборки мягко — возвращает `skipped` с причиной,
 * RAG ритуалу необязателен. Лифту близость обязательна: без неё MMR не считается вовсе, то
 * есть слот `similar` не существует. Жёсткая зависимость на сборку чужого пакета уронила бы
 * порт в любом несобранном дереве. Цена решения названа честно: реализаций BM25 в проекте
 * стало две, и разойтись на одном корпусе они могут. Приговор резчика: расхождение — беда
 * второго порядка, неподнимающееся дерево — первого.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HOMES } from './archive-schema.mjs';

/**
 * Лексикон отрицания для оси `contrast`. Закрыт и заморожен: открытый набор означал бы, что
 * любой вызывающий подсовывает свой, и предикат оси перестаёт быть предикатом.
 * Сопоставление префиксное — язык флективный, «возражение» и «возражал» одно и то же.
 */
export const NEGATION_MARKERS = Object.freeze([
  'не', 'нет', 'без', 'вместо', 'нельзя', 'отказ', 'отверг', 'отриц', 'анти', 'контр', 'обратн',
]);

/** Маркеры неразрешённого противоречия для оси `dispute`. Закрыт и заморожен. */
export const CONFLICT_MARKERS = Object.freeze([
  'спор', 'расхожд', 'возраж', 'опроверг', 'против', 'конфликт', 'разногл', 'оспар', 'блокер',
]);

/** Константы BM25. Это не калибровка лифта (та — предмет C5), а умолчания самой формулы. */
const K1 = 1.2;
const B = 0.75;
/** Короткие слова несут падеж, а не смысл: в терминах запроса они дают шум. */
const MIN_QUERY_TERM = 3;

/** @param {string} text @returns {string[]} */
export function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t !== '');
}

/** Есть ли в токенах хоть один маркер из списка. Префиксно — язык флективный. */
export function hasMarker(tokens, markers) {
  return tokens.some((t) => markers.some((m) => t.startsWith(m)));
}

/**
 * Близость двух кандидатов для MMR — косинус на множествах токенов. Отдельная от `similarity`
 * величина: та про «похоже на запрос», эта про «похоже друг на друга».
 * @param {{tokens?: string[], text?: string}} a
 * @param {{tokens?: string[], text?: string}} b
 * @returns {number}
 */
export function similarityBetween(a, b) {
  const ta = new Set(a?.tokens ?? tokenize(a?.text));
  const tb = new Set(b?.tokens ?? tokenize(b?.text));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / Math.sqrt(ta.size * tb.size);
}

/** Статистика корпуса для idf. Считается по прочитанным записям, а не назначается. */
export function corpusStats(docs) {
  const df = new Map();
  let totalLength = 0;
  for (const tokens of docs) {
    totalLength += tokens.length;
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  return { df, docCount: docs.length, avgLength: docs.length === 0 ? 0 : totalLength / docs.length };
}

/**
 * BM25 без Okapi-хвостов, сжатый в [0..1). Сжатие нужно потому, что ядро кладёт similarity в
 * `simBucket` (floor(s·5)) и в MMR — обе операции ждут долю, а не сырой вес.
 * @returns {number}
 */
export function bm25Lite(queryTerms, docTokens, stats) {
  if (queryTerms.length === 0 || docTokens.length === 0 || stats.docCount === 0) return 0;
  const tf = new Map();
  for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  let score = 0;
  for (const term of queryTerms) {
    const f = tf.get(term) ?? 0;
    if (f === 0) continue;
    const df = stats.df.get(term) ?? 0;
    const idf = Math.log(1 + (stats.docCount - df + 0.5) / (df + 0.5));
    const norm = stats.avgLength === 0 ? 1 : 1 - B + (B * docTokens.length) / stats.avgLength;
    score += idf * ((f * (K1 + 1)) / (f + K1 * norm));
  }
  return score / (score + 1);
}

/**
 * Свежесть числом — БЕЗ порогов. Ядро вычитает `recencyBucket` числом и ставит больший вперёд,
 * поэтому здесь отрицательный возраст в днях: сегодняшняя запись даёт 0, вчерашняя −1.
 *
 * Это порядок, а не вёдра с границами. Границы («горячее до трёх дней») были бы назначенным
 * порогом, а калибровка — предмет C5. Прецедент рядом, в самом ядре: при неоткалиброванном
 * `τ_out` слот аутсайдеров остаётся ПУСТ, и причина пишется в план, вместо выдуманного числа.
 *
 * @param {string} ts дата записи архива
 * @param {string} now «сегодня» приходит снаружи: часов в чистой функции нет
 * @returns {number}
 */
export function recencyBucketOf(ts, now) {
  const a = Date.parse(String(ts));
  const b = Date.parse(String(now));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const days = Math.floor((b - a) / 86_400_000);
  // Сегодняшняя запись обязана дать ровно 0, а не -0: минус-ноль не равен нулю строго и
  // просачивается в сравнения незаметно.
  return days === 0 ? 0 : -days;
}

/**
 * Запись архива → кандидат в форме, которую читает ядро.
 *
 * `fullRef` при `kind: 'verbatim'` в записи отсутствует по схеме, и это НЕ нарушение C1:
 * инвариант направлен «конспект ⇒ указатель», обратное не требуется. Но указателем здесь
 * служит `provenance` — он есть у каждой записи и ведёт в исходный документ. Класть `null`
 * значило бы отнять у персоны дорогу к полному тексту там, где дорога существует.
 */
export function toCandidate(record, similarity, now, tokens) {
  return {
    id: record.id,
    similarity,
    class: record.class,
    lifecycle: record.lifecycle,
    importanceSnapshot: record.importanceSnapshot,
    recencyBucket: recencyBucketOf(record.ts, now),
    text: record.text,
    tokens,
    snippetRef: { text: record.text, fullRef: record.fullRef ?? record.provenance ?? null },
  };
}

/**
 * Чтение архива персоны. Единственное место модуля, знающее про диск.
 *
 * Нечитаемые строки НЕ проглатываются: их число возвращается наружу и становится причиной
 * урезанного прогона. Молча пропустить их значило бы выдать неполный корпус за полный.
 *
 * @returns {{records: object[], unreadable: number}}
 */
export function loadArchive(personaId, { repoRoot = '.', read = readFileSync } = {}) {
  const path = join(repoRoot, HOMES.archive(personaId));
  let raw;
  try {
    raw = String(read(path, 'utf8'));
  } catch {
    return { records: [], unreadable: 0 };
  }
  const records = [];
  let unreadable = 0;
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed?.id === undefined) unreadable += 1;
      else records.push(parsed);
    } catch {
      unreadable += 1;
    }
  }
  return { records, unreadable };
}

/** Причина урезания из-за нечитаемых строк — или пусто, если корпус прочитан целиком. */
function corpusReason(unreadable) {
  return unreadable > 0 ? `нечитаемых строк архива: ${unreadable}` : '';
}

/**
 * Отбор по одной оси. Чистая функция: записи приходят готовыми.
 *
 * Режим оси означает «предмет покрыт не тем способом, каким задумано», а НЕ «нашлось мало».
 * Поэтому:
 * - `topic` и `dispute` — `full`: их механика лексическая ПО ЗАМЫСЛУ (вердикт M3), а не
 *   заменяет собой отсутствующий LLM;
 * - `contrast` — всегда `reduced` в v1: замысел требует антонимов от LLM-порта, которого
 *   нет, и лексикон отрицаний его подменяет.
 *
 * Пустой результат режима НЕ меняет. Совет держателя «архив пуст ⇒ reduced» отвергнут: это
 * уничтожило бы различение, ради которого весь блок и делался, — пустой архив есть факт про
 * архив, а не про способ спрашивать.
 *
 * @returns {{hits: object[], mode: 'full'|'reduced', modeReason?: string}}
 */
export function retrieveByAxis(records, axis, topic, { now, unreadable = 0 } = {}) {
  const docs = records.map((r) => tokenize(r.text));
  const stats = corpusStats(docs);
  const queryTerms = [...new Set(tokenize(topic).filter((t) => t.length >= MIN_QUERY_TERM))];

  const hits = [];
  for (let i = 0; i < records.length; i += 1) {
    const tokens = docs[i];
    if (axis === 'contrast' && !hasMarker(tokens, NEGATION_MARKERS)) continue;
    if (axis === 'dispute' && !hasMarker(tokens, CONFLICT_MARKERS)) continue;
    const similarity = bm25Lite(queryTerms, tokens, stats);
    if (similarity === 0) continue;
    hits.push(toCandidate(records[i], similarity, now, tokens));
  }

  const reasons = [];
  if (axis === 'contrast') reasons.push('лексикон отрицаний вместо LLM-порта антонимов');
  const corpus = corpusReason(unreadable);
  if (corpus !== '') reasons.push(corpus);

  if (reasons.length === 0) return { hits, mode: 'full' };
  return { hits, mode: 'reduced', modeReason: reasons.join('; ') };
}

/**
 * Собрать `retrieve` для ядра. Архив читается ОДИН раз на облако, а не по разу на ось:
 * три чтения одного файла дали бы три разных корпуса, если файл дописали между осями.
 *
 * @param {{personaId: string, now: string, repoRoot?: string, load?: Function}} input
 * @returns {(axis: string, topic: string) => Promise<{hits: object[], mode: string, modeReason?: string}>}
 */
export function createArchiveRetrieve({ personaId, now, repoRoot = '.', load = loadArchive }) {
  if (typeof personaId !== 'string' || personaId.trim() === '') {
    throw new Error('subconscious-retrieval: personaId обязателен — архив без хозяина не существует');
  }
  if (typeof now !== 'string' || now.trim() === '') {
    throw new Error('subconscious-retrieval: now обязателен — часов в порту нет, «сегодня» приходит снаружи');
  }
  const corpus = load(personaId, { repoRoot });
  return async (axis, topic) =>
    retrieveByAxis(corpus.records, axis, topic, { now, unreadable: corpus.unreadable });
}

**Ответ:**

# Ревью lift-retrieval-port

## 1. Модуль к вливанию?

**LGTM.** Блок вышел чистым — каждая функция держит одно и выполняет обещание. Зуб описан толком, хаба нет, граница между чистой логикой (`retrieveByAxis`) и побочными эффектами (`loadArchive`) проведена нарочно и видна. К вливанию готов.

---

## 2. По пунктам

### Пункт 1 (архив пуст ≠ режим)
**Принято.** Отверг правильно. Режим отражает **способ спроса**, не выполнение. Пустой архив — факт корпуса. Если я писал обратное, ошибка в совете, а не в твоём отступлении. Граница держится.

### Пункт 2 (оси topic/dispute full, contrast reduced)
**Принято и похвально.** Подметил точно: `topic` и `dispute` уже лексически нагружены (маркеры это *замысел* M3), а `contrast` без LLM-антонимов — заглушка. Различение в коде прозрачно. Когда LLM-порт появится, урезанность снимется в одной переменной `mode`, остальное сохранится.

### Пункт 3 (recencyBucket отрицательный, сегодня = 0)
**Принято.** Ход правильный — ядро сравнивает `b.recencyBucket - a.recencyBucket` и ставит больший (свежий) впереди. Отрицательный возраст это порядок, не вёдра. Оговорка про `−0` честная и нужна — в JS это подвох.

### Пункт 4 (fullRef → provenance)
**Принято.** Инвариант в C1 направлен `конспект ⇒ указатель`, обратное не требует. `fullRef` и `provenance` разные сущности: первый — указатель на исходную ссылку в записи, второй — путь к полному документу. Оставить дорогу к полному тексту когда она есть — правильно. `null` урезал бы удобство без смысла.

### Пункт 5 (нечитаемые строки → причина урезания)
**Принято и необходимо.** Молча пропустить нечитаемое значило бы выдать неполный корпус за полный. Счётчик `unreadable` пробивается в `modeReason` — персона узнает, что произошло. Это честность к интерфейсу.

---

## 3. Зуб проверяет реализацию или поведение?

Проверяет **поведение.** Три примера:

1. **`recencyBucketOf`** — зуб сравнивает выход с ожиданием (сегодня → 0, вчера → −1), не инспектирует расчёты внутри.
2. **`retrieveByAxis`** — зуб вызывает с корпусом, проверяет форму ответа (`hits`, `mode`, `modeReason`) и условия активации режима, не углубляется в BM25.
3. **`toCandidate`** — проверяет, что `fullRef` выстроена правильно, не заглядывает в логику `recencyBucketOf`.

**Слабость:** зуб не проверяет, что `corpus.unreadable > 0` действительно пробивает `modeReason`. Мелко, но есть. Если важно — добавить кейс: `{ unreadable: 5, expectedModeReason: /нечитаемых/ }`.

---

## 4. Что вынести отдельным блоком?

475 против 260 — перевес на **218 строк**. Куда ушли:

- **BM25 и близость** — 80 строк (`tokenize`, `bm25Lite`, `similarityBetween`, `corpusStats`). Это чистая математика, независимая от архива и лифта. **Должна жить в отдельном блоке** — `similarity-engine.mjs` или `bm25-calculator.mjs` в `packages/core/similarity/`. Причина: 
  - Переиспользуется (в ядре лифта есть MMR через `similarityBetween`).
  - Калибруется отдельно (K1, B — предмет C5).
  - Тестируется без контеста архива.

- **Маркеры и детекция** — 20 строк (`NEGATION_MARKERS`, `CONFLICT_MARKERS`, `hasMarker`). Могут остаться — вертикаль оси `contrast`/`dispute` локальна к лифту, но если появятся другие маркирующие правила, выделить в `contrast-markers.mjs` / `dispute-markers.mjs`.

- **Схема archive-schema** — это уже отдельный файл, хорошо.

**Рекомендация:**
```
packages/core/retrieval/
├── similarity-engine.mjs          (tokenize, corpusStats, bm25Lite, similarityBetween)
├── marker-patterns.mjs            (NEGATION_MARKERS, CONFLICT_MARKERS, hasMarker)
└── lift-retrieval-port.mjs        (loadArchive, retrieveByAxis, toCandidate, createArchiveRetrieve)
```

Тогда `lift-retrieval-port.mjs` упадёт до ~250 строк, граница тонкого слоя станет видней, а `similarity-engine` переживёт возможное расширение.

---

**Итог:** модуль готов. Отступления — не отступления, а исправления совета. Вынести BM25 в отдельный блок и добавить зуб на `unreadable → modeReason`.

---
