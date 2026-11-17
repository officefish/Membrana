<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-09-29T12:28:01.219Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/batch-collection-run-contour-architecture-gate-2026-09-29.md` |
| Порядок ролей | Структурщик → Математик → Музыкант → Верстальщик → Архитектор → Teamlead |
| GitHub Issue | #494 |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| контекст: Архитектура | `docs/ARCHITECTURE.md` | 6034 | `33f0886d9bac` | **обрезан** |
| контекст: Дизайн | `docs/DESIGN.md` | 5998 | `c0c614192971` | полностью |
| контекст: Сервисы | `docs/SERVICES.md` | 6034 | `cf5d799f7980` | **обрезан** |
| архив RAG | — | 105 | `4190ddf6c311` | полностью |
| GitHub Issue #494 | — | 963 | `6aa3c201249f` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--min-replies 30`

**Вопрос:**

Архитектурный gate спринта batch-collection-run-contour. Решите одну развилку: вводить ли новый core-контракт SampleCollectionRef и отдельный batch-runtime/итератор, либо строить детекторный batch-run как развитие существующих read-only CollectionSampleReader и collections plugin request без нового носителя библиотеки. Дайте отдельный однозначный вердикт по каждому пункту: 1. Нужен ли новый core-контракт сейчас. 2. В каком пакете живёт orchestration прогона N проб и почему граница зависимостей законна. 3. Как выглядят минимальные вход, inputHash, агрегированный результат, частичный и полный отказ без записи в samples/collections. 4. Считать ли массовый перенос из буфера и полную пагинацию уже закрытыми стволом и исключить ли их из реализации #494. 5. Требует ли выбранный путь перерезки и новой ратификации блоков a2/a3. Завершите исполнимым решением для фаз a2-a4, перечислите запреты и evidence, которые код обязан доказать. Не меняйте порядок ритуалов.

---

# Консилиум: gate batch-collection-run-contour (#494) — SampleCollectionRef vs развитие CollectionSampleReader

**Повестка:** архитектурный gate спринта batch-collection-run-contour. Одна развилка: новый core-контракт `SampleCollectionRef` + отдельный batch-runtime/итератор **либо** детекторный batch-run как развитие существующих read-only `CollectionSampleReader` и collections plugin request **без** нового носителя библиотеки. Вердикты по пунктам 1–5; исполнимое решение фаз a2–a4; запреты и evidence. Порядок ритуалов не менять.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Структурщик → Математик → Музыкант → Верстальщик → Архитектор → Teamlead

---

[Структурщик]: Начинаю со словаря. В стволе уже есть read-only чтение коллекции (`CollectionSampleReader`) и request-контур collections plugin. Новый `SampleCollectionRef` в `@membrana/core` — это **второй словарь** на ту же сущность «набор проб». По SERVICES.md и ARCHITECTURE.md §1: core не раздувают носителями, пока нет второго потребителя с иным жизненным циклом. Batch-прогон детекторов — потребитель **чтения** и **агрегации результатов**, не новый носитель библиотеки. Вердикт по связанности: оркестрация N проб не имеет права жить в core и не имеет права писать в samples/collections.

[Математик]: Численно batch — это чистая свёртка: вход = упорядоченный список идентификаторов проб + конфиг детектора(ов); выход = вектор `DetectionResult` + агрегаты (count, rate, latency p50/p95). `inputHash` обязан быть детерминированной функцией от канонического сериала входа (ids в стабильном порядке, version детектора, window-params) — без timestamp и без UI-state. Частичный отказ = размеченное объединение per-sample (`ok | skip | fail`), полный отказ = пустой/нестартовавший прогон с reason, **без** side-effect на библиотеку. Новый тип-носитель в core для этого не нужен: хватает `readonly string[]` sampleIds + meta уже существующего reader.

[Музыкант]: Со стороны потока: live = непрерывный источник; batch = дискретная очередь файлов/буферов. Это не новый «device collection», а **режим прогона** поверх того же `AudioWindow` / detector-base. Итератор `for-each-sample` как сущность рантайма agenda — риск дубля и рассинхрона с plugin request. Детектор должен получать готовое окно; откуда оно взялось (mic / file / collection page) — за фасадом reader. Писать обратно в библиотеку после прогона — запрет: это другой кейс (разметка), не batch-run.

