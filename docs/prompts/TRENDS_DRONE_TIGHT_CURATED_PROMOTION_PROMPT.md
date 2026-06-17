# Промпт: продвижение DRONE_TIGHT в curated-каталог trends-fft

> **Стратегический task-промпт (follow-up)** — Cursor IDE / Claude.
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **M** (1 фаза, продакшн-внедрение).
> Ожидаемый артефакт: обновлённый curated-каталог + переснятый `benchmark:detectors` + stage-gate запись.
> Реестр: `id` = **`trends-drone-tight-curated-promotion`** в [`docs/tasks/registry.json`](../tasks/registry.json).
> Предпосылка (go): эпик [`fft-last-chance-calibration`](./FFT_LAST_CHANCE_CALIBRATION_EPIC_PROMPT.md), отчёт `docs/datasets/week-2026-06-14/fft-last-chance-report.md`.

---

## Контекст

Эпик «FFT — последний шанс» дал вердикт **go для trends-fft**: шаблон **`DRONE_TIGHT`** (узкий, из перцентилей train-дронов) + системные не-дрон конкуренты показал на held-out `split=val` корпуса `free-v1` **recall 95% / FPR 30% / F1 0.844** — выше планки 80%/40%.

Текущий продакшн-каталог `packages/services/detectors/template-match/src/data/curated-drone-templates.json` содержит **только** `DRONE_CURATED` — объединённый envelope из 60 сэмплов, который в калибровке давал **FPR 95%** (переобучение «во всё подряд»). Нужно заменить/дополнить его узким `DRONE_TIGHT`, чтобы общий бенчмарк детекторов (`yarn benchmark:detectors`) получил реальные числа trends-детектора.

**Что переиспользуем (не переписываем):**

| Компонент | Путь | Роль |
|-----------|------|------|
| Лучший шаблон | `data/detectors-benchmark/v0.2/fft-last-chance-best-template.json` | источник `DRONE_TIGHT` |
| Curated-каталог | `packages/services/detectors/template-match/src/data/curated-drone-templates.json` | цель замены |
| Резолвер каталога | `template-match/src/resolve-catalog.ts` | curated + system non-drone |
| Общий бенчмарк | `yarn benchmark:detectors` | stage-gate числа |
| Калибровочный харнесс | `scripts/benchmark-fft-trends.mjs` | контрольная сверка |

---

## Промпт целиком (для вставки агенту)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Внедри победивший trends-шаблон в продакшн-каталог.
>
> **Цель:** в `yarn benchmark:detectors` trends/template-match детектор должен на `split=val` дать **recall ≥ 80% / FPR ≤ 40%**, подтверждая результат калибровки (95%/30%).
>
> **Запрещено:** новые `*-detector-service`, нейро/ensemble, изменение формул метрик, прямая регистрация модулей в store. Меняем только данные каталога и, при необходимости, его сборку.
>
> **Шаги:**
> 1. Перенести `DRONE_TIGHT` из `fft-last-chance-best-template.json` в `curated-drone-templates.json` (заменить `DRONE_CURATED` либо добавить рядом — решить по результату бенчмарка; обычно tight один лучше merged).
> 2. Пересобрать `@membrana/template-match-detector-service`, прогнать `yarn benchmark:detectors`, зафиксировать val recall/FPR/F1.
> 3. Сверить с харнессом `yarn benchmark:fft-trends` (числа должны совпадать в пределах шума).
> 4. Если общий бенчмарк не подтверждает планку — вернуться к Математику за подстройкой bounds на train (val не трогаем).
> 5. Обновить stage-gate запись в `docs/DETECTOR_BENCHMARK.md` (или соответствующем отчёте) и закрыть задачу.

---

## Архитектурный / математический контракт

- **Метрики:** `recall = TP/(TP+FN)`, `FPR = FP/(FP+TN)`, цель `recall ≥ 0.8 && FPR ≤ 0.4` на `split=val`.
- **Дисциплина:** любые подстройки bounds — только по `split=train`; `split=val` остаётся held-out для финального вердикта.
- **`DRONE_TIGHT`** (текущие bounds): centroid 2900–4300 Гц, flux 0.03–0.16, rms 0.07–0.28, frameHitRatio 0.6–1.0; temporal: activityRatio 0.8–1.0, centroidStd 0–400, longTermStability high/veryHigh, volume/frequencyTrend stable.
- **isDrone:** ключ обязан начинаться с `DRONE_` (резолвер `resolve-catalog.ts` фильтрует системные не-дрон сцены как конкурентов).

---

## Definition of Done

- [ ] `DRONE_TIGHT` в `curated-drone-templates.json`; `DRONE_CURATED` заменён или обоснованно оставлен.
- [ ] `yarn benchmark:detectors` зелёный, trends/template-match val recall ≥ 80% и FPR ≤ 40% зафиксированы.
- [ ] Сверка с `yarn benchmark:fft-trends` (расхождение в пределах шума).
- [ ] `yarn typecheck` / `yarn test` для `template-match` зелёные.
- [ ] Stage-gate запись обновлена; `yarn task:archive trends-drone-tight-curated-promotion`.

## Out of scope

- Нейро/CLAP/YAMNet, ensemble, мультиузловые сценарии.
- UI-редактор curated-шаблонов (отдельная задача `trends-fft-template-editor`).
- Пороговый FFT-тест (вердикт no-go, остаётся диагностическим инструментом).

## Порядок ролей

1. **Teamlead** — LGTM на замену каталога, подтверждение stage-gate.
2. **Математик** — перенос bounds, train/val дисциплина, сверка чисел.
3. **Структурщик** — правка каталога/сборки, прогон бенчмарков.
4. **Музыкант** — ручная проверка на 3–5 сэмплах в плагине библиотеки.

## Заметки для постановщика

- GitHub Issue: «Trends-fft go: DRONE_TIGHT → curated-каталог + benchmark:detectors». Проставить номер в реестр.
- Это продакшн-реализация вердикта go из эпика `fft-last-chance-calibration`.
