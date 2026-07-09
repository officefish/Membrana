# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-09T14:47:59.664Z |
| Команда | `yarn consilium` |
| Модель | claude-opus-4-8 |
| Файл | `docs/seanses/board-alarm-scenario-nodes-2026-07-09.md` |
| Порядок ролей | Верстальщик → Teamlead → Музыкант → Математик → Структурщик |

**Вопрос:**

Эпик board-alarm-scenario-nodes (#323): палитре device-board не хватает 5 узлов для полного детекционного сценария (поток → 2 детектора → fusion → трек → единый отчёт → alarm-loop до потери дистанции, всё async). Предложенный состав: N1 make-ensemble-analysis (второй детектор, DSP-ансамбль через host-мост → EnsembleProducer из detection-ensemble-service), N2 make-detection-fusion (2+ анализов → combinedScore через core fuseDetectorConfidences), N3 branch-on-detection (exec-ветвление detected/not по порогу), N4 make-proximity-trend (ближе/дальше/lost, host-store per runId, LoudnessTrendTracker из fft-analyzer), N5 make-combined-report (N анализов + TrackRef → единый ReportRef, async job report-build). Спорные точки для консилиума: (1) выход fusion — value-тип DetectionFusion (как FftTrendsPolicy) или ref со store; (2) proximity-математика — host-мост или апстрим чистого трекера в core; (3) входы fusion — два фиксированных порта или вариадический список; (4) N5 — упаковка как async report-build или синхронный конструктор + start-async-job снаружи; (5) alarm-loop — строго композиция branch+proximity+loop-repeat без нового loop-узла; (6) имена узлов и SocketType (EnsembleAnalysisRef, DetectionFusion, ProximityRef). Ограничения: device-board зависит только от core (check:boundaries), узлы stateless, конвенции make-* §15.7 CONCEPT.

---

# Консилиум: 5 новых узлов device-board для полного детекционного сценария (#323)

**Повестка:** Утвердить состав и контракты узлов N1–N5 эпика board-alarm-scenario-nodes: типы выходов fusion, размещение proximity-математики, арность входов fusion, упаковку N5, реализацию alarm-loop и именование SocketType — без нарушения `check:boundaries` (device-board → только core) и при stateless-узлах по §15.7 CONCEPT.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Верстальщик → Teamlead → Музыкант → Математик → Структурщик (циклически)

---

[Верстальщик]: С точки зрения палитры и инспектора — чем меньше вариативных портов, тем яснее конструкция экрана. Вариадический список входов у fusion превратит инспектор в хаос: непонятно, сколько строк рисовать и где статус. Прошу либо фиксированные порты, либо жёсткий контракт «добавить/убрать» с явной кнопкой. И выход fusion как value-тип читается на канвасе сразу — ref без раскрытия «немой».

[Teamlead]: Согласен, что форма важнее гибкости. Держим рамку: device-board зависит **только** от core (§1 ARCHITECTURE), узлы stateless, вся тяжёлая математика и store — через host-мост, как уже сделано для существующих make-* узлов. Это не обсуждается — это инвариант. По пяти спорным точкам хочу консенсус, а не «зависит». Начнём с выхода fusion: у нас уже есть прецедент value-типа `FftTrendsPolicy`. Предлагаю симметрию.

[Музыкант]: По звуку и потоку: ансамбль второго детектора (N1) — это то, ради чего всё затевалось, два независимых «уха» на одном потоке. Но `EnsembleProducer` из `detection-ensemble-service` — это analyzer-слой, device-board его напрямую тянуть **не может**. Значит N1 — тонкий узел, который через host-мост говорит «дай мне ensemble-анализ по этому runId», а сам сервис живёт на хосте клиента. Ref наружу (`EnsembleAnalysisRef`), потому что это поток-привязанный артефакт, не плоское значение.

[Математик]: Уточню по существу. `fuseDetectorConfidences` в core — чистая функция, вход: массив уверенностей + веса, выход: `combinedScore`. Это делает **выход fusion value-типом** естественным: `DetectionFusion` = `{ combinedScore, perDetector, threshold? }` — вычислимая величина без состояния. Ref тут не нужен: fusion ничего не хранит между кадрами, он суммирует то, что ему дали в этом кадре. Ref со store я бы применил только там, где есть накопление во времени — а это proximity, не fusion.

[Структурщик]: Поддерживаю Математика и Teamlead: `DetectionFusion` — value-тип, симметрично `FftTrendsPolicy`, один термин — один смысл. Ref вводим только когда сущность имеет идентичность и время жизни (поток, трек, отчёт). Тогда словарь чистый: `EnsembleAnalysisRef`, `ProximityRef`, `TrackRef`, `ReportRef` — всё это ссылки на живущие на хосте объекты; `DetectionFusion` — снимок значения. Смешивать нельзя, иначе получим два синонима-слоя.

[Верстальщик]: Тогда на канвасе fusion рисуется как «числовой» порт с бейджем `NN %` и `tabular-nums` — это ложится в карточку детектора из DESIGN.md без нового визуального языка. Ref-порты рисуем иконкой-«якорем». Разные формы портов = зритель сразу видит «значение vs ссылка». Это моя единственная просьба к неймингу: чтобы value и ref визуально различались.

[Teamlead]: Фиксирую точку (1): **fusion → value-тип `DetectionFusion`**. Теперь proximity-математика (точка 2). Dynin — вопрос к тебе: `LoudnessTrendTracker` сейчас в `fft-analyzer`. Апстримить чистый трекер в core или оставить на хосте и ходить мостом?

[Музыкант]: До того как ответит Математик — с продуктовой стороны: proximity («ближе/дальше/lost») это то, что держит alarm-loop живым до потери дистанции. Мне важно, чтобы трекер был **один** и переиспользуемый, а не форк в device-board. Если он останется в fft-analyzer — device-board его напрямую не увидит (analyzer-слой), придётся мост. Дублировать математику я не имею права по своему промпту.

[Математик]: `LoudnessTrendTracker` имеет **состояние** (история громкости per runId) — значит в core как есть он не поедет, core-функции у меня чистые и без стора. Правильное разделение: чистое ядро тренда (вход: серия громкостей → `'closer' | 'farther' | 'lost'`) можно апстримить в core как чистую функцию, а накопление истории (store per runId) оставить на хосте. То есть узел N4 stateless, зовёт core-функцию классификации, а буфер держит host-store. Ref наружу — `ProximityRef`, потому что есть время жизни.

[Структурщик]: Это чистое решение и оно не ломает границы. Предлагаю формулировку: **апстрим в core только чистого классификатора** (`classifyProximityTrend(series): ProximityTrend`), stateful-накопление — host-store per runId, N4 остаётся stateless-узлом-мостом. `fft-analyzer` продолжает владеть `LoudnessTrendTracker` для своих сценариев; дублирования нет, потому что общая математика вынесена в core одной леммой. Возврата «нарушена слабая связанность» не будет.

[Teamlead]: Принято. Точка (2): **чистый классификатор тренда → в core; store и `LoudnessTrendTracker` → на хосте; N4 stateless, выход `ProximityRef`**. Точка (3): входы fusion — фиксированные два порта или вариадика?

[Математик]: `fuseDetectorConfidences` математически принимает N уверенностей. Ограничивать двумя — искусственно сужать функцию. Но для устойчивости порога веса должны быть определены на все входы. Я за вариадический список **с потолком** (например до 4), чтобы численно оставаться в проверенной области калибровки — за free-v1 мы калибровали 2–3 детектора, не десяток.

[Верстальщик]: Вариадика с потолком мне подходит визуально, если это «список с кнопкой +/−» и жёстким максимумом — тогда инспектор предсказуем: 2–4 строки, каждая со своим бейджем уверенности. Полностью открытый список я блокирую по a11y и читаемости. Дефолт — 2 порта видны сразу, третий/четвёртый добавляются явным действием.

[Структурщик]: Компромисс корректен: контракт `inputs: DetectionAnalysisRef[]` с `minPorts=2, maxPorts=4`. Один термин на входной сокет, никаких «detector1/detector2» вразнобой. Это лучше двух жёстких портов (не расширяемо) и лучше безграничной вариадики (нельзя гарантировать веса и layout).

[Музыкант]: Согласен, 2 по умолчанию (harmonic + cepstral — наш рабочий ансамбль), крыша 4 под будущие neural/agentic. Это и есть смелая, но контролируемая идея: ансамбль растёт, но не в бесконечность.

[Teamlead]: Точка (3): **вариадический список входов fusion, min 2 / max 4, дефолт 2**. Точка (4): N5 make-combined-report — упаковать как async report-build внутри узла или синхронный конструктор + отдельный start-async-job снаружи?

[Структурщик]: Узлы stateless по §15.7. Асинхронный job с жизненным циклом — это состояние (running/done/failed). Значит **сам билд не должен жить внутри узла**. N5 конструирует спецификацию отчёта (N анализов + `TrackRef` → дескриптор) и отдаёт `ReportRef`; запуск async job — ответственность host-runtime по этому ref. Иначе узел перестаёт быть stateless и мы ловим гонки в графе.

[Математик]: Поддерживаю с оговоркой: отчёт детерминирован по входам — при одном и том же наборе анализов и трека `ReportRef` должен резолвиться в один результат. Тогда job идемпотентен, и повтор alarm-loop не плодит мусорные отчёты. Идемпотентность по хэшу входов — на хосте.

[Музыкант]: Для alarm-loop это критично: цикл может гонять отчёт много раз до `lost`. Если каждый проход — новый тяжёлый билд, поток захлебнётся латентностью. Синхронный конструктор ref + async job снаружи с идемпотентностью = приемлемая нагрузка. Принимаю.

[Верстальщик]: С UI-стороны `ReportRef` как выход — это одна карточка отчёта (DESIGN.md, `card` на surface, `line-clamp-2` reasoning), состояние loading через `skeleton` + `aria-busy`. Если билд внутри узла — мне негде показать «строится/готово». Ref + внешний job даёт мне честные состояния. За это.

[Teamlead]: Точка (4): **N5 — синхронный конструктор `ReportRef` (N анализов + `TrackRef`), async report-build запускает host-runtime, идемпотентно по входам**. Точка (5): alarm-loop — новый loop-узел или композиция?

[Структурщик]: Никакого нового loop-узла. У нас уже есть примитивы ветвления и повтора в device-board runtime. Alarm-loop = композиция **N3 branch-on-detection + N4 proximity + существующий loop/repeat**. Новая сущность без новой функции — это архитектурное украшательство, ровно то, что запрещено. Loop-логика уже есть — переиспользуем.

[Teamlead]: Согласен и как финальное слово: **точка (5) — alarm-loop строго композиция, нового узла не заводим**. Экономим поверхность API и не плодим синонимы поведения. Точка (6) — имена и SocketType?

[Математик]: По типам возражений нет: `EnsembleAnalysisRef`, `DetectionFusion` (value), `ProximityRef` — семантика совпадает с природой (ref где время жизни, value где снимок вычисления). `combinedScore` внутри `DetectionFusion` — числовой инвариант.

[Структурщик]: Финализирую словарь SocketType: `EnsembleAnalysisRef`, `DetectionAnalysisRef` (общий вход fusion), `DetectionFusion` (value), `ProximityRef`, `TrackRef`, `ReportRef`. Имена узлов по §15.7 make-*: `make-ensemble-analysis`, `make-detection-fusion`, `branch-on-detection` (exec, не make-*, т.к. ветвление), `make-proximity-trend`, `make-combined-report`. Один термин — один смысл, зафиксировано.

[Верстальщик]: Принимаю нейминг при условии, что value/ref различаются формой порта на канвасе и в инспекторе (задокументирую в задаче на UI-слое). Всё ложится в существующий визуальный контракт без новых токенов.

[Teamlead]: Все шесть точек закрыты консенсусом. LGTM на форму эпика: границы (device-board → только core) соблюдены, узлы stateless, тяжёлое — на хосте, core прирастает только чистыми функциями (`fuseDetectorConfidences` уже есть, `classifyProximityTrend` — апстрим). Роли — по владельцам ниже.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| (1) Выход fusion | **value-тип `DetectionFusion`** `{ combinedScore, perDetector, threshold? }`, симметрично `FftTrendsPolicy`. Ref не вводим (нет состояния/времени жизни) |
| (2) Proximity-математика | **Чистый классификатор `classifyProximityTrend(series)` → в core**; накопление истории per runId и `LoudnessTrendTracker` — на хосте; N4 stateless-мост, выход `ProximityRef` |
| (3) Входы fusion | **Вариадический список `DetectionAnalysisRef[]`, min 2 / max 4, дефолт 2** (harmonic + cepstral); потолок из-за границ калибровки |
| (4) N5 make-combined-report | **Синхронный конструктор `ReportRef`** (N анализов + `TrackRef`); async report-build запускает host-runtime, **идемпотентно по хэшу входов** |
| (5) Alarm-loop | **Строго композиция** N3 branch + N4 proximity + существующий loop/repeat; **нового loop-узла не заводим** |
| (6) Имена и SocketType | Узлы: `make-ensemble-analysis`, `make-detection-fusion`, `branch-on-detection`, `make-proximity-trend`, `make-combined-report`. Типы: `EnsembleAnalysisRef`, `DetectionAnalysisRef`, `DetectionFusion` (value), `ProximityRef`, `TrackRef`, `ReportRef` |

**Definition of Done:**
- `check:boundaries` зелёный: `@membrana/device-board` импортирует **только** `@membrana/core`; ensemble/fft-analyzer вызываются через host-мост, не прямым импортом.
- Все 5 узлов **stateless** (проверка по §15.7 CONCEPT); никакого store/job внутри узла.
- В `@membrana/core`: `fuseDetectorConfidences` (уже есть) + новая чистая `classifyProximityTrend(series): ProximityTrend` с unit-тестами без DOM/Web Audio/React.
- SocketType и имена узлов заведены по словарю выше; value/ref-порты **визуально различимы** на канвасе и в инспекторе (owner: Rodchenko), по DESIGN.md без новых токенов.
- fusion: `min 2 / max 4` входов, валидация арности в `isValidConnection`; веса определены на все подключённые входы.
- N5: `ReportRef` детерминирован по входам; async job идемпотентен; UI-состояния loading (`skeleton` + `aria-busy`) на карточке отчёта.
- Alarm-loop собран как сценарий из существующих примитивов + N3/N4; paired smoke «поток → 2 детектора → fusion → трек → отчёт → loop до `lost`».
- Владельцы: Dynin — core-функции; Kuryokhin — host-мост ensemble/proximity/report-build; Ozhegov — контракты узлов и `isValidConnection`; Rodchenko — палитра/инспектор/карточка отчёта; Vesnin — финальный LGTM.

---

*Реплик в диалоге: 25; каждый участник высказался не менее одного раза.*