[Верстальщик]: UI #494 мне нужен как **отчёт прогона**, не как новый браузер библиотеки. Пагинация списка проб и массовый перенос из буфера — если уже в стволе — в мою зону спринта не входят: иначе снова раздуем экран и смешаем «управление фондом» с «прогнать детекторы». Конструктивизм: одна кнопка «Прогон», progress, таблица ok/fail/skip, без записи label в samples из этого контура. Props = результат агрегата + per-item status; бизнес-логика в хуке/сервисе.

[Архитектор]: Конструкция. Issue #494 в исходнике тянет `SampleCollectionRef`, узел-источник, `for-each-sample`, batch-runtime — это **полная execution-модель** уровня palette/nodes. Цена: новый core-контракт, ратификация a2/a3, долгий контур. Альтернатива: batch-run как **analyzer/orchestration** над read-only reader + существующий collections request — форма дешевле, граница ясна, манифест (core тонкий, detectors не пишут media) держится. Рекомендация формы: **не вводить `SampleCollectionRef` сейчас**; оркестрацию — в сервисном контуре детекторов/media-library read path, не в core.

[Teamlead]: Положение: gate до кода, одна развилка, пять однозначных ответов. Связка на спринт: Архитектор фиксирует форму → Структурщик пакет и API → Математик hash/агрегаты/тесты чистых функций → Музыкант стык окна/детектора → Верстальщик только отчётный UI после контракта. Вердикт направления: **эволюция reader + plugin request, без нового носителя в core**. Планка: a2–a4 исполнимы без переизобретения библиотеки. Ритуалы дня не трогаем.

[Структурщик]: Пункт 2 — пакет. Оркестрация «N проб → detector(s) → aggregate» законна в `packages/services/` как analyzer-слой: зависит от `@membrana/core` (типы ошибок/утилиты) + `@membrana/detector-base` + read-API media/collections (уже клиентский/сервисный read-only путь). **Не** в `@membrana/core` (core не знает детекторов). **Не** в `apps/client` как god-object. **Не** прямой импорт detector → detector. Имя без синонима-слоя: один фасад вроде `runCollectionDetectionBatch` (имя уточнит index.ts), не параллельный «BatchRuntime» в agenda.

[Математик]: Минимальный вход (п.3): `{ collectionId: string; sampleIds: readonly string[]; detectorId: string; detectorVersion: string; windowParams: canonical; }` — ids либо явный список, либо результат reader на момент старта, зафиксированный в снимке. `inputHash = H(canonicalJSON(input))` (стабильные ключи, sorted ids). Агрегат: `{ inputHash; total; ok; failed; skipped; results: readonly PerSample[] }` где `PerSample = { sampleId; status; metrics?; reason? }`. Полный отказ до цикла: `status: 'rejected'`, `reason: 'empty' | 'reader_failed' | 'detector_unavailable'`, `results: []`. Частичный: прогон завершён, `failed+skipped > 0`, ok≥0 — **ни одного write** в samples/collections.

[Музыкант]: Стык с engine: на каждую пробу — decode/load через существующий audio path → `AudioWindow` → `DroneDetector.detect`. Параллелизм — осторожно: не убить CPU/память; последовательный default, параллель только с жёстким limit в конфиге batch, не в UI. Артефакты клиппинга/короткого файла = `skip` или `fail` с reason, не exception наружу. Live-sampler и batch не шарят mutable singleton без снимка конфига.

[Верстальщик]: Если пагинация библиотеки и bulk-from-buffer уже в main — для #494 исключаю из DoD UI: не дублирую таблицы фонда. Экран/панель batch: `aria-busy` на время прогона, `tabular-nums` для счётчиков, статусы не только цветом (текст ok/fail/skip). Ошибка полного отказа — `alert` + reason из контракта, без «тишины». Запись метки drone/not-drone из batch-отчёта **не** делаю в этом спринте.

