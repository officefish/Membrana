# Concept — Team Alpha

> Competition Sprint `comp-detection-alarm-2026-07-10` · lead-роль: **Структурщик (Ozhegov)**
> UserCase id: `usercase-detection-alarm-alpha`

## One-liner

Полный детекционный сценарий «combined-детекция + alarm-loop», собранный как **читаемая
партитура из шести актов**: оператор ведёт взгляд слева направо по одной exec-магистрали
на каждой вкладке и понимает сценарий без документации.

## Product thesis

Оператор выигрывает, когда канвас **сам рассказывает историю**: «копим окно → два
детектора слушают → слияние решает → тревога живёт, пока цель рядом». Alpha сознательно
отказывается от user-функций (functionCount = 0): вся логика лежит плоско, одна
магистраль на ветку, семантические comment-группы вместо «чёрных ящиков». Это эталон
упаковки S3 для FREE-тарифа: новичок открывает карточку и видит, **как устроена
детекция**, а не «6 блоков-функций, кликни внутрь». Честность: заголовок и описание
карточки говорят «DSP-ансамбль» (trends + ensemble), не нейро.

## Architecture

Затронутые пакеты:

- `@membrana/device-board` — **только данные**: документ UserCase
  (`src/graph/usercase-detection-alarm-alpha.ts`), catalog entry
  (`src/catalog/detection-alarm-competition-user-case-entries.ts` → splice в
  `bundled-user-case-entries.ts`), тесты (graph + runtime-smoke).
- `@membrana/client` — ничего не меняем: пикер читает
  `getDefaultUserCaseCatalogService()`, карточка появляется автоматически.

Границы: **НЕ трогаем** core-контракты, executors, host, палитру, wire, engine.
Web Audio — только через engine (узлы графа = существующая палитра v0.4–v0.9 + basn).

### Диаграмма графа (main loop, exec-магистраль слева направо)

```
main / onTick
  ┌─────────── ① Окно наблюдения ───────────┐ ② Гейт ┌───── ③ Два детектора ─────┐ ④ Решение
onTick → GetMic → GetAudioStream → GetSample → GetFFT → CollectFFT → CollectSamples
                                                                        │
                                              IsRecordingWindowFull ◄───┘
                                               │false                │true
                                               ▼                     ▼
                                               ∞            StopRecording → MakeTrack
                                                                      │
                                        FlushSpectralAnalyser ◄───────┘
                                               │
                                               ▼
                        MakeFftTrendsAnalysis (детектор A: trends-FFT, policy на узле)
                                               │
                                               ▼
                        MakeEnsembleAnalysis  (детектор B: DSP-ансамбль по окну сэмплов)
                                               │
                                               ▼
                        MakeDetectionFusion (analysis-1 + analysis-2 → combinedScore)
                                               │
                                               ▼
                              BranchOnDetection (threshold 0.55)
                               │not-detected            │detected
                               ▼                        ▼
                     StartRecording (рестарт)   ⑤ MakeCombinedReport (2 анализа + трек)
                               │                        │
                               ▼                        ▼
                               ∞                Sequence (latent Then ×2)
                                                 ├─ then-0 → StartAsyncJob report-build
                                                 │             └─ OnAsyncResolved ⇒ PublishReport
                                                 ├─ then-1 → StartAsyncJob track-upload (track)
                                                 └─ exec-out → ⑥ StartRecording (рестарт) → ∞

alarm / onTick (композиция из брифа, без новых примитивов)
onTick → MakeProximityTrend (fusion ⇐ Fusion из main, dataflow-only) → IsValid(proximity)
           │true → Print «Цель рядом — слежение» → ∞ (loop-repeat)
           │false → Print «Дистанция потеряна» (lost = выход из alarm-loop)

initial / onStart:  Event → GetMicrophone → StartStreaming → GetRecorder → StartRecording
                    (MakeRecordingPolicy 5 s WAV — pure value на входе policy)
onConnect:          Event → IsValid(server) → journal1 := GetJournal(server) | GetJournal(device)
onStop:             Event → GetMicrophone → StopStreaming
onDisconnect:       Event → journal1 := GetJournal(device)
```

## Key decisions (ADR-lite)

