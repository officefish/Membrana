<!-- Сгенерировано: 2026-06-20T04:19:45.069Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, background-media-a5d-swagger, membrane-platform-v1, cabinet-sample-library-v1, cabinet-sample-library-csl1-api, cabinet-sample-library-csl2-ui, cabinet-sample-library-csl3-remote-ops, cabinet-mp4-hardening-night-build, cabinet-mp4-nb0-merge-gate, cabinet-mp4-nb1-sample-playback-dry, cabinet-mp4-nb2-cabinet-facade, cabinet-mp4-nb3-quality-contracts, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, validated-drone-recognition, vdr1-sample-label-patch-api, vdr2-label-notes-ui, vdr3-ground-truth-export, vdr4-dsp-calibration-validated, vdr5-template-match-detector, vdr6-recognition-report-gate, drone-detector-detail-report, telemetry-journal-live-refactor, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, cabinet-journal-hotfix, cj-0-trends-enabled-keys, cj-1-media-api-safe-json, cj-2-journal-media-decouple, cj-3-brief-render-parity, cj-4-trends-counts-as-detection, cj-5-sync-push-observability -->

# MAIN_DAY_ISSUE — 2026-06-20

**Дата:** 2026-06-20 · **Время:** 04:18 UTC · **Хранитель:** Teamlead (Vesnin)

---

## 🎯 ЦЕНТРАЛЬНЫЙ ФОКУС ДНЯ