[Архитектор]: Пункт 1 — **нет**, новый core-контракт сейчас не нужен. Условие пересмотра: появится второй execution-path (узел графа palette, shared ref между apps), которому недостаточно sampleIds+collectionId. До stage-gate/узлов — YAGNI. Пункт 5: выбранный путь **не** требует перерезки a2/a3 как «новый носитель библиотеки»; a2/a3 **переформулируются** под reader-evolution + batch facade, без новой ратификации ADR уровня SampleCollectionRef. Если в промпте спринта a2/a3 записаны под Ref — это правка брифа gate'ом, не новый ADR core.

[Teamlead]: Фиксирую: п.1 НЕТ (core-контракт отложить). п.5 — **не** новая ратификация блоков как смена архитектуры библиотеки; **да** — уточнение scope a2–a4 под вердикт gate (документ спринта/issue, не ломка ритуалов). Кто ведёт правку карточки #494 после протокола — scribe/исполнение, не расползание в новый epic. BLOCK любому PR с `SampleCollectionRef` в core без owner override.

[Структурщик]: Граница зависимостей законна, если: batch-facade **не** импортирует `apps/*`; **не** зависит от agenda store напрямую; читает коллекцию только через уже экспортированный read-only API; детекторы — через `detector-base` интерфейс. Collections plugin request расширяется **командой прогона** (request/response), не новым entity-type в core. Слабая связанность: UI → hook → facade; facade → reader + detector registry.

[Математик]: Evidence, которые код обязан доказать численно: (1) один и тот же input → тот же `inputHash`; (2) изменение порядка ids в каноне (sorted) не меняет hash; (3) добавление неканонического поля в hash-вход не допускается тестом на стабильный fixture; (4) при `sampleIds=[]` — полный отказ, 0 вызовов detect; (5) при fail на пробе k остальные обрабатываются (частичный); (6) mock writer samples/collections — 0 calls после batch. Это DoD математики, не «на глаз».

[Музыкант]: Запрет на «тихий» side-effect: batch не меняет ground-truth label, не создаёт collection, не делает bulk move. Если понадобится «сохранить отчёт» — отдельный артефакт run-report (память сессии / файл отчёта), не library mutation. Ритм: reader snapshot на старте — чтобы пагинация UI во время прогона не меняла множество ids под ногами.

[Верстальщик]: Согласен со snapshot: UI не должен mid-run дописывать ids в прогон с живого фильтра. Кнопка disabled + явный «снимок N проб». Пагинация библиотеки — out of scope #494, если ствол уже закрыл. Моя фаза a4 — только презентация агрегата и списка per-sample status, DESIGN.md tokens, без новой design-системы.