| ID | Решение | Альтернатива | Почему так |
|----|---------|--------------|------------|
| A1 | Плоский граф, functionCount = 0 | User-функции как в bundled MVP (fn-1/fn-3) | Изюминка Структурщика: сценарий читается без «проваливания» в подграфы; функции прячут детекционную историю, а рестарт-логика через collapse — источник багов (см. repair-хаки usercase-competition-pack) |
| A2 | Детекция **внутри гейта окна** (`IsRecordingWindowFull true` → детекторы → fusion → branch) | Детекторы на каждом тике | Оба детектора работают на полном окне (3 s collect / 5 s запись): честные policy, нет пустых `FftFrameRefList`-падений на ранних тиках, main-тик дёшев, пока окно копится |
| A3 | Alarm-гейт: mirror-узел `Fusion (из main)` в alarm-ветке, dataflow-only (без exec) | Неподключённый fusion-вход (combinedScore = null) | Тот же nodeId, что fusion в main (прецедент — `fn-1-block` в initial+main): pull-резолюция отдаёт combinedScore последнего main-тика хосту proximity; на канвасе оператор видит, **откуда** дистанция берёт score |
| A4 | Отчёт: `MakeCombinedReport` (sync ctor) один раз на детекцию в main; тяжёлая упаковка — `StartAsyncJob report-build` → `OnAsyncResolved` → `PublishReport` | Публикация внутри alarm-loop | Идемпотентность по построению: alarm-loop вообще не создаёт отчётов — дублей при повторах alarm не бывает; плюс идемпотентность по хэшу входов на хосте (basn-5) |
| A5 | `Sequence latentThen` ×2: report-build и track-upload — detached | `await-promise` в магистрали | Требование брифа: main loop не блокируется; exec-out Sequence идёт на рестарт записи сразу, jobs живут в hub |
| A6 | Выход из alarm — строго композиция `MakeProximityTrend → IsValid(false=lost)`, false-ветка ведёт в Print «Дистанция потеряна» и НЕ ведёт в ∞ | Новый branch-узел | Требование брифа (консилиум basn т.5); на канвасе false-ветка визуально «обрывает» луп |
| A7 | Порог branch 0.55 = `minConfidence` trends-policy | Дефолт 0.5 | Согласованность: fusion усредняет согласившиеся детекторы; порог выше дефолта режет одиночные слабые всплески (см. §Policy) |

## Trade-offs

| Плюс | Минус |
|------|-------|
| Плоский граф: вся детекционная цепочка видна одним взглядом, 6 пронумерованных comment-групп ведут как акты | Больше узлов на канвасе main (~20 против ~12 у MVP со свёрнутыми функциями) — компенсируем строгими lane'ами: exec-магистраль сверху, data-провайдеры снизу |
| Детекция раз в окно (A2): дешёвые тики, честные окна детекторов | Латентность решения = окно записи (5 s); для alarm-сценария это осознанный трейд (демо: дрон ≥15 s) |
| Mirror-Fusion в alarm (A3): honest score-гейт + читаемость источника | Значение fusion заморожено на момент детекции (main стоит, пока alarm живёт) — динамику дистанции всё равно ведёт host-store per nodeId (basn-4), score — только гейт |
| Отчёт вне alarm-loop (A4): нулевой риск дублей | Один combined-отчёт на детекционное событие, не серия по мере сближения — для FREE-эталона достаточно |

## Policy-выборы (обоснование значений)

| Узел | Policy | Почему |
|------|--------|--------|
| CollectSamples / CollectFftFrames | windowSec 3, bufferSize 2048, queueCapacity 10, smoothing 0.75 | Канон bundled MVP: 3 s окна хватает обоим детекторам, 2048 — баланс разрешение/латентность |
| IsRecordingWindowFull / StartRecording | windowSec 5, WAV | Трек детекции = 5 s WAV — слушаемое доказательство в журнале |
| MakeFftTrendsPolicy | minRms 0.02, intervalMs 500, mode auto, minConfidence 0.55, measurements 20, шаблоны DRONE_TIGHT+WIND+QUIET+TRAFFIC+BIRDS+VOICE | Канон MVP: полный набор шаблонов позволяет trends отличать дрон от фона, а не «всё, что громко» |
| MakeDetectionFusion | inputCount 2 (trends + ensemble) | Бриф: 2 детектора обязательны; 3–4 DSP не берём — третьего независимого сигнала в палитре нет, дублировать семейство ради количества = шум калибровки (консилиум basn т.3) |
| BranchOnDetection | threshold 0.55 | Выравнен с minConfidence trends: событие = согласие ансамбля не слабее, чем вера одиночного детектора |

