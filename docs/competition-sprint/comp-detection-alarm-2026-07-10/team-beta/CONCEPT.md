# Concept — Team Beta

> Competition Sprint `comp-detection-alarm-2026-07-10` · lead-роль: **Математик (Dynin)**
> UserCase id: `usercase-detection-alarm-beta` · ветка `comp/comp-detection-alarm-2026-07-10/beta`

## One-liner

**Измеренный сценарий**: полный детекционный UserCase как *деривация канона MVP v2.0-async* —
каждый порог, окно и вес выведен из калибровок `DETECTOR_BENCHMARK.md`, отчёт идемпотентен
по построению, а крайние случаи (пустое окно, молчащий детектор, потеря цели) закрыты
композицией `is-valid`-гейтов и тестами, а не надеждой.

## Product thesis

Оператор получает сценарий, в котором **числа объяснимы**: почему порог тревоги 0.55, почему
окно записи 5 с и окно трендов 4 с, почему в fusion два входа, а не четыре. Побеждает не
«больше узлов», а прослеживаемая цепочка *детекция → согласие двух независимых детекторов →
один combined-отчёт без дублей → тревога с явной семантикой потери цели*. Деривация от
bundled-канона означает: всё, что уже работало у оператора (bootstrap записи, журнал
onConnect, async-upload трека, teardown), продолжает работать байт-в-байт — beta добавляет
только детекционную надстройку basn.

## Architecture

### Затронутые пакеты

- `@membrana/device-board` — **только данные**: builder документа
  (`src/graph/usercase-detection-alarm-beta.ts`), catalog entry
  (`src/catalog/bundled-user-case-entries.ts`, tier `community`), тесты.
- `@membrana/core` — не трогаем (читаем контракты).
- Executors / host / клиентский bridge — не трогаем (hard rule брифа).

### Диаграмма главного лупа (main, деривация MVP v2.0-async)

```
onTick ─▶ fn-3 GetAudioStream ─▶ GetSample ─▶ GetFFTFrame ─▶ CollectFftFrames ─▶ CollectSamples
                                                                                      │
                                              ┌── false ──────────────▶ ∞             │
                                IsRecordingWindowFull (5 s wav) ◀──────────────────────┘
                                              │ true
                                   Sequence (latent, 4 Then)
        ┌──────────────┬──────────────────────┼──────────────────────────────┬─────────────▶ exec-out ─▶ ∞
      then-0         then-1                 then-2                          then-3
   StopRecording   MakeTrack ─▶ StartAsyncJob(track-upload)          fn-3 ─▶ fn-1 (рестарт записи)
                        │              │ promise
                        │        OnAsyncResolved ─▶ Print «📼 track»
                        │ track
                     then-2:  FlushSpectralAnalyser ─▶ MakeFftTrendsAnalysis (policy 20×200 ms)
                                                            │ analysis-1        │ exec
                              CollectSamples.batches ─▶ MakeEnsembleAnalysis ◀──┘
                                                            │ analysis-2 (EnsembleAnalysisRef)
                                       MakeDetectionFusion (2 входа, weighted mean)
                                                            │ fusion (DetectionFusion)
                                       BranchOnDetection (threshold 0.55)
                                          │ detected                └─ not-detected ─▶ (конец Then)
                              MakeCombinedReport (reporter + trends + ensemble + track)
                                          │ report            │ exec
                              StartAsyncJob(report-build) ◀───┘
                                          │ promise                 ▲ main loop НЕ ждёт
                              OnAsyncResolved ═▶ PublishReport(journal) ─▶ Print «🧾 combined»
```

### Диаграмма alarm-лупа (композиция, без новых примитивов)

```
alarm onTick ─▶ GetAudioStream ─▶ GetSample ─▶ GetFFTFrame ─▶ CollectFftFrames(1 s)
                                                                    │ exec
                                              FlushSpectralAnalyser │
                                                    │ frames        ▼
                                              IsValid(frames) ◀── exec
                            ┌─ false (кадров ещё нет) ┐   │ true
                            ▼                         │   ▼
                    MakeProximityTrend ◀──────────────┘  MakeFftTrendsAnalysis (5×100 ms)
                    │ proximity     ▲ exec fan-in             │ analysis-1
                    │               └── MakeDetectionFusion ◀─┘  (вход 2 молчит — by design)
                    ▼                        │ fusion ────────▶ (data в Proximity)
                 IsValid(proximity)
                    │ true ─▶ Print «📡 tracking» ─▶ ∞   (луп живёт)
                    │ false ─▶ Print «🔕 lost» ─▶ (выход: до ∞ не доходим)
```

### Границы: что НЕ трогаем

- Ветки `initial` / `onConnect` / `onStop` / `onDisconnect`, функции `fn-1` (StartRecording)
  и `fn-3` (GetAudioStream), переменная `journal1` — **байт-в-байт из bundled MVP**
  (деривация, не форк: builder клонирует канон и заменяет только report-секцию main + alarm).
- Никаких новых node kinds, socket types, изменений executors/host.
- Web Audio — только через engine (граф ссылается на существующие ref-цепочки).

## Key decisions (ADR-lite)