[Архитектор]: Пункт 4: **да** — массовый перенос из буфера и полную пагинацию библиотеки считать **закрытыми стволом** (или отдельным долгом вне #494) и **исключить** из реализации #494. Epic #494 = execution batch detection contour, не media-library CRUD. Иначе смешение эпиков и вечный scope creep. Сознательно не делаем: graph-node source, for-each в palette, SampleCollectionRef, write-back labels.

[Teamlead]: п.4 принят: **исключить** bulk-transfer и full pagination из #494. Любая попытка «заодно допилить пагинацию» в PR batch — BLOCK по имени. Связка a2: контракт входа/выхода + package placement (Структурщик+Архитектор). a3: pure batch + tests (Математик) + detector wiring (Музыкант). a4: UI отчёта (Верстальщик) после зелёных тестов контракта. Высокая нагрузка на evidence-тесты — это тренировка тяжелее матча.

[Структурщик]: Уточнение имени: не плодить `BatchRuntime` как пакет. Либо метод/модуль в существующем media-library-service (read) + тонкий `collection-detection-batch` рядом с detectors, либо один файл-facade в client composition **только** если логика остаётся в services. Предпочтение: **сервисный модуль** с public API из index.ts. Plugin request — transport UI→facade, не место бизнес-свёртки.

[Математик]: Агрегированный результат обязан быть сериализуем 1:1 в JSON fixture для golden-test. Никаких `Map` без reviver в публичном контракте; `readonly` массивы. Confidence/latency — числа конечные; NaN/Infinity → fail reason `invalid_metrics`. Это инвариант ядра batch-reduce.

[Музыкант]: Детектор unavailable на старте = полный отказ; unavailable mid-run (теоретически) = fail remaining или hard-stop — фиксируем **hard-stop full reject only before first detect**; после старта — per-sample fail, чтобы частичный отчёт существовал. Иначе UI не отличит «не начинали» от «сломались на половине».

[Верстальщик]: Для partial: progress `ok+fail+skip / total`, список с тремя статусами. Для full reject: не пустая таблица «успех 0», а явный banner reason — иначе враньё конструкции. a11y: `aria-live="polite"` на завершение прогона.

[Архитектор]: Сводка формы решения (два абзаца). **Форма:** batch-collection-run = read-only snapshot ids через существующий CollectionSampleReader/collections path + orchestration facade в services + detector-base; **без** SampleCollectionRef, без batch-runtime в core/agenda, без write в library. **Цена альтернативы Ref:** ADR, ломка a2/a3, ложный носитель до node-graph. Затронутые модули: services (facade + tests), detector-base consumers, collections plugin request (команда), опционально cabinet/client UI отчёта; core — **без** новых entity.

[Teamlead]: Приёмка направления — LGTM на форму Архитектора. Дальше только исполнение в рамках запретов. Консилиум не заменяет task-промпт: после протокола — обновление scope #494/brief фаз, затем код. Красный CI по hash/write-0 — без утешений.

[Структурщик]: Запреты связанные: `export` из core нового Ref; импорт plugin→plugin; batch внутри JSX; зависимость facade→agenda; обход reader прямым SQL/HTTP из UI. Проверка PR: grep SampleCollectionRef = пусто; grep mutate/save label в batch path = пусто.

[Математик]: Ещё evidence: property-тест или таблица — `total === ok+failed+skipped`; `inputHash` length/format стабилен; rejected ⇒ results length 0 и detect calls 0. Без этого DoD a3 не закрыт.

[Музыкант]: Не дублировать FFT/метрики в batch: только вызов `detect` детектора. Batch не место «улучшить алгоритм».

[Верстальщик]: DESIGN.md: badge/status как в sample labels **не** путать с outcome прогона — outcome = ok/fail/skip прогона, не drone/not-drone label. Иначе оператор смешает разметку и детект.

[Архитектор]: Повтор п.5 однозначно: **перерезка и новая ратификация a2/a3 как смена архитектурного блока библиотеки — не требуется**. Требуется **gate-правка текста фаз** под «reader evolution + batch facade». Порядок ритуалов (consilium → brief → code → LGTM) — без изменений.

[Teamlead]: Исполнимое решение ниже — закон. Все роли на «Принимаю» в таблице. Матч = зелёные evidence + отсутствие write + отсутствие SampleCollectionRef. Тренировка без матча не принимается.

[Структурщик]: Принимаю пакетную границу и запрет core-Ref.

[Математик]: Принимаю контракт hash/aggregate/отказов и evidence-тесты.

[Музыкант]: Принимаю wiring детектора и запрет write-back/library side-effects.

[Верстальщик]: Принимаю UI-only отчёт и exclude pagination/bulk из #494.

[Архитектор]: Принимаю форму: evolve reader path, no SampleCollectionRef now.

[Teamlead]: Принимаю. Вердикт консилиума закрыт. В работу a2–a4 по DoD ниже.

---

## Итоговое решение консилиума

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Нужен ли новый core-контракт `SampleCollectionRef` сейчас? | **НЕТ.** Отложить до появления второго execution-path (node-graph / shared ref между apps), которому недостаточно `collectionId + sampleIds`. Сейчас — YAGNI и риск второго словаря на ту же сущность. |
| 2 | Где живёт orchestration прогона N проб и почему граница законна? | В **`packages/services/*`**: facade batch (предпочтительно рядом с read-path media-library / отдельный тонкий service-модуль), зависит от `@membrana/core` + `@membrana/detector-base` + **read-only** collection/sample API. **Не** в `@membrana/core`, **не** god-object в `apps/*`, **не** batch-runtime в agenda. UI → hook/plugin request → facade → reader + `DroneDetector`. Граф SERVICES.md/ARCHITECTURE.md §1/§1e соблюдён. |
| 3 | Минимальные вход, inputHash, агрегат, частичный/полный отказ без записи в samples/collections | **Вход:** `{ collectionId; sampleIds: readonly string[]; detectorId; detectorVersion; windowParams (canonical) }` — ids из snapshot reader на старте. **inputHash:** детерминированный `H(canonicalJSON(input))`, стабильные ключи, ids в каноническом порядке; без UI-state/timestamp. **Агрегат:** `{ inputHash; total; ok; failed; skipped; results: PerSample[] }`, `PerSample = { sampleId; status: ok\|fail\|skip; metrics?; reason? }`. **Полный отказ:** до первого detect — `rejected` + reason (`empty` \| `reader_failed` \| `detector_unavailable`), `results=[]`, 0 вызовов detect. **Частичный:** прогон завершён, per-sample status, `total === ok+failed+skipped`. **Инвариант:** 0 записей в samples/collections (нет label write, нет create/move). |
| 4 | Массовый перенос из буфера и полная пагинация | **Да, считать закрытыми стволом (или чужим долгом) и исключить из реализации #494.** Epic = batch detection execution, не library CRUD/UX фонда. |
| 5 | Перерезка и новая ратификация a2/a3? | **НЕТ** новой ратификации архитектурного блока «носитель библиотеки». **ДА** — уточнение текста фаз a2–a4 под вердикт gate (reader evolution + batch facade). Порядок ритуалов **не менять**. |

**Выбранный путь (одна развилка):** строить детекторный batch-run как **развитие** существующих read-only `CollectionSampleReader` + collections plugin request **без** нового носителя библиотеки и **без** отдельного core batch-runtime/итератора palette-уровня.

### Исполнимое решение фаз a2–a4

| Фаза | Содержание | Владелец связки |
|------|------------|-----------------|
| **a2** | Зафиксировать public-контракт batch (вход/выход/hash/reject) в service index; placement пакета; расширение collections plugin **request/response** на команду прогона без entity core; обновить brief/#494 scope (исключения п.4). | Структурщик + Архитектор (форма уже дана) |
| **a3** | Реализация facade: snapshot ids → load window → detect → reduce; pure hash/aggregate; wiring одного (затем N) детектора через detector-base; unit/golden tests evidence. | Математик (hash/reduce/tests) + Музыкант (window/detect) |
| **a4** | UI отчёта прогона: progress, ok/fail/skip, full-reject banner, a11y; **без** bulk/pagination library; **без** записи label. | Верстальщик после зелёного a3 |

### Запреты (код/PR)

- `SampleCollectionRef` и любой новый library-carrier в `@membrana/core` в рамках #494.
- Отдельный agenda `batch-runtime` / palette-узел `for-each-sample` / device `collection` как execution-graph.
- Любая запись в samples/collections из batch path (label, create, bulk move, pagination redesign).
- Импорты plugin→plugin; facade→agenda store; UI→прямой HTTP/SQL в обход facade.
- Дублирование математики детектора в batch; mid-run мутация множества ids.
- Scope creep: «заодно» пагинация фонда, bulk-from-buffer, write-back ground-truth.
- Смена порядка ритуалов дня / подмена consilium task-промптом без brief.

### Evidence, которые код обязан доказать

1. Стабильность `inputHash` на fixture (порядок ключей, sorted ids).
2. `sampleIds=[]` ⇒ rejected, 0× detect.
3. `detector_unavailable` до старта ⇒ rejected, 0× detect.
4. Fail на одной пробе ⇒ partial, остальные статусы заполнены; `total === ok+failed+skipped`.
5. Mock/spy writer library: **0** вызовов mutate/save/label/move после batch.
6. Нет символа `SampleCollectionRef` в diff #494.
7. Публичный агрегат сериализуем JSON 1:1 (golden).
8. NaN/Infinity metrics ⇒ per-sample fail `invalid_metrics`, не молчаливый ok.
9. Граф зависимостей пакета batch: только разрешённые edges (core, detector-base, read API).
10. UI a4 не вызывается как единственный носитель бизнес-свёртки (свёртка в service).

**Definition of Done:** a2 контракт смержен и согласован с ARCHITECTURE/SERVICES; a3 зелёные unit/golden по evidence 1–9; a4 отчётный UI по DESIGN.md без library writes; PR review Структурщик (связанность) + Teamlead LGTM; #494 scope mirrors таблицу вердиктов; ритуалы не изменены.

---

*Реплик в диалоге: 36; каждый участник высказался не менее одного раза.*
