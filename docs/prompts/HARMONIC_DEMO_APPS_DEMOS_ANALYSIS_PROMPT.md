# Промпт: анализ альтернативного демо `apps/demos` и перенос UX в harmonic lab

> **Аналитический task-промпт** (Cursor / LLM): сравнение Replit-прототипа с эталоном `packages/services/detectors/harmonic/demo/`, выводы и задание на доработку UI.  
> Размер доработки после анализа: **S–M** · ожидаемый артефакт: **1 PR** (только demo + опционально расширение контракта детектора).  
> Связь: Issue **#45** фаза 2+, не заменяет [`HARMONIC_DETECTOR_STANDALONE_DEMO_PROMPT.md`](./HARMONIC_DETECTOR_STANDALONE_DEMO_PROMPT.md).

---

## Контекст

В репозитории есть **два** варианта «Harmonic Drone Lab»:

| Расположение | Статус | Назначение |
|--------------|--------|------------|
| `packages/services/detectors/harmonic/demo/` | **Эталон Membrana** | Co-located demo, `@membrana/harmonic-detector-service`, [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md) |
| `apps/demos/Harmonic-Detector/artifacts/harmonic-lab/` | **Альтернативный прототип** (Replit export, pnpm) | Отдельный UI-эксперимент, встроенный `lib/harmonicDetector.ts` |

Папка `apps/demos/Harmonic-Detector/` **не** подключена к Yarn workspaces Membrana; в `.gitignore` корня её стоит держать как reference или вынести в отдельный PR после санитизации (без `node_modules/`, `.local/`, `.git/` Replit).

**Цель документа:** зафиксировать, что в прототипе полезно перенести в эталонное demo (и далее в плагин клиента), а что сознательно **не** переносить.

---

## Краткий вывод (для постановщика)

1. **Да, идея «отдельных гармоник» в UI интересна** — в прототипе это не отдельные файлы-компоненты, а паттерн **chip-grid** (`FundamentalsList` → `freq-chip` с метками `H1`, `H2`, …). Для lab/demo это лучше одной строки «120 Гц, 240 Гц».
2. **Чтобы chips имели смысл**, API детектора должен отдавать **список найденных гармоник** (частоты k·f0), а не только merged `fundamentalsHz` (сейчас часто одна несущая). Иначе chips придётся синтезировать в UI без SNR — хуже для отладки.
3. **Сильные переносимые UX-идеи:** маркер порога на полосе confidence, пульсирующий индикатор статуса, бейджи состояния микрофона, лабораторная тёмная тема (CSS variables), крупная типографика confidence.
4. **Не переносить:** дублирующий DSP в `lib/harmonicDetector.ts`, collapse для reasoning/fundamentals (противоречит [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md)), сырой `detected && confidence > threshold` без `DetectionSmoother`.

---

## Что проанализировано

### `artifacts/harmonic-lab` (основное демо)

Структура (смысловые файлы):

```text
artifacts/harmonic-lab/src/
├── App.tsx
├── index.css                    # лабораторная тема, pulse, chips
├── hooks/useLiveHarmonicDetection.ts
├── lib/harmonicDetector.ts      # ⚠ дубликат math — не эталон
└── components/
    ├── DetectionStatus.tsx
    ├── ConfidenceMeter.tsx
    ├── ReasoningPanel.tsx       # collapse
    ├── FundamentalsList.tsx     # chip-grid гармоник
    └── MicControls.tsx
```

### `artifacts/mockup-sandbox`

Сервер превью отдельных mockup-компонентов Replit — **не** часть harmonic UX. Для Membrana не релевантен, кроме идеи изолированного preview (у нас уже есть `dev:demo`).

---

## Сравнение с эталоном Membrana

