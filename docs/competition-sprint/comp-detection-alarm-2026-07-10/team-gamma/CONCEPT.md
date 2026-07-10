# Concept — Team Gamma

Competition Sprint `comp-detection-alarm-2026-07-10` · lead-роль: Верстальщик (Rodchenko).

## One-liner

«Прозрачный сценарий»: полный детекционный UserCase как плакат ①–⑥ — плоский граф без
user-функций, каждый ключевой момент (старт, окно, решение, трек, async-отчёт, тревога)
виден на канвасе и печатается в журнал; demo рассказывает историю сама.

## Product thesis

Combined+alarm UC — эталон упаковки S3 для FREE-тарифа: его будут открывать люди, которые
видят device-board впервые. Значит выигрывает не самая «инженерная» топология, а та,
которую оператор читает без документации:

- **Плоский граф, нет collapsed-функций.** Полная цепочка задания — одна exec-магистраль
  слева направо; свернуть в функции легко потом, развернуть понимание из чёрных ящиков —
  дорого. Оператор видит ВСЕ узлы палитры basn в работе (учебная ценность эталона).
- **Наблюдаемость по шагам, не шумом.** Print-узлы стоят только в поворотных точках
  истории: поток запущен (①), детекция подтверждена (③), трек улетел async (④), combined-отчёт
  собран async (⑤), живой тренд дистанции и потеря цели (⑥). Not-detected — молчит:
  тишина не событие.
- **Плакатные comment groups ①–⑥** (наша идентичность с прошлых конкурсов) — пронумерованные
  рамки совпадают с шагами Demo script: жюри идёт по цифрам.

## Architecture

**Затронутые пакеты:** только `@membrana/device-board` (граф-документ UserCase + catalog
entry + тесты). Косвенно виден в `@membrana/client` через существующий picker
(`useUserCaseCatalog` → `@membrana/usercase-catalog-service`) — код клиента не меняем.

**Что НЕ трогаем:** контракты core, executors/host, палитру узлов, wire, кабинет/сервер.
device-board по-прежнему зависит только от core; Web Audio — только на хосте клиента.

### Диаграмма графа (main + alarm)

```
onStart(①):  Event ─▶ GetMicrophone ─▶ StartStreaming ─▶ StartRecording ─▶ Print«поток запущен»
                                        (RecordingPolicy 5s wav — pure constructor)

main(②─⑤):
 onTick ─▶ isValid(stream) ──false──▶ Print«поток потерян» ─▶ StopRuntime
              │true
              ▼
   GetSample ─▶ GetFFTFrame ─▶ CollectFftFrames ─▶ CollectSamples ─▶ IsRecordingWindowFull
        (окно 3 с, buffer 2048)                                        │false ─▶ ∞ (окно копится)
                                                                       │true
                                                                       ▼
   Sequence «окно готово» (latent, 3 Then)
     ├─ then-0: StopRecording ─▶ MakeTrack ─▶ StartAsyncJob(track-upload)···▶ OnAsyncResolved ─▶ Print«④ трек»
     ├─ then-1: FlushSpectralAnalyser ─▶ MakeFftTrendsAnalysis ─┐
     │          CollectSamples.batches ─▶ MakeEnsembleAnalysis ─┤ (2 детектора)
     │                                                          ▼
     │          MakeDetectionFusion(2 входа) ─▶ BranchOnDetection(threshold 0.5)
     │            ├─ detected: Print«③ score» ─▶ MakeCombinedReport ─▶ PublishReport
     │            │            ─▶ StartAsyncJob(report-build)···▶ OnAsyncResolved ─▶ Print«⑤ отчёт»
     │            └─ not-detected: (тихо, ветка заканчивается)
     ├─ then-2: StartRecording (рестарт окна записи)
     └─ exec-out ─▶ ∞ (loop-repeat)

alarm(⑥):  onTick ─▶ MakeProximityTrend ─▶ Print«тренд: ближе/дальше» ─▶ isValid(ProximityRef)
                        (host-серии)            │true ─▶ ∞ (тревога живёт)
                                                │false ─▶ Print«дистанция потеряна» ─▶ выход
onStop:    Event ─▶ isValid(mic) ─▶ StopStreaming ─▶ CancelAsyncJobs
onDisconnect: Event ─▶ journal1 ← GetJournal(device)   (переселение журнала)
onConnect: Event ─▶ isValid(server) ─ true ─▶ journal1 ← GetJournal(server)
                                     └ false ▶ journal1 ← GetJournal(device)
```

