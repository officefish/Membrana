# CONCEPT — Block `neuro-detection`

> Cowork Sprint `cowork-free-fragment-usercases` (#487), Phase 1.
> FREE · Нейро-детекция (yamnet) — одиночная **нейро**-модальность, полученная
> декомпозицией работающего combined-графа.
> Формат: [`COWORK_SPRINT_REGULATION.md`](../../../COWORK_SPRINT_REGULATION.md) ·
> Brief: [`COWORK_SPRINT_BRIEF.md`](../COWORK_SPRINT_BRIEF.md)

---

## 1. Что это за сценарий изнутри

Пользователь FREE ставит микрофон и получает **один вопрос и один ответ**:
«слышит ли нейросеть дрон прямо сейчас?». Никакого слияния модальностей,
никакого спектрального контекста, никакой тревоги — только нейро-канал и
честная запись результата в журнал.

Продуктовая формулировка: **«нейро-детектор в чистом виде»**. Ценность —
дать увидеть вклад ОДНОЙ модальности отдельно от combined UC, где нейро
растворён в `combinedScore`. Combined отвечает «сколько всего»; этот UC
отвечает «сколько именно от нейро».

**Единица работы** — окно записи (5 с, канон MVP): каждое закрытое окно даёт
ровно один нейро-вердикт и ровно один отчёт.

---

## 2. Приём резки: деривация, не ручная сборка

Документ строится **деривацией** от `DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT`
(`structuredClone` → трансформации → fail-fast `parseDeviceScenarioDocument` →
кэш) — тем же приёмом, что `usercase-detection-alarm-beta.ts`.

Это не стилистика, а **прямое следствие L36**: канонические id точек входа
(`initial-event`, `on-connect-event`, `main-on-tick`, `alarm-on-tick`,
`on-stop-event`, `on-disconnect-event`) заданы константами в
`initial-board-state.ts`. Alpha собрали событийную обвязку вручную и назвали
узлы `alpha-*` → сценарий не стартовал вообще. Beta живёт, потому что
наследует канон байт-в-байт. Деривация = наследование → **L36 неприменим
по конструкции**.

---

## 3. Что берётся из combined байт-в-байт

| Что | Откуда | Почему сохранено |
|-----|--------|------------------|
| `initial` (bootstrap записи, `fn-1`) | MVP-канон | запись обязана стартовать, иначе окно не наполнится (**L22**) |
| `onConnect` (журнал, `JournalRef` в переменной) | MVP-канон | без журнала отчёт некуда публиковать |
| `triggers.onStop` / `onDisconnect` (teardown) | MVP-канон | канонический teardown |
| `functions` `fn-1` / `fn-3` | MVP-канон | точки входа main зависят от `fn-3-block` (**L20**) |
| `variables` (`JournalRef`) | MVP-канон | — |
| main: `onTick → fn-3 → GetSample → CollectSamples → IsRecordingWindowFull` | MVP-канон | окно сэмплов — **вход нейро-канала** |
| main: `Sequence(then-0..3)`, `StopRecording`, `MakeTrack`, `StartAsyncJob(track-upload)`, рестарт записи через `then-3 → fn-3-block-2 → fn-1-block` | MVP-канон | **L35**: каждый `stop-recording` в цикле обязан иметь exec-путь к `start-recording` ПОСЛЕ себя — канон MVP это уже обеспечивает, трогать нельзя |
| ветвь `MakeEnsembleAnalysis` ← `CollectSamples.batches` (`AudioSampleRefList`) | combined (Beta, `BETA_MAIN.ensemble`) | **это и есть нейро-канал**: в combined именно ensemble несёт yamnet |
| секция combined-отчёта: `MakeCombinedReport → StartAsyncJob('report-build') → Print`, `OnAsyncResolved ⇒ PublishReport → Print` | combined (Beta) | **L25**: `report-build` детачится хостом, main loop не блокируется |
| `alarm` = MVP-заглушка (`alarm-on-tick → alarm-infinity`) | MVP-канон | alarm-лупа нет **по брифу**, но узел `alarm-on-tick` обязан существовать (**L36**) |

## 4. Что отбрасывается

| Что | Почему |
|-----|--------|
| `MakeFftTrendsPolicy` + `MakeFftTrendsAnalysis` | ветвь `trends` = **спектральная** модальность, не моя (бриф: «БЕЗ trends») |
| `FlushSpectralAnalyser`, оба `GetSpectralAnalyser`, `GetFFTFrame`, `CollectFftFrames` | вся FFT-машинерия существует **только чтобы кормить trends**; нейро-канал питается сэмплами (`AudioSampleRefList`), кадры не читает. Оставить их — оставить мёртвый спектральный контур в «чистой нейро»-модальности |
| `MakeDetectionFusion` | нечего сливать: модальность одна (бриф: «БЕЗ fusion») |
| `BranchOnDetection` | без fusion нет `combinedScore`; порог/ветвление — предмет combined UC, здесь их нет (бриф: «БЕЗ branch-on-detection») |
| alarm-loop (`MakeProximityTrend`, `is-valid` цели, tracking/lost) | бриф: «БЕЗ alarm-loop»; наблюдение, не тревога |
| report-секция MVP (`MakeReportFromAnalysis`, оба `PublishReport`, `MakeReportFromTrack`) | заменяется нейро-отчётом (тот же приём, что Beta `REPLACED_MVP_MAIN_NODE_IDS`) |

**Следствие отбрасывания FFT** — одна перепайка exec (единственная в блоке):
`GetSample → CollectSamples` напрямую (было `GetSample → GetFFTFrame →
CollectFftFrames → CollectSamples`). Данные не страдают: `CollectSamples`
берёт `recorder` + `sample`, кадры ему не нужны.

---

## 5. Ветви

| Ветвь | Состав | Отличие от MVP/combined |
|-------|--------|-------------------------|
| **`initial`** | bootstrap записи (`fn-1`) | байт-в-байт MVP |
| **`onConnect`** | журнал → `JournalRef` | байт-в-байт MVP |
| **`main`** | `onTick → fn-3 → GetSample → CollectSamples → IsRecordingWindowFull`; `false → ∞`; `true → Sequence`: `then-0` StopRecording, `then-1` MakeTrack → track-upload job, **`then-2` нейро-цепочка (моя)**, `then-3` рестарт записи; `exec-out → ∞` | заменён только `then-2` + удалена FFT-машинерия |
| **`alarm`** | `alarm-on-tick → alarm-infinity` | заглушка MVP; **лупа нет by design** |
| **`onStop`** | teardown | байт-в-байт MVP |
| **`onDisconnect`** | teardown | байт-в-байт MVP |

### Нейро-цепочка (`then-2`, ядро блока)

```
Sequence[then-2] → MakeEnsembleAnalysis ← CollectSamples.batches (AudioSampleRefList)
                        │ analysis : EnsembleAnalysisRef
                        ↓
                   isValid (модель ответила?)          ← untyped data-ребро
                    ├── true  → MakeCombinedReport(reporter, analysis-1=нейро, track)
                    │             → StartAsyncJob('report-build') → Print «нейро-детекция»
                    │           OnAsyncResolved ⇒ PublishReport → Print «нейро-отчёт»
                    └── false → Print «⚠️ нейро-модель недоступна — вердикта нет»
```

Плюс наблюдаемость выгрузки трека: `OnAsyncResolved(track-upload) ⇒ Print
«трек выгружен»` (замена MVP-`MakeReportFromTrack`, как у Beta — трек уже
входит в отчёт).

---

## 6. Key decisions

### N1 — Отчёт строит `MakeCombinedReport`, хотя анализ один

Не вольность, а **единственный вариант из зарегистрированных узлов**:

- `make-report-from-analysis` имеет пин `analysis` типа `FftTrendAnalysisRef`;
  `isValidSocketConnection` пропускает union только на вход
  `DetectionAnalysisRef` → `EnsembleAnalysisRef → FftTrendAnalysisRef`
  **невалиден**;
- `make-combined-report` имеет `analysis-1`/`analysis-2` типа
  `DetectionAnalysisRef` → нейро-анализ принимает.

`analysis-2` **молчит by design** — ровно тот же санкционированный приём, что
`fusion(trends-only)` в alarm-лупе Beta (её CONCEPT B6). Валидатор не требует
подключения всех data-пинов (`validate-block-links`).

Альтернатива «завести узел `make-report-from-ensemble`» = новый узел палитры =
**запрещено брифом** (и не нужно: узел есть).

### N2 — Честный fallback = видимая метка, не молчаливая деградация

В combined UC при недоступной модели ансамбль **честно откатывается на
спектр** — есть на что откатываться. В одиночной нейро-модальности откатываться
не на что: отсутствие модели = **отсутствие вердикта**, и пользователь обязан
это увидеть.

Механика — существующими узлами, без единого нового:

- `MakeEnsembleAnalysis` при недоступной модели **не пишет store** и оставляет
  ref невалидным (**L28**: skip, не throw; **L26**: invalid-ref несёт целевой
  kind);
- `is-valid` на `analysis` разводит exec: `true` → отчёт, `false` → `Print
  «⚠️ нейро-модель недоступна»`;
- **false-ветка отчёт не публикует** — пустой/фиктивной записи в журнале не
  появляется. Молчание вместо вердикта — только с явной меткой в логе.

Ребро `analysis → isValid.value` — **нетипизированное** (`dataUntyped`, приём
Beta B8/L4): пин `value` у `is-valid` без socketType, а типизированное ребро
на холодном старте дало бы type-mismatch вместо честного `false`. Тип
проверяет типизированное ребро потребителя (`MakeCombinedReport.analysis-1`),
которое исполняется только на true-ветке.

Тот же гейт покрывает **холодный старт** (`empty-window`, L28) — первые тики
без красного экрана.

### N3 — Порогов в блоке нет

`minConfidence` жил в `FftTrendsPolicy` (trends); у `MakeEnsembleAnalysis`
policy-узла нет — вердикт формирует хост. Порог `BranchOnDetection` — предмет
combined UC. **Этот UC порогами не управляет и их не переопределяет**
(бриф §Out of scope: «любой DSP-тюнинг, изменение порогов»).

### N4 — Окна и каденс не трогаю

`CollectSamples.windowSec = 3`, окно записи 5 с, `Sequence.thenCount = 4` —
канон MVP, наследуются. **Владелец времени в этом блоке — MVP-канон**, блок
своих окон не вводит (важно для шва №4 контракта Phase 3).

### N5 — `stampCompetitionDocumentMeta`

Как у Beta (и, следовательно, у живого combined UC): bundled-шаблон
структурно залочен, параметры остаются редактируемыми. Консистентность
лайнапа важнее оригинальности.

---

## 7. Риски

| # | Риск | Митигация |
|---|------|-----------|
| R1 | Перепайка `GetSample → CollectSamples` — единственное отступление от канона MVP в цепочке добычи | покрыто тестом (exec-ребро есть; FFT-узлов и их рёбер нет); данные `CollectSamples` от кадров не зависят |
| R2 | `MakeCombinedReport` с одним анализом на живом хосте может повести себя иначе, чем с двумя | прецедент Beta (`fusion` с молчащим входом) живой; **живой Run = проверка сборки, не детекции** (бриф §Constraints 3) |
| R3 | Нейро (yamnet) в проде живёт в ensemble-ветви; при недоступной модели ветвь молчит | это и есть N2 — сценарий не падает, а показывает метку |
| R4 | Comment-группы MVP, потерявшие узлы (`group-3`/`group-6`/`group-7`), отбрасываются целиком (приём Beta) | взамен — свои группы на нейро-цепочку и нейро-отчёт |

## 8. Чего в блоке НЕТ (явно)

Новых `nodeKind`; правок `free-tier-user-case-entries.ts`; правок combined/beta/MVP;
fusion; branch-on-detection; trends; alarm-лупа; порогов; drone-smoke.
