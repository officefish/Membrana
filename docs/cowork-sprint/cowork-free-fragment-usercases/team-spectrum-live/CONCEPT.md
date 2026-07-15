# CONCEPT — Block `spectrum-live`

**FREE · Спектр: живое наблюдение.** Одиночная спектральная модальность, полученная
декомпозицией работающего combined-графа. Наблюдение + отчёт. Без ensemble, без fusion,
без branch-on-detection, без alarm-loop.

| Поле | Значение |
|------|----------|
| Sprint | `cowork-free-fragment-usercases` ([#487](https://github.com/officefish/Membrana/issues/487)) |
| Ветка | `cowork/cowork-free-fragment-usercases/spectrum-live` |
| BASE_SHA | `80d746c6` |
| Каталожный id | `usercase-free-spectrum-live` (запись-заготовка уже в `free-tier-user-case-entries.ts`, **не трогаю**) |
| Билдер | `packages/device-board/src/graph/usercase-free-spectrum-live.ts` → `getFreeSpectrumLiveDocument()` |

---

## 1. Главный тезис

Сценарий — **деривация MVP-канона**, а не ручная сборка. Из
`DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT` берётся **всё**, кроме главного лупа;
`main` пересобирается вычитанием трековой ветви.

Это прямое следствие **L36** журнала недочётов: Alpha не стартовала, потому что была
собрана вручную и назвала точки входа `alpha-*` вместо канонических
`SCENARIO_*_ENTRY`. Beta работает именно потому, что деривирована из канона
байт-в-байт. Я наследую тот же приём.

## 2. Что берётся из канона байт-в-байт

**Не меняется ни один узел** в:

| Ветвь | Состав | Почему без изменений |
|-------|--------|----------------------|
| `initial` | `initial-event` → GetMicrophone → StartStreaming → `fn-1-block` | Точка входа канонична (L36); bootstrap записи нужен как **часы окна** (§4) |
| `onConnect` | `on-connect-event` → isValid(server) → GetJournal ×2 → journal1 | Журнал нужен для PublishReport; логика не спектральная |
| `triggers.onStop` | `on-stop-event` → isValid → StopStreaming | Teardown канона |
| `triggers.onDisconnect` | `on-disconnect-event` → journal1 := GetJournal(device) | Teardown канона |
| `loops.alarm` | `alarm-on-tick` → `alarm-infinity` | **Находка:** в MVP-каноне alarm — уже пустая заглушка (2 узла, 1 ребро). «Без alarm-loop» из брифа = **ничего не делать**, канон уже такой |
| `functions` | `fn-3` (GetAudioStream), `fn-1` (StartRecording) | Обе используются; определения не трогаю → `functionCount` = 2 |
| `variables` | `var-JournalRef-mqm9dl4a-6` (journal1) | Канон |
| `signalGraph` | microphone → fft-analyzer | Канон |

Единственная правка вне `main` — **`meta.title`**.

## 3. Что отбрасывается из `main` (трековая ветвь)

Combined = MVP + детекционная цепочка вместо report-секции. Декомпозиция обратно в
«спектр» = MVP-main **минус всё, что производит трек**, потому что трек — модальность
соседнего блока, а не спектра.

| Удаляемый узел | Почему |
|----------------|--------|
| `node-collect-samples-mqs2lopv-164` | Окно сэмплов питало только `MakeTrack` (и ensemble в combined). Спектру не нужно |
| `node-make-track-mqmcipn5-28` | Трек — не спектральная модальность |
| `node-get-recorder-mqs6hyo6-171` | Питал только `MakeTrack` |
| `node-start-async-job-v20` | Выгрузка трека (`track-upload`) |
| `node-on-async-resolved-v20` | Событие выгрузки трека |
| `node-make-report-from-track-mqs54kgw-177` | Отчёт по треку |
| `board-mqs5v7w1-9c8xw62e` | Второй `PublishReport` (для трек-отчёта) |

**Ensemble / fusion / branch-on-detection / proximity** не удаляются — их в MVP-каноне
нет вовсе; они появляются только в combined-деривации. Вычитать нечего.

## 4. Ключевое решение: рекордер остаётся **часами окна**

Самое неочевидное место блока. Честная формулировка: **в `spectrum-live` запись
остаётся, но только как таймер, и ни один байт звука никуда не идёт.**

**Почему нельзя выбросить рекордер целиком.** Спектральному анализу нужно *окно* —
пачка FFT-кадров. Механика накопления (`packages/device-board/src/runtime/collector-sessions.ts`):

- `collect-fft-frames` кладёт **ровно один** кадр в FIFO очереди анализатора за тик;
- `flush-spectral-analyser` **осушает очередь целиком** и возвращает всё, что накопилось;
- ⇒ **кадров на flush = тиков с прошлого flush**.

Значит, окно = «сколько тиков прошло между flush», и нужен **периодический гейт**. В
`SCENARIO_NODE_KINDS` единственный периодический гейт — `is-recording-window-full`
(host-clock, `elapsed >= windowSec`). Счётчика тиков в палитре нет.

Варианты и выбор:

| Вариант | Что даёт | Вердикт |
|---------|----------|---------|
| A. Рекордер как часы (`is-recording-window-full`, 5 c) | Настоящее окно; каденс канона; ровно так пасует combined | **Выбран** |
| B. flush каждый тик, `measurementsCount: 1` | Нет рекордера | Отброшен: анализ по 1 кадру — вырожденный тренд, отчёт ~2 раза/с — журнал-флуд |
| C. Новый узел-счётчик тиков | Чистое окно без рекордера | **Запрещён брифом** (🚫 новых узлов). Был бы BLOCKER |

Следствия варианта A, зафиксированные честно:

- узлы `fn-1-block` (StartRecording bootstrap), `node-get-recorder-mqs3ir02-168`,
  `node-is-recording-window-full-mqmo40ie-32`, `node-stop-recording-mqmod4yf-35`,
  `fn-3-block-2` (рестарт) остаются;
- `StopRecording` отдаёт `RecordingSliceRef` — он **никуда не подключён** (потребитель
  `MakeTrack` удалён). Slice к тому же пустой: PCM копился через `collect-samples`,
  которого больше нет. Запись = чистый таймер;
- цикл окна сохраняет канон: `then-0` стоп → `then-2` рестарт (**L35**: у каждого
  `stop-recording` обязан быть exec-путь к `start-recording` после себя — путь
  `fn-3-block-2 → fn-1-block` унаследован из канона).

Это **шов для Interface Consilium**: «рекордер как часы» концептуально трогает домен
соседнего блока. Зафиксировано в `EXPECTATIONS.md` (шов 4 брифа — владелец времени).

## 5. Ключевое решение: policy-значения

**Находка, ради которой стоило считать.** `analyzeTrendsFromFftFrames`
(`apps/client/src/modules/device-board/analyzeTrendsFromFftFrames.ts`):

```ts
const subsampled = subsampleFftFramesForTrendsPolicy(frames, policy);
if (subsampled.length < policy.measurementsCount) {
  return null;   // → 'insufficient-subsample'
}
```

Субсэмплер берёт **один кадр на слот и помечает его использованным** (`used`-множество).
Значит требование жёсткое и от `intervalMs` **не зависит**:

> **кадров в batch ≥ `measurementsCount`**, иначе анализа не будет никогда.

А кадров в batch = тиков за окно. Живой каденс тика ~500 мс (журнал **L32**: «тики
10/20/30 — граница 5 c»; `LOOP_TICK_PAUSE_MS = 16` — лишь нижняя граница, реальный тик
задаёт ожидание сэмпла). При окне 5 c ⇒ **≈10 кадров**.

Отсюда policy для `node-make-fft-trends-policy-mqs6wrpr-175`:

| Поле | MVP-канон | `spectrum-live` | Почему |
|------|-----------|-----------------|--------|
| `measurementsCount` | 20 | **5** | Должно быть ≤ кадров за окно (≈10). Запас ×2 к живому каденсу |
| `intervalMs` | 500 | **500** | = каденс тика; расписание слотов ложится на реальные кадры (4×500 = 2 c свежих) |
| `minConfidence` | 0.55 | 0.55 | Канон |
| `minRms` | 0.02 | 0.02 | Канон |
| `enabledTemplateKeys` | DRONE_TIGHT + контр-классы | без изменений | Канон |

> **Наблюдение (не правлю — вне зоны):** канон 20 кадров при ~10 доступных не проходит
> порог субсэмплера — это ровно симптом **L11** (`fft-trends-abort`,
> `reason: 'insufficient-subsample'`). Beta правит `intervalMs` 500→200, но
> `measurementsCount` оставляет 20, т.е. требование по количеству кадров не снимает.
> Combined/MVP — источники только для чтения, их не трогаю; выношу в EXPECTATIONS
> как кандидата в находки консилиума.

## 6. Топология `main` (итог)

```
main-on-tick
  → fn-3-block (GetAudioStream::fn-3)
  → GetSample → GetFFTFrame → CollectFftFrames        ← кадр в очередь анализатора (1/тик)
  → IsRecordingWindowFull (часы окна, 5 c)
      ├─ exec-false-out → ∞                            (окно не набрано — следующий тик)
      └─ exec-true-out  → Sequence (thenCount 3, latentThen)
            ├─ then-0 → StopRecording                  (закрыть окно; slice не потребляется)
            ├─ then-1 → FlushSpectralAnalyser          ← осушает очередь → FftFrameRefList
            │            → isValid (кадры есть?)       ← НОВЫЙ, гейт пустого окна
            │                ├─ true  → MakeFftTrendsAnalysis
            │                │            → isValid (анализ получился?)  ← НОВЫЙ
            │                │                ├─ true  → MakeReportFromAnalysis
            │                │                │            → PublishReport → Print
            │                │                └─ false → (конец ветки)
            │                └─ false → (конец ветки)
            ├─ then-2 → fn-3-block-2 → fn-1-block      (рестарт окна, L35)
            └─ exec-out → ∞
```

Изменения в `Sequence` (`node-sequence-gate-v20-async`): `thenCount` 4 → **3**,
переиндексация then-1(track)-выброшен, then-2(flush)→then-1, then-3(restart)→then-2.
`parallelAsync`/`latentThen` — канон, не трогаю.

### Новые узлы (только `SCENARIO_NODE_KINDS`)

| Id | nodeKind | Зачем |
|----|----------|-------|
| `spectrum-live-frames-gate` | `is-valid` | Гейт пустого окна (**L28**): холодный старт → пустой batch → skip, не смерть ветки |
| `spectrum-live-analysis-gate` | `is-valid` | Гейт `insufficient-subsample`: анализ null → ref invalid → **не публиковать пустой отчёт** (**L11**: `make-report-from-analysis { analysis: null }`) |
| `spectrum-live-print-observation` | `print` | Наблюдаемость: отчёт опубликован |

Оба `is-valid` питаются **нетипизированным** data-ребром (приём Beta `dataUntyped`):
до первого flush store отдаёт invalid-ref дефолтного вида — типизированное ребро
бросило бы `type-mismatch` вместо честного `false` (**L26**).

## 7. Что осознанно НЕ делается

- **Нет новых узлов палитры** — только `SCENARIO_NODE_KINDS`. BLOCKER не потребовался.
- **Не трогаю** `free-tier-user-case-entries.ts` (переключение `loadDocument` — интеграция),
  combined/beta/MVP, registry, barrel-экспорты.
- **Не штампую** `stampCompetitionDocumentMeta`: FREE-шаблон — не competition-форк, а
  `executionPolicy: 'competition'` включает `isCompetitionStructureLocked` → пользователь
  не сможет править свой бесплатный сценарий. Combined наследует штамп транзитивно от
  Beta — **шов для консилиума** (см. EXPECTATIONS).
- **Живой дрон не ищу** — инвариант владельца: живой Run = проверка сборки, не детекции.

## 8. Риски

| # | Риск | Митигация |
|---|------|-----------|
| R1 | Каденс тика на слабой машине > 1 c → < 5 кадров за окно → `insufficient-subsample` | Гейт `spectrum-live-analysis-gate`: пустой отчёт не публикуется, ветка жива. Симптом виден в chain-log |
| R2 | «Рекордер как часы» пересечётся с доменом соседнего блока на интеграции | Вынесено в EXPECTATIONS как шов; адаптер — забота координатора, блок не переписываю |
| R3 | `StopRecording` без потребителя slice выглядит мусором в редакторе | Осознанно: comment-group «Часы окна» объясняет роль на канвасе |
| R4 | Отсутствие штампа competition разойдётся с combined | Шов в EXPECTATIONS; единообразие решает контракт Phase 3 |

## 9. Собственный DoD (проверяется без соседей)

- [ ] `getFreeSpectrumLiveDocument()` → `parseDeviceScenarioDocument` ok (fail-fast внутри билдера)
- [ ] `validateUserCaseDocument` — ноль ошибок
- [ ] Тест фиксирует состав ветвей (initial/onConnect/main/alarm/onStop/onDisconnect)
- [ ] Тест: все `nodeKind` ∈ `SCENARIO_NODE_KINDS`
- [ ] Тест: канонические entry-id (**L36**), нет узлов трековой ветви, policy-значения
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/device-board` зелёный