Вход в alarm — штатный detection-front рантайма (детекция trends в main); выход —
композиция brief: ProximityRef инвалидируется хостом при `trend=lost` → `is-valid`
false-ветка = выход, true-ветка = `loop-repeat`. Никаких новых loop-примитивов.

## Key decisions (ADR-lite)

| ID | Решение | Альтернатива | Почему так |
|----|---------|--------------|------------|
| G1 | Плоский граф без user-функций | Collapse в 2–3 функции (как MVP fn-1/fn-3) | Эталон S3 читают новички; плакат ①–⑥ работает только когда вся цепочка на одном канвасе. Функции прячут именно то, что конкурс должен показать |
| G2 | Документ строится TS-билдером в рантайме модуля (`default-usercase-detection-alarm-gamma.ts`), memo + `parseDeviceScenarioDocument` fail-fast | 1800-строчный generated JSON (как MVP codegen) | Ревьюабельность: узлы/рёбра объявлены декларативными хелперами с читаемыми id `g-*`; diff будущих правок — строки, а не блоб. Паттерн загрузчика (fail-fast parse + cache) сохранён из MVP |
| G3 | Fusion ровно 2 входа (trends + ensemble) | 3–4 DSP-источника | Brief: вариадика «по обоснованию, не ради количества». Третьего независимого детектора в палитре нет (yamnet отложен); дублировать DSP-семейство — надувать agreement |
| G4 | Threshold 0.5 (дефолт), явно сериализован на узле | Задрать до 0.6–0.7 | Демо с телефонным дроном честнее на сбалансированном пороге; 2 согласных детектора (~0.9/0.7) дают ~0.8, расхождение — середину. Явное поле = оператор видит и крутит |
| G5 | Combined-отчёт на detected-ветке, publish сразу, тяжёлая сборка — `start-async-job(report-build)` | Собирать отчёт на каждом окне | Идемпотентность basn-5 на хосте + отчёт только по факту детекции = журнал без дублей и шума; alarm-повторы не плодят отчёты |
| G6 | Proximity в alarm без fusion-ребра (host-серии по nodeId) | Дублировать fusion-цепочку в alarm-ветке | Ветки main/alarm — разные подграфы: тащить второй ансамбль в alarm = двойной прогон DSP на тик тревоги. Host копит серии сам (basn-4), combinedScore-гейт опционален по контракту узла |
| G7 | Print «живого тренда» на каждом тике alarm — в один и тот же print-слот | Писать в журнал каждый тик | printOutputs перезаписывается per nodeId — живой индикатор без спама; потеря цели — отдельный print-узел (событие) |
| G8 | `executionPolicy` не ставим (free) | `competition` + timeout 600 c | UC — продуктовый эталон S3, не конкурсный шаблон с таймаутом; политику competition при Phase 5b проставит `comp:publish-catalog`, если решит жюри |
| G9 | onStop добавляет `cancel-async-jobs` | Как в MVP (без cancel) | AP v1 сделан для этого: стоп сценария не оставляет висящие upload/report-джобы; шаг виден на плакате |

## Trade-offs

| Плюс | Минус |
|------|-------|
| Читаемость: вся цепочка задания на одном экране, шаги = demo script | Main-канвас плотнее, чем у collapse-подхода (~25 узлов + провайдеры) — компенсируем плакатным layout и группами |
| Плоский граф = один диспатч exec, нет function-call бриджей данных | Нет переиспользуемых функций; для будущих UC-вариаций придётся собирать заново (осознанно: эталон важнее DRY) |
| TS-билдер документа — маленький diff, легко ревьюить и чинить | Нет codegen-скрипта как у MVP; при массовых правках layout руки правят числа (смягчено хелперами колонок) |
| Print-наблюдаемость в поворотных точках | +5 узлов print на канвасе; сняты с not-detected пути, чтобы не шуметь |

## Phase 2 plan

### 2α — vertical slice (что покажем первым)

1. `packages/device-board/src/graph/default-usercase-detection-alarm-gamma.ts` — билдер
   полного документа (все 6 веток, полная цепочка задания, policy-значения, comment groups
   ①–⑥, плакатный layout).