| Область | `apps/demos` harmonic-lab | `harmonic/demo` (эталон) | Вердикт |
|---------|---------------------------|--------------------------|---------|
| Классификатор | Локальный `classifySpectrum` в demo | `@membrana/harmonic-detector-service` + FFT | Оставить эталон |
| Микрофон | `getUserMedia` + `AnalyserNode` + rAF | `useMicrophone` + `audioWindowFromFrame` | Оставить эталон |
| Сглаживание UI | Нет (порог в `DetectionStatus` на сыром confidence) | `DetectionSmoother` EMA + гистерезис + 3/6 кадров | Оставить эталон |
| Гармоники в UI | Chip-grid `H1…Hn` | Одна строка «Гармоники: …» | **Перенести chips** (после данных) |
| Reasoning | Collapse «АНАЛИЗ» | Статическая строка, `line-clamp-2` | Оставить эталон |
| Confidence | Крупные %, **линия порога** на треке | DaisyUI progress, без маркера порога | **Перенести маркер порога** |
| Статус | Пульс + подзаголовок «Мультирототорный сигнал» | `alert` + transition 500ms | **Частично перенести** (pulse + subtitle) |
| Микрофон UI | Бейджи idle / listening / live-dot | Текст в `MicControls` | **Перенести бейджи** |
| Вёрстка | `min-height: 100vh`, кастомный CSS | `h-full` + `overflow-hidden` | Свести к `LIVE_DETECTION_UI` |
| Семантика `fundamentals` | До 6 **гармоник** серии (k·f0) при detection | `fundamentalsHz` — merged несущие | **Расширить API** (см. ниже) |

---

## Детальный разбор: гармоники как «компоненты»

### Как сделано в прототипе

`FundamentalsList.tsx`:

- Пустое состояние: панель «ЧАСТОТЫ — нет данных».
- При данных: collapsible заголовок + сетка chips.
- Каждый chip: `H{i+1}` + значение в Гц (`freq-chip`, `freq-index`, `freq-value` в `index.css`).

Это **не** отдельный React-файл на каждую гармонику, а **один списочный компонент + presentational chip** — правильная грануляция для React.

### Почему это хорошее дополнение

