# Промпт: Анализатор тенденций FFT в библиотеке сэмплов (калибровка под DRONE_TIGHT)

> **Стратегический task-промпт** — Cursor IDE / Claude.
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **M** (1 плагин + калибровка-пресет).
> Ожидаемый артефакт: opt-in плагин библиотеки сэмплов, прогоняющий существующие сэмплы через trends-fft с пресетом `DRONE_TIGHT`; отчёт в журнал.
> Реестр: `id` = **`trends-fft-sample-library-drone-tight`** в [`docs/tasks/registry.json`](../tasks/registry.json).
> Контекст: вердикт go эпика [`fft-last-chance-calibration`](./FFT_LAST_CHANCE_CALIBRATION_EPIC_PROMPT.md) (#84); потенциал FFT — [`FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./FFT_METRICS_POTENTIAL_AND_LIMITS.md).

---

## Контекст

Эпик «FFT — последний шанс» показал, что **trends-fft с шаблоном `DRONE_TIGHT` + системные конкуренты** даёт на free-v1 `val` recall 95% / FPR 30% — единственная FFT-конфигурация, прошедшая планку. Сейчас этот результат воспроизводится только Node-харнессом (`yarn benchmark:fft-trends`). Пользователь не может **вручную** прогнать тот же анализ на конкретных сэмплах из библиотеки.

Нужен плагин библиотеки сэмплов «Анализатор тенденций FFT», по образцу уже сделанного `sample-library-fft-threshold-test` (FL1), но использующий trends/template-match с **пресетом `DRONE_TIGHT`**. Цель — дать пользователю воспроизвести наши эксперименты на текущем датасете в UI.

**Что переиспустить (не переписывать):**

| Компонент | Путь | Роль |
|-----------|------|------|
| Эталон плагина библиотеки | `apps/client/src/plugins/sample-library-fft-threshold-test/` | offline post-playback + журнал + панель |
| Trends scoring | `@membrana/trends-detector-service` (`classifyTrends`) | вердикт |
| Template-match | `@membrana/template-match-detector-service` (`run-template-match-analysis`, `collect-metric-samples`) | сбор метрик + isDrone по `DRONE_*` |
| Лучший шаблон | `data/detectors-benchmark/v0.2/fft-last-chance-best-template.json` | пресет `DRONE_TIGHT` |
| Рендер trends в журнале | `@membrana/journal-report-views` (`TrendsFftReportView`) | уже есть |
| Сэмпл-воспроизведение | `@membrana/sample-playback-service` | загрузка буфера, события |

---

## Промпт целиком (для вставки агенту)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Дай пользователю ручной прогон trends-fft (`DRONE_TIGHT`) по сэмплам библиотеки.
>
> **Цель:** opt-in плагин `sample-library-trends-fft` на модуле `sample-library`: выбрал сэмпл → прогнал через trends/template-match с пресетом `DRONE_TIGHT` + системные не-дрон конкуренты → увидел победивший шаблон, isDrone, score/confidence → отчёт ушёл в журнал телеметрии.
>
> **Запрещено:** новые `*-detector-service`, нейро/ensemble, `new AudioContext()`/`getUserMedia` вне `audio-engine`, прямая регистрация модулей в store (только `MembranaRegistry`).
>
> **Шаги:**
> 1. Завести пресет `DRONE_TIGHT` из `fft-last-chance-best-template.json` (вынести в общий модуль, чтобы не дублировать числа; согласовать с curated-каталогом из `trends-drone-tight-curated-promotion`).
> 2. Создать плагин по образцу `sample-library-fft-threshold-test`: своё состояние (`useSyncExternalStore`), offline-анализ буфера через `collectMetricSamples` → `run-template-match-analysis` с каталогом `[DRONE_TIGHT, ...системные не-дрон]`.
> 3. Панель: выбранный сэмпл, кнопка «Прогнать», статус, свёрнутый вид = одна строка (победивший паттерн + статус дрон/не-дрон + имя анализатора + время), развёрнутый = score ranking + детали (как `TrendsFftReportView`).
> 4. Писать отчёт в журнал (`trends-fft/*` схема, рендер уже есть). `analysisSource` фиксирован sample-library.
> 5. Зарегистрировать на модуле `sample-library` через `MembranaRegistry` (opt-in, `active:false`), смонтировать панель в `SampleLibraryModule`.
> 6. Unit-тест (resolve config + state transitions) + `yarn workspace @membrana/client typecheck`.

---

## Архитектурный / математический контракт

- **isDrone:** `result.isDetected && detectedState.startsWith('DRONE') && confidence ≥ minConfidence`. Пресет `DRONE_TIGHT` имеет ключ `DRONE_*`.
- **Сбор метрик:** `collectMetricSamples` (10 замеров × 500 мс, fftSize 2048) — те же параметры, что в харнессе, иначе числа разойдутся.
- **Каталог:** `[DRONE_TIGHT, ...SYSTEM_TEMPLATES без DRONE_*]` (как `resolve-catalog.ts`).
- **Плагин:** opt-in, не конфликтует с микрофонным trends-fft (своё состояние), схема журнала с рендером в `@membrana/journal-report-views`.

## Definition of Done

- [ ] Плагин `sample-library-trends-fft` зарегистрирован (opt-in), панель монтируется, прогон по сэмплу даёт тот же вердикт, что харнесс на том же файле (в пределах шума).
- [ ] Отчёт пишется в журнал, рендерится свёрнуто (1 строка) и развёрнуто.
- [ ] Пресет `DRONE_TIGHT` не хардкодится дважды (общий источник с curated).
- [ ] Unit-тест зелёный; `yarn workspace @membrana/client typecheck` зелёный.
- [ ] Запись в реестре, `yarn task:archive trends-fft-sample-library-drone-tight`.

## Out of scope

- Внедрение `DRONE_TIGHT` в продакшн curated-каталог (это `trends-drone-tight-curated-promotion`).
- UI-редактор шаблонов (`trends-fft-template-editor`).
- Нейро/эшелон-2.

## Порядок ролей

1. **Teamlead** — границы «эшелон 0», LGTM на пресет, паритет с харнессом.
2. **Математик** — сверка чисел плагин↔харнесс, дисциплина параметров сбора.
3. **Структурщик** — плагин по образцу FL1, общий источник пресета.
4. **Верстальщик** — свёрнутая строка + развёрнутый вид по `DESIGN.md`.
5. **Музыкант** — ручной прогон 3–5 сэмплов (дрон/не-дрон) в браузере.

## Заметки для постановщика

- Идёт в одном спринте с `trends-drone-tight-curated-promotion`; согласовать единый источник пресета `DRONE_TIGHT`.
- GitHub Issue: «Анализатор тенденций FFT в библиотеке сэмплов (DRONE_TIGHT)». Проставить номер в реестр.