2. Catalog entry `usercase-detection-alarm-gamma` (`tier: community`) в
   `bundled-user-case-entries.ts` (отдельный модуль entry, AUTO-GENERATED
   community-файл не трогаем).
3. Тест документа: `loadDocument` валиден и непуст; узлы/рёбра полной цепочки
   (2 детектора → fusion → branch → track/combined/publish/async; alarm prox → is-valid →
   loop-repeat/выход) на месте; `validateUserCaseDocument` без ошибок; гидратация не падает.
4. Обновление count-тестов каталога (8 → 9).
5. Scoped CI: `yarn turbo run lint typecheck test --filter=@membrana/device-board`.

### 2β — full DoD (что добьём)

1. Runtime-smoke по образцу эпик-smoke basn-5, но на узлах НАШЕГО документа:
   detected-путь (fusion 0.8 → branch detected → combined-report valid → publish) +
   alarm (prox approaching → valid → true-ветка в ∞; prox lost → invalid → false-ветка =
   выход, не loop-repeat).
2. Карточка в пикере: entry виден через `UserCaseCatalogService` / client-каталог
   (community ⇒ canApply), title/description честные — «DSP-ансамбль», не нейро.
3. Baseline 650 тестов device-board не ломаем; полный scoped CI:
   `yarn turbo run lint typecheck test --filter=@membrana/device-board --filter=@membrana/client`.
4. CONCEPT §Implementation + тег `comp-comp-detection-alarm-2026-07-10-gamma-final`.

## Risks & mitigations

| Риск | Митигация |
|------|-----------|
| Latent-Sequence lint: impure-узлы на Then-ветках без `supportsAsync` дают pre-run issue | Как в bundled MVP: явный `supportsAsync: true` на всех узлах, достижимых из Then-веток (проверено по generated-документу MVP) |
| `MakeEnsembleAnalysis` кидает на пустом batch → сценарий падает на первом окне | Гейт `IsRecordingWindowFull` (5 c) срабатывает позже первого flush коллектора (3 c) — batch уже есть; топология повторяет канон MVP (ensemble читает те же batches, что MakeTrack) |
| Дубли отчётов при повторных detected-окнах | Идемпотентность по хэшу входов на хосте (basn-5) + отчёт только на detected-ветке (G5) |
| Пороговые значения не сойдутся на живом микрофоне | Все policy сериализованы на узлах (не в коде) — крутятся из инспектора без пересборки; порог явный (G4) |
| Счётчики каталога в чужих тестах (`toBe(8)`) | Правим только device-board catalog-тест — остальные консюмеры без жёстких count (проверено grep) |
| Print-узлы на detected/async путях в latent-ветке | Тоже `supportsAsync: true`; печатают существующие ref (fusion value, track, report) — без новых контрактов |

## Demo narrative (2–3 мин)

По единому Demo script брифа, шаги = цифры на канвасе:

1. **Открытие** (`yarn workspace @membrana/client dev` → device-board → пикер →
   «Gamma · Detection + Alarm (прозрачный сценарий)» → Apply). На канвасе плакат ①–⑥ —
   зритель уже видит маршрут истории.
2. **Пуск** — печать «① поток запущен»; группа ② мигает каждый тик: окно копится, ∞ по
   false-ветке гейта — «сценарий живёт, ничего не случилось».
3. **Дрон-звук ≥15 с** — на очередном окне: группа ③ — trends+ensemble сходятся, печать
   combinedScore/agreement; branch уходит в detected; группа ④ — StopRecording → MakeTrack →
   track-upload (async); печать «④ трек»; группа ⑤ — combined-отчёт в журнале: per-detector
   строки + combinedScore, publish + report-build async, печать «⑤ отчёт». Main-луп при этом
   продолжает тикать — джобы latent.
4. **Тревога** (detection-front): группа ⑥ — живой print тренда «ближе/дальше» обновляется
   на каждом тике alarm.
5. **Тишина ≥15 с** — proximity `lost` → ProximityRef invalid → is-valid false → печать
   «дистанция потеряна» → выход из alarm; main продолжает (видно по тикам ②).
6. **Финал** — `yarn logs:parse`: chain-log показывает, что report-build/track-upload не
   блокировали итерации (main-tick-blocked-ms ровный), onStop гасит стрим и отменяет джобы.

---

## Implementation (заполняется по ходу Phase 2)

- 2α done @ commit: — (заполним после vertical slice)
- 2β done @ commit: — (заполним после full DoD)
