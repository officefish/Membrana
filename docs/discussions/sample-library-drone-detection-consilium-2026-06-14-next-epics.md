# Консилиум: закрытие эпика SLD + следующие эпики

> **Дата:** 2026-06-14  
> **Инициатор:** пользователь (ручная валидация детекторов)  
> **Эпик:** [`SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md`](../prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md) · Issue [#47](https://github.com/officefish/Membrana/issues/47)  
> **Предыдущий консилиум:** [`sample-library-drone-detection-consilium-2026-06-15.md`](./sample-library-drone-detection-consilium-2026-06-15.md)

---

## Входные данные (ручная проверка пользователя)

| Детектор | Наблюдение в плагине | Интерпретация команды |
|----------|----------------------|------------------------|
| harmonic | ~50–65% confidence на большинстве треков | Слабое разделение; пороги не калиброваны под слух |
| cepstral | ~100% на большинстве треков | Высокий FP: кепстральная периодика в 80–250 Гц не специфична для дрона |
| spectral-flux | ~100% на большинстве треков | Высокий FP: низкополосная энергия + «стабильность» слишком широки |

**Вывод:** SLD1–SLD3 выполнили **инфраструктурную** цель (контракт, плагин, три детектора, benchmark). **Продуктовая** цель «узнавать дроны» **не достигнута**. Benchmark F1 0.53–0.67 на folder-labels **не противоречит** субъективному опыту: метки free-v1 = «папка drone/not-drone», не обязательно «слышу дрон».

**Решение Teamlead:** эпик **продолжаем** фазой **SLD4** (честный stage-gate отчёт + протокол калибровки + train/val split). **Не** закрываем эпик как «детекторы готовы». Цель ≥80% узнаваемости — **отдельный эпик** после достоверного ground truth.

---

## [Teamlead — Vesnin]

### Закрытие текущего эпика (после SLD4)

| Фаза | Статус | Комментарий |
|------|--------|-------------|
| SLD1 | archived | `analyzeSample()` — канон UI + benchmark |
| SLD2 | archived | плагин `sample-library-drone-analysis` |
| SLD3 | merge PR #77 → archive | три DSP-детектора; качество — **открытый вопрос** |
| SLD4 | **в работе** | stage-gate gap report, split 80/40, `yarn calibrate:detectors` |

**LGTM на закрытие эпика #47** — только после SLD4 с явной формулировкой: *«stage-gate 85/90 не пройден; переход к 1.B / ensemble заблокирован»*.

### Ground truth (продуктовый канон)

У каждого сэмпла в `background-media`:

- `label`: `drone` | `not_drone` | `unlabeled`
- `notes`: текстовое описание (будущий промпт для обучения)

| Коллекция | Кто редактирует |
|-----------|-----------------|
| system (`__tariff_dataset__`, free-v1) | администраторы Мембраны (cabinet) |
| user / buffer | пользователь на узле (client) |

**Блокер калибровки:** без UI/API редактирования меток и ручной валидации корпуса пороговая подгонка на folder-labels не даёт доверия.

---

## [Структурщик — Ozhegov]

Рекомендуемые **следующие эпики** (порядок merge):

| # | id (черновик) | Размер | Зависимости | Содержание |
|---|---------------|--------|-------------|------------|
| **E1** | `validated-drone-recognition` | L | SLD4 | Полный эпик VDR1–VDR6: метки, UI, export, ≥80%, template-match — см. [`VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md`](../prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md) |
| **E2** | `detector-calibration-80` | L | E1 | Калибровка порогов + агрегация на **валидированном** корпусе; цель ≥80% (метрика — зафиксировать в промпте) |
| **E3** | `real-dataset-live-calibration` | L | E1 (частично) | Недельный промпт уже есть: live mic ↔ library, журнал client↔cabinet |
| **E4** | `detection-ensemble-1b` | M | E2 + stage-gate | `@membrana/detection-ensemble-service` — только если одиночный DSP не проходит gate |
| **E5** | `neural-detectors-yamnet-clap` | L | E2 | Эшелон 1.B по `INTEGRATIONS_STRATEGY.md` |

**Не смешивать:** E1 (данные) и E2 (математика) в одном PR.

---

## [Математик — Dynin]

### Почему benchmark ≠ UX

1. **Агрегация v1:** `isDrone = any(frame)` + `confidence = max(frame)` — один кадр за 5 с даёт «дрон».
2. **Пороги** подобраны под contract-тесты и recall на folder-labels, не под precision в реальности.
3. **Метки** free-v1 не прошли слуховую валидацию оператором.

### SLD4 (в рамках эпика)

- Stratified split **80 train / 40 val** в manifest (`split: train|val`).
- `yarn calibrate:detectors` — grid search порога confidence + режимов агрегации на train, отчёт на val.
- Документ [`DETECTOR_CALIBRATION.md`](../DETECTOR_CALIBRATION.md) — gap до gate 85/90.

### E2 (следующий эпик)

- Зафиксировать метрику: например **accuracy ≥ 80%** на val **или** **F1 ≥ 0.80** при согласованных P/R.
- Кандидаты: majority/min-ratio агрегация, per-detector пороги, простой ensemble (AND/OR голосование).

---

## [Музыкант]

- Прослушивание 10–15 треков — **минимум** для E1; идеал — весь val-split (40).
- Поле `notes` заполнять по шаблону: модель дрона, дистанция, среда, «слышу / не слышу дрон».

---

## [Верстальщик — Rodchenko]

**E1 UI (черновик):**

- Client: inline select `label` + textarea `notes` в таблице библиотеки (не tariff read-only).
- Cabinet: те же поля для system catalog с `readOnly=false` для admin.
- Плагин детекторов: колонка «метка датасета» рядом с вердиктом (сравнение pred vs truth).

---

## Итог консилиума

| Вопрос | Решение |
|--------|---------|
| Продолжать эпик #47? | **Да** — SLD4 (отчёт + инструменты калибровки) |
| Закрывать как «детекторы работают»? | **Нет** |
| Следующий эпик | **`validated-drone-recognition`** ([промпт](../prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md)) |
| Следующий эпик №2 | **`detector-calibration-80`** (после E1) |
| Stage-gate 85/90 | **Не пройден**; TDOA / ensemble / neural — **после** E2 |

**Следующий шаг:** завершить SLD4 в ветке эпика → merge PR #77 + SLD4 → `yarn task:archive sld3` / `sld4` → зарегистрировать E1 в `docs/tasks/registry.json`.
