# CONCEPT — Block `sample-recording`

> Cowork Sprint `cowork-free-fragment-usercases` (#487), Phase 1.
> Блок: **FREE · Библиотека сэмплов: записи**.
> Файл графа: `packages/device-board/src/graph/usercase-free-sample-library.ts`
> (имя файла и id каталога — `usercase-free-sample-library`, историческое; слаг блока — `sample-recording`).

---

## 1. Что это за сценарий (одной фразой)

Микрофон пишет звук окном 5 с, каждое полное окно превращается в **трек**, трек
асинхронно выгружается и **публикуется отчётом в журнал**. Больше сценарий не
делает ничего: ни спектра, ни нейро, ни fusion, ни тревоги.

Это **поставщик записей** для клиентского модуля «Библиотека сэмплов». Граф —
источник материала; всё, что происходит с материалом дальше (коллекция, импорт,
разметка, прогон детекторов по коллекции), живёт вне графа.

## 2. Решение владельца, из которого следует резка (2026-07-15)

> Граф = **ТОЛЬКО ЗАПИСЬ**. Управление коллекцией, импорт и разметка — существующий
> клиентский модуль «Библиотека сэмплов», вне графа.

Причина решения (и она же — причина, по которой я не пытаюсь хитрить): **в палитре
нет узлов работы с коллекцией**, а новых узлов вводить нельзя (brief §Constraints 1).
Смоделировать коллекцию из `variable-set`/`print`/`sequence` — это изобрести
полуузел коллекции обходным путём, то есть нарушить запрет по духу, сохранив по
букве. Не делаю. Граница проведена в §6.

## 3. Топология: деривация MVP, вычитанием

Базис — `DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT` (v2.0-async), паттерн деривации
взят у Beta (`usercase-detection-alarm-beta.ts`): `structuredClone` канона →
трансформации → fail-fast `parseDeviceScenarioDocument` → кэш инстанса.

**Ключевое отличие от соседей по резке:** Beta и спектральные/нейро-блоки
дериваируют MVP **заменой** report-секции на свою цепочку. Мой блок дериваирует
**чистым вычитанием**: у MVP уже есть ровно та запись-цепочка, которую заказал
владелец, — её надо не построить, а **освободить** от детекционной ветви.
Новых узлов мой граф не добавляет **вообще ни одного** (см. §8).

### 3.1 Ветви документа

| Ветвь | Что делаю | Почему |
|-------|-----------|--------|
| `initial` (onStart) | **байт-в-байт MVP** | `GetMicrophone → StartStreaming → fn-1-block`. `fn-1` = `GetRecorder + MakeRecordingPolicy → StartRecording (bootstrap)` — это и есть заказанные владельцем `GetRecorder → StartRecording`, уже собранные каноном. Строить их заново на main — значит потерять L22 (без bootstrap на onStart окно никогда не полно) |
| `onConnect` | **байт-в-байт MVP** | Ссылка на журнал (сервер доступен → серверный, иначе локальный). Без `JournalRef` публиковать запись некуда |
| `loops.main` | **вычитание** (§3.2) | Единственная ветвь, которую трогаю |
| `loops.alarm` | **байт-в-байт MVP** | В каноне alarm — это `alarm-on-tick → alarm-infinity` и всё. Пустой луп = «без alarm-loop» по заказу. Пересобирать его нечем и незачем |
| `triggers.onStop` | **байт-в-байт MVP** | `isValid → StopStreaming` |
| `triggers.onDisconnect` | **байт-в-байт MVP** | Сброс `JournalRef` |
| `functions` (`fn-1`, `fn-3`) | **байт-в-байт MVP** | `fn-3` = `GetAudioStream` (микрофон → поток, со `StopRuntime` на невалидном), `fn-1` = bootstrap записи |
| `variables` | **байт-в-байт MVP** | `var-JournalRef-mqm9dl4a-6` |
| `signalGraph` | **байт-в-байт MVP** | Микрофон → fft-analyzer; сигнальный слой вне scope блока |

**L36 закрыт наследованием:** все 6 точек входа (`initial-event`, `on-connect-event`,
`main-on-tick`, `alarm-on-tick`, `on-stop-event`, `on-disconnect-event`) приходят из
канона неизменёнными — ровно тот механизм, за счёт которого Beta не страдала L36, а
собранная вручную Alpha страдала.

### 3.2 Main: что остаётся и что снимается

Цепочка после вычитания (ровно заказ владельца):

```
main-on-tick
  → fn-3-block (GetAudioStream)
  → GetSample
  → CollectSamples (окно 3 с)                     ← recorder от GetRecorder
  → IsRecordingWindowFull (окно 5 с)              ← recorder от GetRecorder
      ├─ false → ∞
      └─ true  → Sequence (latent, thenCount 3)
                  ├─ then-0 → StopRecording → slice
                  ├─ then-1 → MakeTrack → StartAsyncJob(track-upload)
                  │             → promise → OnAsyncResolved
                  │               ⇒ (event) MakeReportFromTrack → PublishReport
                  ├─ then-2 → fn-3-block-2 → fn-1-block   (рестарт записи)
                  └─ exec-out → ∞
```

**Снимаются 9 узлов main** (`REMOVED_MVP_MAIN_NODE_IDS`):

| Узел | Почему снят |
|------|-------------|
| `node-make-fft-trends-analysis-mqs6vdme-174` | детектор — запрещён заказом |
| `node-make-fft-trends-policy-mqs6wrpr-175` | policy снятого детектора |
| `node-flush-spectral-analyser-mqs6tcs6-172` | flush ради снятого детектора |
| `node-get-spectral-analyser-mqs6uey7-173` | анализатор для снятого flush |
| `node-make-report-from-analysis-mqma356z-34` | отчёт снятого анализа |
| `node-publish-report-mqma49xv-35` | публикация отчёта снятого анализа |
| `node-get-fft-frame-mqs3h75e-166` | FFT-кадры кормили только детекцию |
| `node-collect-fft-frames-mqs3hhnu-167` | окно FFT-кадров — то же |
| `node-get-spectral-analyser-mqs3gj4q-165` | анализатор для снятого collect-fft-frames |

**Спорное решение и его обоснование.** Первые шесть — очевидная детекция. Последние
три (`GetFFTFrame`/`CollectFftFrames`/`GetSpectralAnalyser` на горячем пути тика)
сами по себе детекцией **не являются** — это спектральный сбор. Снимаю их всё равно:
после удаления trends их выход **никто не потребляет**. Оставить их — значит
каждый тик считать FFT в никуда: мёртвый вес, ложный сигнал читателю графа
(«тут что-то про спектр»), и прямое пересечение с языком блока `spectrum-live`,
которому спектр принадлежит по резке brief. Запись сэмплов в них не нуждается:
`CollectSamples` кормится `GetSample` напрямую.

**Рёбра-последствия вычитания:**

- `exec: GetSample → CollectSamples` — **единственное новое ребро графа**. В MVP
  тик шёл `GetSample → GetFFTFrame → CollectFftFrames → CollectSamples`; сняв
  середину, сшиваю концы. Не новый узел и не новая семантика — та же цепочка тика
  минус спектральный сбор.
- `Sequence.sequenceConfig.thenCount: 4 → 3`, ребро рестарта перевешивается
  `then-3 → then-2`. Причина: старый `then-2` вёл во `flush-spectral-analyser`.
  Оставить `thenCount: 4` с дырой на `then-2` — это `sequence-then-skip` каждое
  окно (симптом из L23) и pin в никуда на канвасе. Перенумеровываю плотно.
- Рёбра снятых узлов уходят фильтром `source/target ∈ removed` (паттерн Beta).

**Что НЕ трогаю, хотя соблазн есть:** `node-device-global-mqm0q2fd-14` и
`node-device-global-mqs6hsz3-170` остаются — после вычитания каждый всё ещё кормит
свой `GetRecorder` (`mqs3ir02-168` → collect/gate/stop, `mqs6hyo6-171` → MakeTrack).
Два recorder-геттера в каноне — не дубль, а осознанная развязка (L6).

### 3.3 Comment groups

Снимаю группы MVP, пересекающиеся со снятыми узлами (`group-3` «Отрывок звука»,
`group-6` «Публикация отчетов», `group-7` «Создаем анализ»); остальные канон-группы
живут (`group-1` журнал, `group-2` микрофон, `group-4` создание трека, `group-5`
данные для трека, `group-8` рестарт записи). Взамен снятых добавляю две своих:
`sample-recording-group-capture` (отрывок звука — теперь только `GetSample`) и
`sample-recording-group-publish` (`MakeReportFromTrack` + `PublishReport` — публикация
записи). Группы — единственное, что я «пишу» помимо вычитания, и они текстовые.

## 4. Policy-значения записи

Обе policy наследуются из канона **байт-в-байт**, тюнинг не делаю:

| Параметр | Значение | Откуда / почему |
|----------|----------|-----------------|
| `StartRecording (bootstrap)` + `MakeRecordingPolicy` в `fn-1` | `windowSec: 5`, `captureFormat: 'wav'` | канон MVP. WAV = формат, который «Библиотека сэмплов» и разметка ждут от записи |
| `IsRecordingWindowFull` | `recordingPolicy: { windowSec: 5, captureFormat: 'wav' }` | канон; гейт обязан совпадать с политикой старта, иначе окно «полно» не по той арифметике |
| `CollectSamples` | `windowSec: 3`, `bufferSize: 2048`, `queueCapacity: 10`, `smoothingTimeConstant: 0.75` | канон. Инвариант окон: flush сэмплов (3 с) **строго раньше** гейта записи (5 с) — к моменту `true` на гейте в `batches` лежит заполненное окно, `MakeTrack` не получает пустоту |

Почему не трогаю: brief §Out of scope прямо запрещает DSP-тюнинг и изменение
порогов, а живой Run у меня — **проверка сборки, не детекции** (§Constraints 3):
подбирать длину окна нечем и не по чему. 5 с — дефолт FREE, доказанный живьём в
combined UC (#416).

## 5. Ветви записи и L-журнал

Что журнал недочётов говорит именно про эту цепочку и как это учтено:

| L | Риск | Как закрыт |
|---|------|-----------|
| **L36** | точки входа названы не канонически → сценарий не стартует | деривация MVP байт-в-байт, ни один event-узел не переименован (§3.1) |
| **L22** | нет bootstrap на onStart → окно записи никогда не полно | `fn-1-block` в `initial` сохранён |
| **L35** | `StopRecording` в цикле без пути к `StartRecording` после себя → одноразовая запись | рестарт остаётся на **своей** Then-ветке (`then-2 → fn-3-block-2 → fn-1-block`) — канон MVP, живой в prod. NB: L35 предупреждает, что порядок latent-веток не гарантирован; в каноне рестарт живёт отдельной веткой, а не хвостом — **эту топологию я не меняю осознанно**, менять её = переписывать канон, а не резать блок. Риск записан в §7 |
| **L18** | второй цикл гейта даёт пустой blob (recorder снят) | закрыт хостом (`startRecorderRecording` re-arm), не графом |
| **L19/L25** | async-выгрузка внутри collapsed function / rejected job | `track-upload` — канон MVP, `report-build` (реджектившийся вид) в моём графе **отсутствует** |
| **L23** | осиротевший `then-N` после снятия узлов | перенумеровал `thenCount 4 → 3`, дыр нет (§3.2) |
| **L26/L28** | invalid-ref / пустое окно на холодном старте | детекторов нет; `MakeTrack` кормится флашем `CollectSamples` — путь, проверенный live |

## 6. Граница «граф пишет / клиентский модуль управляет»

```
┌─ ГРАФ (мой блок) ───────────────┐   ┌─ КЛИЕНТСКИЙ МОДУЛЬ «Библиотека сэмплов» ─┐
│ окно 5 с → StopRecording        │   │ коллекция (создать/переименовать/удалить)│
│ → MakeTrack → TrackRef          │──▶│ импорт WAV извне                         │
│ → track-upload (async)          │   │ разметка (label round-trip)              │
│ → MakeReportFromTrack           │   │ прогон детекторов по коллекции           │
│ → PublishReport → журнал        │   │ экспорт меток в manifest                 │
└─────────────────────────────────┘   └──────────────────────────────────────────┘
        точка передачи: TrackRef, опубликованный отчётом в журнал
```

Граф **не знает** слова «коллекция». Он кладёт трек в журнал; модуль читает журнал.
Всё, что правее точки передачи, — вне графа, вне моей зоны и вне этого спринта
(brief §Out of scope: «Прогон детекторов по импортированной коллекции», «Разметка/импорт
коллекции в графе»).

## 7. Риски (честно)

1. **`thenCount 3` — правка канонической последовательности.** Перенумерация
   `then-3 → then-2` меняет канон MVP в одном месте. Альтернатива (дыра на `then-2`)
   хуже. Если интеграция обнаружит, что кто-то опирается на номер `then-3` MVP, — это
   адаптер на шве, не переписывание блока.
2. **L35 у рестарта на latent-ветке.** Наследую канон; если живой Run покажет
   одноразовую запись — фикс = перенос рестарта в хвост ветки `then-1` (как чинили
   Gamma в #347). Это правка **канона**, а не моего блока → в таком случае BLOCKER
   /вопрос координатору, не тихая правка.
3. **Каталожная карточка не моя.** `free-tier-user-case-entries.ts` в изолированной
   фазе не трогаю; `loadDocument` переключит интеграция. Значит собственный DoD
   **не** может проверить монтирование в лайнап — только сам документ. Так и заявляю.
4. **Живой Run.** Борд держит старый снапшот → сценарий пересоздавать из пикера
   (L-журнал). Живой дрон не ищу — не гейт (brief §Out of scope).

## 8. Гард «без новых узлов»

Мой граф добавляет **ноль** узлов к канону: только удаляет узлы, сшивает одно
exec-ребро и перевешивает одно. Следовательно `nodeKind ∈ SCENARIO_NODE_KINDS`
выполняется тривиально — но тест это фиксирует явно (§DoD), потому что гард нужен
против будущих правок, а не против сегодняшней.

Использованные виды узлов (все — зарегистрированные): `event`, `loop-repeat`,
`device-global`, `get-microphone`, `start-streaming`, `stop-streaming`,
`get-audio-stream`, `get-sample`, `get-recorder`, `collect-samples`,
`is-recording-window-full`, `stop-recording`, `start-recording`,
`make-recording-policy`, `make-track`, `sequence`, `start-async-job`,
`on-async-resolved`, `get-journal`, `get-reporter`, `make-report-from-track`,
`publish-report`, `is-valid`, `variable-get`, `variable-set`, `stop-runtime`,
`function-input`, `function-output`.

## 9. Собственный DoD (без соседей)

- [ ] `getFreeSampleLibraryDocument()` → документ проходит `parseDeviceScenarioDocument` (fail-fast внутри билдера)
- [ ] `validateUserCaseDocument` — ноль ошибок
- [ ] тест фиксирует **запись-цепочку** (GetRecorder→StartRecording→гейт→Stop→MakeTrack→async→PublishReport)
- [ ] тест фиксирует **отсутствие детекционных узлов** (trends/ensemble/fusion/branch/proximity/combined-report/flush/spectral-analyser)
- [ ] тест фиксирует `nodeKind ∈ SCENARIO_NODE_KINDS` по всем ветвям и функциям
- [ ] тест фиксирует канонические entry-id (L36) и bootstrap `fn-1` в `initial` (L22)
- [ ] документ гидратируется (`hydrateBoardFromDocument`)
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/device-board` зелёный