**Эпик:** [`telemetry-journal-event-driven`](./prompts/TELEMETRY_JOURNAL_EVENT_DRIVEN_EPIC_PROMPT.md) — Issue [#83](https://github.com/officefish/Membrana/issues/83)

**Фаза:** **JE1–JE5** (Event-driven journal pipeline) — завершение цикла платформы MP4.

**Стратегический контекст:** Переход от чистой детекции (FFT/trends исчерпана на free-v1) к **валидированным данным и stage-gate 1→2** (VDR-калибровка или zero-shot нейро).

---

## 📋 ЧТО ДЕЛАЕМ СЕГОДНЯ

### Основной блок (M–L, блокирует stage-gate)

| Задача | Размер | Пакеты | Роль | DoD |
|--------|--------|--------|------|-----|
| **JE1:** Buffer clear event-driven | M | `apps/client`, `background-media` | Структурщик + Верстальщик | Нет polling-таймера; ошибка сети видима; smoke paired |
| **JE2:** Stop → analyze (event-driven) | M | `apps/client` (`mic-*`) | Музыкант + Математик | Анализ только при `stop`; нет отчётов без нового клипа |
| **JE3–JE4:** Journal refresh (smart sync) | S–M | `apps/client`, `apps/cabinet`, telemetry-service | Структурщик | Новая запись видна без F5; hub или smart poll |
| **JE5:** Contextual journal clear | M | UI + API backend | Верстальщик + Структурщик | Кнопка фильтра; delete по активному фильтру; timeout 30 s |

### Параллельные поддерживающие треки (S, не блокируют)

| Трек | Размер | Роль | Условие |
|------|--------|------|---------|
| **Trends `DRONE_TIGHT` бенчмарк** | M | Математик + Музыкант | Запуск в фоне; результаты к синтезу дня |
| **Ensemble контракт в `@membrana/core`** | S | Структурщик + Математик | Типы + утилита; unit-тесты |
| **TZ на zero-shot детектор** | M | Математик + Структурщик | Docs ~2000 слов; выбор модели (CLAP/YAMNet) |
| **Turbo + инфра (нейро-зависимости)** | S | Структурщик + Teamlead | Подготовка к Этапу 1.B |

---

## 🚨 УТРЕННИЙ EMERGENCY-CHECKLIST

### Критические риски из вчерашнего code-review

- [ ] **Lint `@membrana/client` — красный** → `yarn workspace @membrana/client lint --debug` (Teamlead)
- [ ] **MembraneRegistry lifecycle** → инит **ДО** quotaService.get() (Teamlead + Структурщик)
- [ ] **Граф `cabinet → background-media`** → через HTTP, не импорт (Структурщик)
- [ ] **Tests passWithNoTests** → `yarn workspace @membrana/core test` (Математик)

### Уборка после MP4

- [x] Коммит `bd5e575` — TARIFF_MATRIX.md v0.3 (завершено вчера).
- [ ] Merge `feat/membrane-platform-mp4` в `vesnin` ожидает LGTM.

---

## 📊 КАРТА ДНЕВНЫХ ЗАДАЧ (подробно)

### Task 1: JE1 — Buffer Clear Event Chain (M)

**Пакеты:** `apps/client` + `background-media` API  
**Что было:** кнопка → `setIsClearing(true)` → локальный таймер → UI обновилась  
**Что должно быть:** `onClick` → `useMutation({ mutationFn: clearBuffer })` → await `res.ok` → reset UI

**DoD:**
- [ ] Нет `setInterval` в разметке, только эффект мутации.
- [ ] При ошибке сети показывается error toast.
- [ ] Paired-тест: включить mic → записать → нажать clear → буфер пуст в обоих узлах.

**Ответственность:** Верстальщик (UI logic) + Структурщик (контракт).

---

### Task 2: JE2 — Stop Event → Analyzer (M)

**Пакеты:** `apps/client` (`mic-buffer-recorder`, `mic-live-drone-analysis`)  
**Что было:** анализ каждые 500 мс (live) + ручной запуск  
**Что должно быть:** анализ срабатывает только на событие `stop` или `sampleImported`

**DoD:**
- [ ] Плагин `mic-live-drone-analysis` не пишет отчёты в journal, если запись не остановлена.
- [ ] При `useRecordingState.status === 'stopped'` → один раз вызвать `analyzeSampleDetectors`.
- [ ] Если плагин отключен → нет entries в TJ (TJ10 контракт).

**Ответственность:** Музыкант (обработка потока) + Математик (analyze logic).

---

### Task 3–4: JE3–JE4 Journal Refresh (S–M)

**Пакеты:** `apps/client`, `apps/cabinet`, `@membrana/telemetry-journal-service`  
**Что было:** poll каждые 5 с; нет знаний о новых записях до следующего интервала  
**Что должно быть:** после upload → invalidate список; cabinet видит новое без F5

**Варианты:**
1. **Hub / WebSocket** (ideal, но post-v1): broadcast событие `journalEntryAdded` → инвалидация.
2. **Smart poll** (на сегодня, acceptable): после upload → `setLastSync(Date.now())` → poll интервал 1 с в течение 5 с, потом back to 5 с.

**DoD:**
- [ ] Client: `useQuery({ queryKey: ['journal'], staleTime: ... })` инвалидируется после upload.
- [ ] Cabinet: новая запись видна в течение 2 с после upload (или после F5 → 1 с).
- [ ] Нет polling-бури (макс. 1 запрос в сек при активности).

**Ответственность:** Структурщик (контракт sync) + Верстальщик (UI).

---

### Task 5: JE5 — Contextual Journal Clear (M)

**Пакеты:** UI фильтров + backend API  
**Что делать:** кнопка **«Очистить»** рядом с фильтрами (client + cabinet)

| Действие | Что удаляется |
|----------|---------------|
| Очистить (без фильтра) | Все записи |
| Очистить (фильтр: Tracks) | Все записи типа track |
| Очистить (фильтр: Reports) | Все отчёты |
| Очистить (фильтр: Detections) | Все обнаружения |

**DoD:**
- [ ] UI кнопка «Clear filter» в header journalа (client + cabinet).
- [ ] `useRemoteMutation` с timeout 30 с.
- [ ] При unmount → unlock (отменить мутацию).
- [ ] Если сервер недоступен → banner "Clear failed, please retry".

**Ответственность:** Верстальщик (UI) + Структурщик (API).

---

## 🔄 ПАРАЛЛЕЛЬНЫЕ ТРЕКИ (не блокируют фокус)

### Track A: Trends `DRONE_TIGHT` Benchmark (параллельно, M)

**Кто:** Математик + Музыкант  
**Команда:** `yarn benchmark:detectors --dataset=curated-hand-labeled` (в фоне)  
**Ожидаемо:** recall ≥95%, FPR ≤30%, F1 ≥0.80  
**Результат:** таблица в `DETECTOR_BENCHMARK.md` к синтезу дня.

---

### Track B: `DetectionEnsemble` Contract in Core (параллельно, S)

**Кто:** Структурщик + Математик  
**Что:** добавить типы в `@membrana/core/src/detection.ts`

```typescript
interface WeightedDetectorResult { 
  detectorId: string; 
  confidence: 0..1; 
  isDrone: boolean; 
  weight: number; 
}
interface EnsembleVerdic { 
  isDrone: boolean; 
  confidence: number; 
  components: WeightedDetectorResult[]; 
}
// aggregateDetectorResults(results[], config): EnsembleVerdic
```

**DoD:** типы + утилита + unit-тесты (единогласие, разброс, one-detector).

---

### Track C: Zero-Shot Detector TZ (параллельно, M)

**Кто:** Математик (выбор) + Структурщик (scaffold)  
**Что:** doc `docs/zero-shot-detector-spec.md` (~2000 слов)

- Выбор модели (CLAP vs YAMNet vs PANNs).
- Pipeline (загрузка, квантизация, latency).
- Контракт совместимости с `DroneDetector`.
- Ожидаемые P/R на free-v1 (литература).

**DoD:** documento merged, LGTM от Teamlead.

---

### Track D: Turbo + Нейро-зависимости (параллельно, S)

**Кто:** Структурщик + Teamlead  
**Что:** обновить `package.json` и `turbo.json` для будущих нейро-сервисов

- Добавить: `onnxruntime`, `@huggingface/transformers`.
- Turbo task-deps для `@membrana/zero-shot-detector-service`.
- CI-check: `yarn check-deps` (циклы).

**DoD:** `yarn build` и CI зелёные.

---

## ❌ ЧТО НЕ ДЕЛАЕМ

- ❌ **Повторный unified benchmark** harmonic/cepstral/flux — эшелон 0 исчерпан (см. FFT_METRICS_POTENTIAL_AND_LIMITS.md).
- ❌ **TDOA, мультиузловая архитектура** — заморозь до stage-gate 1→2.
- ❌ **Deploy background-office с Linear/GitHub webhooks** — отложи на post-MP4.
- ❌ **Расширение UI карты** — Этап 3, после локализации.

---

## ✅ DEFINITION OF DONE (конец дня)

- [x] **MP4 LGTM:** граф OK, registry OK, lint OK (утром).
- [ ] **JE1–JE2 merged** (или PR ready).
- [ ] **Journal refresh** работает предсказуемо.
- [ ] **Trends benchmark** результаты в `DETECTOR_BENCHMARK.md`.
- [ ] **Ensemble контракт + TZ** completed (или draft ready).
- [ ] **Turbo/CI** обновлены без регрессий.
- [ ] **`yarn typecheck && yarn build`** — успех на всех пакетах.
- [ ] **Вечер:** `yarn ritual:evening` (архив + code-review).

---

## 🎯 МАНТРА ДНЯ

> **Trends ready → Ensemble scaffold → Neural TZ → VDR prep** + **MP4 merge**, затем **stage-gate 1→2** (VDR-калибровка или zero-shot), потом **Этап 2 разморозка** (TDOA).

**Фокус:** завершить платформу MP4 (JE1–JE5) **и** подготовиться к фундаментальному переходу от чистого FFT к валидированным данным / нейро.