## Phase 2 plan

### 2α — vertical slice (что покажем первым)

1. Документ `usercase-detection-alarm-alpha.ts` — все 6 веток, полная цепочка задания,
   layout exec-lr + comment-группы актов.
2. Catalog entry (`tier: community`) + splice в bundled entries; обновление pinned-счётчиков
   `user-case-catalog.test.ts` (8 → 9).
3. Тест графа: `loadDocument` валиден (parse + `validateUserCaseDocument`), непустой;
   exec-магистраль detected-пути и alarm-композиция присутствуют порёберно.
4. Scoped CI: `turbo lint typecheck test --filter=@membrana/device-board`.

### 2β — full DoD (что добьём)

1. Runtime-smoke по образцу эпик-smoke `combined-report-executor.test.ts`, но на
   **реальных подграфах документа**: fusion → branch(detected) → combined-report →
   report-build job (pending, не блокирует) + alarm: proximity approaching → valid,
   lost → invalid → is-valid → false (выход).
2. Карточка в пикере: entry виден через `getDefaultUserCaseCatalogService` (клиентский
   хук `useUserCaseCatalog` читает его без изменений кода client).
3. Baseline 650 тестов device-board зелёный; полный scoped CI
   `--filter=@membrana/device-board --filter=@membrana/client`.
4. Обновить §Implementation здесь; тег `comp-comp-detection-alarm-2026-07-10-alpha-final`.

## Risks & mitigations

| Риск | Митигация |
|------|-----------|
| Duplicate nodeId (mirror Fusion) в двух ветках ломает hydrate/apply | Прецедент в bundled MVP (`fn-1-block` в initial и main); mirror — dataflow-only, без exec; проверяем тестом гидратации/валидации документа |
| Пустые ref-list'ы валят детекторы на ранних тиках | A2: детекторы стоят строго за гейтом `IsRecordingWindowFull true` — к этому моменту оба collect-окна полные |
| Latent Sequence: pre-run валидаторы async | Паттерн 1:1 с bundled v2.0-async (latentThen: true, supportsAsync на async-целях); гоняем validate-user-case-document в тесте |
| Обновление pinned catalog-счётчиков конфликтует с beta/gamma | Конфликт материализуется только у победителя в Phase 5 — тривиальный merge (счётчик + id) |
| Детекция не входит в alarm (detection front требует DRONE-template) | Trends-policy включает DRONE_TIGHT; front поднимается из `make-fft-trends-analysis` detection (существующий канал lastDetection) — фиксируем в smoke |

## Demo narrative (2–3 мин)

1. `yarn workspace @membrana/client dev` → device-board → пикер → карточка
   **«Alpha · Детекция + тревога (DSP-ансамбль)»** → Apply. На канвасе main — шесть
   пронумерованных актов слева направо; за 15 секунд проговариваю сценарий по группам,
   не открывая ни одной функции (их нет).
2. Пуск → живой микрофон. Дрон-звук с телефона ≥15 с: акт ② гейт срабатывает, в акте ③
   видно оба детектора, ④ Branch уходит в detected, ⑤ создаётся combined-отчёт
   (per-detector + combinedScore в журнале), track-upload и report-build уходят в
   async-hub, магистраль тут же рестартует запись (⑥).
3. Вкладка alarm: proximity живёт — Print «Цель рядом», score-гейт виден как
   `Fusion (из main)`. Подношу/отдаляю телефон — тренд ближе/дальше в журнале.
4. Тишина ≥15 с → proximity `lost` → IsValid уводит в false-ветку «Дистанция потеряна»,
   alarm завершается, main продолжает копить окна.
5. `yarn logs:parse` — chain-log: `async-job-start report-build` между `main-tick-done`
   соседних итераций, тики не растянуты — jobs не блокировали магистраль.

## Implementation

- **2α done @ commit `0b0752a9`** — документ `usercase-detection-alarm-alpha.ts`
  (6 веток, functionCount 0, mirror-Fusion A3, 6 актов-групп), catalog entry
  `usercase-detection-alarm-alpha` (community) в bundled-каталоге, тест графа
  (8 тестов: parse + `validateUserCaseDocument`, порёберная магистраль ①–⑥,
  alarm-композиция A3/A6, каталог, читаемость групп). Scoped CI device-board:
  lint ✅ typecheck ✅ test ✅ — 137 files, **658 tests** (baseline 650 не сломан).
- 2β: pending