| ID | Решение | Альтернатива | Почему так |
|----|---------|--------------|------------|
| B1 | Документ = **программная деривация** bundled MVP v2.0-async (builder-трансформация), не рукописный JSON на 1700 строк | Форк generated-файла целиком | Diff обозрим (только детекционная надстройка), канон bootstrap/teardown не расходится с bundled; регрессии MVP чинятся в одном месте |
| B2 | Fusion в main — **ровно 2 входа** (trends + DSP-ансамбль) | 3–4 входа вариадики | Члены ансамбля (harmonic/cepstral/spectral-flux) уже слиты внутри `EnsembleProducer`; подавать их сырыми = двойной счёт коррелированных ошибок одного DSP-семейства. Порог вариадики = граница калибровки (консилиум #323 т.3) |
| B3 | `detectionThreshold = 0.55` — равен `minConfidence` trends | Дефолт 0.5 | Инвариант: **combined-гейт не мягче одиночного trends-гейта**. combinedScore = взвешенное среднее; ансамбль (cepstral P=50 %, R=100 % на v0.2) не должен уметь дотащить слабый trends-сигнал до тревоги в одиночку |
| B4 | Combined-отчёт публикуется **через report-build async job** (`MakeCombinedReport` → `StartAsyncJob(report-build)` → `OnAsyncResolved` → `PublishReport`) | Синхронный publish в then-2 | Требование брифа «main loop не блокируется»; sync-конструктор отдаёт ReportRef мгновенно, тяжёлая упаковка/выгрузка — detached |
| B5 | Идемпотентность отчёта — **по построению + host-хэш** | Дедуп в графе | Отчёт создаётся только на detected-ветке main (alarm-луп report-цепочку не трогает вовсе); host `makeCombinedReport` дополнительно кэширует по хэшу входов (basn-5) — повтор detected на том же окне вернёт тот же ReportRef |
| B6 | Alarm-fusion — trends с коротким окном (5×100 мс), **вход 2 намеренно молчит** | Полный ансамбль в alarm | Ансамблю нужно окно сэмплов ~3 с, каденс alarm — 400 мс: свежесть важнее полноты. `present:false` — штатный режим fusion (combinedScore = trends), а `lost` считается хостом по серии combinedScore с дебаунсом 3 промаха < 0.3 |
| B7 | Выход из alarm — `is-valid(ProximityRef)` false-ветка (lost → invalid) | Новый branch-узел | Строго композиция (консилиум #323 т.5); false-путь не достигает `∞` |
| B8 | Пустое окно кадров в alarm гейтится `is-valid(frames)` **до** анализа | Пустить как есть | `MakeFftTrendsAnalysis` кидает на пустом FftFrameRefList — первый тик тревоги не должен ронять сценарий; false-путь идёт сразу в Proximity (громкость копится, score пропускается) |

## Trade-offs

| Плюс | Минус |
|------|-------|
| Числа выведены из калибровок, а не выдуманы; жюри может проверить каждую константу по `DETECTOR_BENCHMARK.md` | Нет третьего/четвёртого входа fusion — вариадика показана минимально необходимой (2), «эффектности» меньше |
| Деривация MVP: bootstrap/journal/teardown гарантированно канон | Читать builder-трансформацию чуть сложнее, чем плоский JSON (компенсируется тестами структуры) |
| Alarm честно работает на свежих данных (0.5 с окно) и не роняет сценарий на пустом тике | В alarm детектирует только trends; ансамбль в тревоге отключён осознанно (B6) |
| Отчёт один и идемпотентен: ноль дублей при повторах | Combined-отчёт уезжает в журнал с задержкой report-build job (миллисекунды на стабе, но всё же async) |

## Phase 2 plan

### 2α — vertical slice (что покажем первым)

1. Builder `usercase-detection-alarm-beta.ts`: клон MVP → замена report-секции main на
   detection-цепочку (ensemble → fusion → branch → combined → report-build) → новый alarm.
2. Catalog entry `usercase-detection-alarm-beta` (tier `community`) в bundled-каталоге.
3. Тесты структуры: `loadDocument` валиден (`parseDeviceScenarioDocument.ok`), полная цепочка
   узлов/рёбер на месте (fusion 2 входа, branch detected → combined → async, alarm lost-путь
   не ведёт в ∞), policy-значения точны.
4. Scoped CI: `yarn turbo run lint typecheck test --filter=@membrana/device-board`.

### 2β — full DoD (что добьём)

1. Runtime-smoke по образцу эпик-smoke #323, но на **подграфах моего документа**:
   detected-путь (fusion 0.8 → branch detected → combined report валиден), alarm
   (approaching → ProximityRef valid → true-ветка в ∞; lost → invalid → false-ветка, до ∞
   не доходит), + крайние случаи: молчащий вход 2 alarm-fusion, порог 0.55 строгий
   (0.54 → not-detected), пустой fusion → not-detected.
2. Карточка в пикере: обновить каталог-тесты (size 8→9), честные title/description
   (DSP-ансамбль, не нейро).
3. Baseline 650 тестов device-board зелёный; полный scoped CI
   `--filter=@membrana/device-board --filter=@membrana/client`.
4. Тег `comp-comp-detection-alarm-2026-07-10-beta-final`.

## Risks & mitigations

| Риск | Митигция |
|------|----------|
| **Известный gap рантайма**: `exec-subgraph.ts` не пробрасывает fusion/ensemble/proximity stores в `executeScenarioBlock` — basn-узлы на живом exec-пути бросят `requires …Store`. Это относится ко ВСЕМ командам (bасn-эпик смоукался на уровне executeScenarioBlock; «браузерный smoke — остаток» detection-ensemble-service) | Чиним НЕ мы (запрет брифа на изменения executors). Runtime-smoke — на уровне executeScenarioBlock со stores, как эталонный эпик-smoke. Фикс (проброс 3 store в exec-subgraph/event-dispatch, ~6 строк) заявляем кандидатом в Pre-vote consensus «переносится победителю regardless» |
| Вход в alarm-луп делает runtime detection-front по `lastDetection` trends (isDrone), а не branch-узел | Это существующая механика лупов (граф не переключает ветки); branch-on-detection владеет порогом *combined-отчёта*. Зафиксировано здесь, честно расскажем на consilium |
| `MakeEnsembleAnalysis` кидает на пустом batch | В main исполняется только в gate-ветке (окно 5 с > окна collect 3 с — batch гарантированно есть); в alarm ансамбля нет (B6) |
| Каталог-тесты с жёстким size | Обновляем count-ассерты в том же PR (8→9), ничего не ломаем молча |
| Y-координаты/грид layout canon | Все новые узлы — на сетке 8 px, layoutProfile `exec-lr-v1` |

## Demo narrative (2–3 мин)

1. `yarn workspace @membrana/client dev` → device-board → пикер → карточка
   **«Beta: Measured detection + alarm (DSP fusion)»** (badge Sprint) → Apply.
2. Показываем канвас: группы «Слияние двух детекторов», «Combined-отчёт (async)»,
   «Тревога: дистанция и потеря цели» — оператор читает сценарий без документации;
   на инспекторе fusion — 2 входа, на branch — порог 0.55 (= minConfidence trends).
3. Пуск → живой микрофон, дрон-звук ≥15 с: журнал получает **один** combined-отчёт
   (per-detector confidence + combinedScore + track), print «📼 track» / «🧾 combined».
4. Тревога: proximity-тик каждые ~400 мс, print «📡 tracking» (ближе/дальше по deltaRatio);
   тишина ≥15 с → 3 промаха combinedScore < 0.3 подряд → `lost` → ProximityRef invalid →
   false-ветка `is-valid` → print «🔕 lost», ∞ не достигается, runtime возвращает main.
5. `yarn logs:parse`: chain-log показывает `async-job-start report-build` между
   main-tick-start/done — итерации не блокированы; повторных reportId нет (идемпотентность).

---

## Implementation (обновляется по фазам)

- [x] Phase 1 — CONCEPT (этот файл).
- [x] **2α done @ commit `f9d52b59`** — builder `usercase-detection-alarm-beta.ts` (деривация
  MVP: main detection-цепочка ensemble→fusion(2)→branch(0.55)→combined→report-build async;
  alarm — proximity-композиция с гейтами B7/B8), catalog entry tier `community`,
  17 структурных тестов (валидность + нулевые ошибки validateUserCaseDocument, полная цепочка,
  policy-значения, lost-путь без ∞, гидратация). Scoped CI device-board зелёный:
  **667 tests pass** (650 baseline + 17), lint/typecheck OK.
- [x] **2β done @ commit `1ce3c687`** — runtime-smoke на подграфах документа
  (`runtime/usercase-detection-alarm-beta-smoke.test.ts`, 7 тестов по образцу эпик-smoke #323):
  detected-путь (fusion 0.8 → detected → combined-отчёт с reporter+2 анализа+трек →
  report-build job pending + PromiseRef → publish в журнал), крайние случаи B3 (порог 0.55
  строгий: 0.545 → not-detected, ровно 0.55 → detected), пустой fusion (presentCount 0 →
  not-detected без throw), B5 (идемпотентность: повтор combined → тот же handle/reportId),
  B8 (frames-гейт: пустое окно → false-ветка сразу в proximity), B6 (alarm-fusion trends-only:
  presentCount 1, combinedScore = trends), B7 (approaching → valid → true-ветка в ∞;
  lost → invalid → false-ветка, от print «lost» exec-рёбер нет). Находка фазы: ребро
  presence-гейта сделано нетипизированным — до первого flush collect-store отдаёт invalid-ref
  дефолтного вида, типизированное ребро бросало type-mismatch вместо честного false.
  Карточка в пикере: клиентский пикер читает `getDefaultUserCaseCatalogService` — entry
  `usercase-detection-alarm-beta` (tier community, badge «Sprint») виден автоматически;
  каталог-тесты 8→9. Полный scoped CI зелёный: **device-board 674 tests**
  (650 baseline + 24 новых), **client 287 tests**, lint/typecheck OK (25 turbo-tasks).
  Тег: `comp-comp-detection-alarm-2026-07-10-beta-final`.
