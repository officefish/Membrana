# Epic Prompt: free-v1 Sound Catalog

**GitHub Issue:** [#205](https://github.com/officefish/Membrana/issues/205)  
**Создан:** 2026-06-30 · **Волна:** W1 · **Lead:** Vesnin

---

## Контекст

Библиотека free-v1 содержит 120 сэмплов дрона, на основе которых автоматически сгенерирован шаблон `DRONE_TIGHT` (recall 95%, FPR 30%). Высокий FPR объясняется отсутствием негативных классов: детектор не знает, как звучат птица, ветер или машина.

Цель эпика — расширить библиотеку до 7 классов звуков и сгенерировать шаблон для каждого. Это переводит систему от бинарного детектора к **классификатору звуковой среды** и снижает FPR дрона ниже 15%.

---

## Классы free-v1

| Класс | ID шаблона | Приоритет | Акустические особенности |
|-------|-----------|-----------|--------------------------|
| Дрон | `DRONE_TIGHT` | ✅ готов | периодические гармоники 2–5 кГц |
| Тишина | `SILENCE` | low | плоский спектр, низкая энергия |
| Ветер | `WIND` | medium | широкополосный шум, нет гармоник |
| Пение птиц | `BIRDS` | medium | высокочастотные короткие импульсы |
| Человеческая речь | `SPEECH` | medium | форманты 300–3400 Гц, ритмичность |
| Машинный гул | `MACHINE_HUM` | **high** | низкочастотные гармоники, непрерывный |
| Стрельба | `GUNSHOT` | high | импульсный, широкий спектр, кратковременный |

---

## Спринт 1 — Подготовительный (`fv1-s1-pipeline`)

**Lead:** Ozhegov · **Support:** Dynin  
**Размер:** M · **Зависимости:** нет

### Задачи

1. **Perplexity research** — акустические характеристики каждого класса:
   - Что отличает MACHINE_HUM от DRONE_TIGHT на уровне FFT?
   - Как разграничить GUNSHOT (импульс) от остальных непрерывных классов?
   - Какие threshold-параметры (centroid, flux, RMS) наиболее дискриминативны?

2. **Параметризация генератора шаблонов**
   - Текущий пайплайн умеет: `yarn templates:generate` → `DRONE_TIGHT.json`
   - Нужно: `yarn templates:generate --class wind --src samples/wind/` → `WIND.json`
   - Все параметры шаблона (centroid, flux, RMS, harmonics) рассчитываются из корпуса

3. **Схема датасета для новых классов**
   - Структура папок: `docs/datasets/free-v1/<class>/`
   - Metadata JSON на каждый файл (source, duration, quality, background)
   - Naming convention: `<class>-<index>-<quality>.wav`

4. **Регрессия DRONE_TIGHT**
   - После рефакторинга пайплайна: `yarn templates:generate --class drone --src samples/drone/`
   - Результат должен совпадать с текущим `DRONE_TIGHT.json` в пределах допуска

### DoD

- [ ] `yarn templates:generate --class <any> --src <path>` работает для любого класса
- [ ] DRONE_TIGHT регрессия pass
- [ ] Perplexity-отчёт по акустике классов сохранён в `docs/insights/`
- [ ] Схема датасета задокументирована в `docs/datasets/free-v1/README.md`

---

## Спринт 2 — Контентный (`fv1-s2-content`)

**Lead:** Kuryokhin (Музыкант) · **Support:** Dynin, Ozhegov  
**Размер:** L · **Зависимости:** fv1-s1-pipeline ✅

### Задачи

1. **Perplexity research** — источники свободных аудио-датасетов:
   - Приоритет: MACHINE_HUM (20–25 сэмплов), GUNSHOT (15–20 сэмплов)
   - Рекомендуемые источники: Freesound.org, ESC-50, UrbanSound8K, BBC SFX Library
   - Лицензии: только CC0 / CC-BY / public domain

2. **Сбор сэмплов** (до 250 итого, сейчас 120 дрон):
   - SILENCE: 20 сэмплов (разные условия: помещение, улица, ночь)
   - WIND: 22 сэмпла (слабый, средний, сильный; с листвой и без)
   - BIRDS: 22 сэмпла (разные виды, одиночные и хор)
   - SPEECH: 22 сэмпла (разные дистанции, языки, фоны)
   - MACHINE_HUM: 25 сэмплов (генераторы, кондиционеры, автомобили на холостом)
   - GUNSHOT: 19 сэмплов (пистолет, автомат, дальний/ближний)

3. **Лейбелирование** по единой схеме (`docs/datasets/free-v1/<class>/metadata.json`)

4. **Авто-генерация 6 шаблонов** через параметризованный пайплайн

5. **QA каждого шаблона**:
   - Recall на своём корпусе (loo cross-validation)
   - Матрица путаницы: как часто MACHINE_HUM путается с DRONE?

### DoD

- [ ] ≥ 130 новых сэмплов в `docs/datasets/free-v1/`, итого ≥ 250
- [ ] 6 шаблонов сгенерированы и сохранены в `packages/services/trends-detector/templates/`
- [ ] Каждый шаблон имеет паспорт качества (recall, FPR на своём корпусе)
- [ ] `yarn vdr:list` показывает все 7 классов

---

## Спринт 3 — Интеграционный (`fv1-s3-integration`)

**Lead:** Vesnin · **Support:** Ozhegov, Dynin, Rodchenko  
**Размер:** L · **Зависимости:** fv1-s2-content ✅

### Задачи

1. **Multi-class routing в детекторе**
   - Текущий результат: `{ isDrone: boolean, confidence: number }`
   - Целевой результат: `{ class: SoundClass, confidence: number, isDrone: boolean }`
   - `SoundClass` в `@membrana/core`: `'drone' | 'silence' | 'wind' | 'birds' | 'speech' | 'machine-hum' | 'gunshot' | 'unknown'`

2. **Калибровка порогов** для каждого класса на **смешанном датасете**
   - Смешанный датасет: все 250 сэмплов вперемешку
   - Цель: FPR дрона < 15% при recall ≥ 90%
   - Особое внимание: MACHINE_HUM → DRONE путаница

3. **Stage-gate отчёт**
   - Матрица путаницы 7×7
   - Метрики по каждому классу (precision, recall, F1)
   - Вывод: проходит ли free_v1 gate?

4. **Интеграция в plugin + cabinet UI**
   - Plugin показывает класс звука рядом с confidence
   - Cabinet: фильтр журнала по классу

5. **Catalog finalization**
   - `DRONE_TIGHT.json`, `SILENCE.json`, `WIND.json`, `BIRDS.json`, `SPEECH.json`, `MACHINE_HUM.json`, `GUNSHOT.json` — все с версией `free_v1`
   - `docs/datasets/free-v1/RELEASE_NOTES.md`
   - CONTRIBUTING.md обновлён: как добавлять новый класс

### DoD

- [ ] Stage-gate: FPR дрона < 15%, recall ≥ 90% на смешанном датасете
- [ ] Multi-class детектор задеплоен (plugin + cabinet)
- [ ] free_v1 официально выпущен (release notes + catalog)
- [ ] #205 closed

---

## Стоп-правила (для агентов)

- Не расширять классы сверх 7 без нового консилиума
- Не деплоить в прод до прохождения stage-gate (S3)
- Не трогать `DRONE_TIGHT.json` в S2 — он финализирован в S1
- При FPR > 20% после S3 — стоп, эскалация к Vesnin

---

## Связи

| Направление | Задача |
|------------|--------|
| Блокирует | `sld4-stage-gate-calibration`, `vdr4-dsp-calibration-validated` |
| Зависит от | `sld3-dsp-detectors-free-v1` (детекторы готовы), `vdr3-ground-truth-export` (схема готова) |
| Параллельно | TDOA/localizer spec-design (контракты core) |