- **Отладка в поле:** оператор видит, какие именно k·f0 «зажглись», а не только f0.
- **Связь с reasoning:** текст «N гармоник» становится проверяемым глазами.
- **Переиспользование:** `HarmonicChip` + `HarmonicChipList` пригодны в плагине клиента (фаза 3 #45) и в header sensor (compact mode).

### Ограничение текущего эталона Membrana

`classifySpectrum` возвращает `fundamentals` через `mergeFundamentals([bestFundamental])` — обычно **одна** частота. Chip-grid из одного элемента слабо оправдан.

В прототипе `lib/harmonicDetector.ts` в `fundamentals` кладётся `bestHarmonicsFound.slice(0, 6)` — список **подтверждённых гармоник** по SNR.

**Рекомендация по контракту (фаза 1.1, опционально):**

```ts
// packages/services/detectors/base или HarmonicSpectrumResult
harmonicsHz?: readonly number[];  // k·f0, прошедшие порог в scoreHarmonicStack
fundamentalsHz?: readonly number[]; // как сейчас — несущие после merge
```

Заполнять `harmonicsHz` в `scoreHarmonicStack` / `classifier.ts` без изменения логики `isDrone`.

---

## Что ещё стоит перенести (приоритет)

### P0 — только demo, без изменения сервиса

| Идея | Источник | Действие в эталоне |
|------|----------|-------------------|
| Маркер порога на progress | `ConfidenceMeter.tsx` + `.confidence-threshold` | Добавить вертикальную метку `left: threshold%` в `demo/components/ConfidenceMeter.tsx` |
| Бейджи микрофона | `MicControls.tsx` `.badge.*`, `.live-dot` | Расширить `MicControls` (DaisyUI `badge` + анимация dot) |
| Подзаголовок статуса | `DetectionStatus` `.status-sub` | Вторая строка под «Дрон обнаружен» (короткий reasoning или «Мультироторный сигнал») |

### P1 — demo + тонкое расширение API

| Идея | Действие |
|------|----------|
| Chip-grid гармоник | `HarmonicChip.tsx`, `HarmonicChipList.tsx`; данные из `harmonicsHz` |
| Крупный % confidence | Опциональный режим «lab»: `text-3xl font-mono` над полосой |
| Пульс при detection | CSS `pulse-ring` на статусе (без framer-motion), только когда `stableIsDrone` |

### P2 — polish / docs

| Идея | Действие |
|------|----------|
| Лабораторная палитра | Перенести **идею** CSS variables в DaisyUI theme preset demo (`data-theme`) или документировать в `DESIGN.md` § lab |
| Header badge | Строка `DSP · FFT 2048 · 48 kHz` как в прототипе — уже частично есть в footer эталона |

---

## Что не переносить

| Элемент прототипа | Причина |
|-------------------|---------|
| `lib/harmonicDetector.ts` | Дублирует math, расходится с ADR v0.1 (`peaks`, `scoreHarmonicStack`, полоса 80–250 Гц) |
| Collapse в `ReasoningPanel` / `FundamentalsList` | [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md) §2 — статические строки |
| `detected = bestHarmonicCount >= 3 && rawConfidence > 0.35` в UI-слое | Порог и счётчик — в сервисе; UI — `DetectionSmoother` |
| Replit workspace (`pnpm`, `artifacts/mockup-sandbox`, shadcn `ui/*`) | Не стек Membrana demo (Yarn, DaisyUI, co-located package) |
| `min-h-screen` без `overflow-hidden` на body | Риск прыгающего scrollbar — эталон уже исправлен |

---

## Промпт целиком (для агента-исполнителя доработки)

### Кто ты

Senior frontend + audio demo engineer в монорепо Membrana. Читаешь этот анализ и эталон `packages/services/detectors/harmonic/demo/`. **Не** копируешь Replit-репозиторий целиком.

### Задача

Улучшить **эталонное** demo по выводам анализа:

1. **Обязательно (P0):** маркер порога на `ConfidenceMeter`; бейджи состояния микрофона; подзаголовок у `DetectionStatus`.
2. **Если согласовано в PR (P1):** вынести `HarmonicChip` / `HarmonicChipList`; расширить `HarmonicSpectrumResult` + `DetectionResult` полем `harmonicsHz` (тесты в `harmonics.test.ts` / `classifier`); показывать chips только при `harmonicsHz.length > 0`.
3. Соблюдать [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md): без collapse, без framer-motion, сглаживание не удалять.
4. Обновить `packages/services/detectors/harmonic/README.md` § Demo — скриншотное описание chips и маркера порога.

### Критерии приёмки

- [ ] `yarn workspace @membrana/harmonic-detector-service dev:demo` — UI без регрессии anti-flicker.
- [ ] При воспроизведении дрона chips показывают ≥2 частот с метками H1, H2, … (после P1).
- [ ] Полоса confidence визуально показывает порог слайдера.
- [ ] `yarn workspace @membrana/harmonic-detector-service test` зелёный.
- [ ] Нет импортов из `apps/demos/`.

### Out of scope

- Перенос `apps/demos` в workspaces.
- Плагин клиента (фаза 3) — только подготовить переиспользуемые компоненты в `demo/components/`.

---

## Справка: фрагменты прототипа

**Chip-grid (идея):** `apps/demos/Harmonic-Detector/artifacts/harmonic-lab/src/components/FundamentalsList.tsx` — map → `freq-chip` / `H{i+1}`.

**Маркер порога:** тот же пакет, `ConfidenceMeter.tsx` — `confidence-threshold` at `left: ${thresholdPct}%`.

**Эталон сглаживания:** `packages/services/detectors/harmonic/demo/hooks/detection-smooth.ts`.

---

## Заметки для постановщика

- Регистрация в `registry.json`: опционально `harmonic-demo-ux-port` (S/M), ссылка на Issue #45.
- Папку `apps/demos/Harmonic-Detector` имеет смысл **не коммитить** как есть (Replit + node_modules); для истории — архивировать только `artifacts/harmonic-lab/src` в `docs/archive/` или cherry-pick UX в эталон и удалить.
- После merge P0/P1 обновить [`HARMONIC_DETECTOR_STANDALONE_DEMO_PROMPT.md`](./HARMONIC_DETECTOR_STANDALONE_DEMO_PROMPT.md) — добавить ссылку на этот анализ в § «Связанные материалы».

---

## Связанные документы

| Документ | Зачем |
|----------|--------|
| [`HARMONIC_DETECTOR_STANDALONE_DEMO_PROMPT.md`](./HARMONIC_DETECTOR_STANDALONE_DEMO_PROMPT.md) | Исходная постановка demo |
| [`HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md`](./HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md) | Фаза 1 сервиса |
| [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md) | Норматив UI live-детекции |
| [`issue-45-harmonic-bridge.md`](../discussions/issue-45-harmonic-bridge.md) | Чеклист #45 |
| [`DSP_DRONE_DETECTOR_PROMPT.md`](./DSP_DRONE_DETECTOR_PROMPT.md) | Фаза 3 — плагин клиента |
