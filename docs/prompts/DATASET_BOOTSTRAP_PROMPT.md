# Промпт: bootstrap датасета для бенчмарка детекторов (v0.1)

> **Task-промпт для агента.** Блок **B** дня (#47 `single-node-detection-first`).  
> Размер: **S–M** · артефакты: `docs/DATASET.md`, `data/detectors-benchmark/v0.1/`, скрипт генерации.  
> Следующий шаг после merge: [`BENCHMARK_RUNNER_PROMPT.md`](./BENCHMARK_RUNNER_PROMPT.md) (ещё не создан).

---

## Контекст

| Готово | Где |
|--------|-----|
| Скелет `docs/DATASET.md` | классы, stage-gate, протокол |
| Рабочий `harmonic-detector-service` | фазы 1–3 #45, архив `dsp-drone-detector` |
| `DETECTOR_BENCHMARK.md` | протокол метрик, таблица-заглушка |

**Остаётся:** минимальный **размеченный** набор файлов + манифест для `yarn benchmark:detectors`.

---

## Цель

Наполнить **v0.1 bootstrap**: ≥ **9 примеров** (3 группы × 3), манифест JSON, скрипт воспроизводимой генерации синтетики, документ `DATASET.md` как источник истины для бенчмарка.

**Не цель v0.1:** 30 сэмплов на класс (stage-gate) — отдельный поток после первого прогона harmonic.

---

## Структура артефактов

```text
data/detectors-benchmark/v0.1/
├── manifest.json          # id, path, class, label, split, metadata
├── README.md              # как перегенерировать
└── synthetic/             # WAV 48 kHz mono, ~2 s

scripts/generate-dataset-synthetics.mjs

docs/DATASET.md            # каталог + чек-лист Музыканта
```

**Корень репо:** `yarn dataset:generate` → пересоздаёт `synthetic/*.wav` и обновляет `manifest.json`.

---

## Классы v0.1 (минимум 9 записей)

| Группа | class (manifest) | label | Примеры (×3) |
|--------|------------------|-------|----------------|
| Дрон | `drone-multirotor` | `drone` | F₀ 120 / 150 / 180 Гц + гармоники 2f–4f |
| Не-дрон | `bird` / `human-speech` / `silence` | `not-drone` | синус 440 Гц; модулированный шум; тишина |
| Среда | `wind` / `traffic` / `silence` | `not-drone` | ВНЧ-шум; низкий гул; фон |

Допустимо объединить «не-дрон» в разные class-имена при едином `label: not-drone`.

---

## Манифест (`manifest.json`)

```json
{
  "version": 1,
  "sampleRate": 48000,
  "generatedBy": "scripts/generate-dataset-synthetics.mjs",
  "samples": [
    {
      "id": "drone-mr-120hz",
      "path": "synthetic/drone-mr-120hz.wav",
      "class": "drone-multirotor",
      "label": "drone",
      "split": "test",
      "durationSec": 2,
      "snrDb": null,
      "source": "synthetic",
      "notes": "F0=120 Hz, harmonics 2f-4f"
    }
  ]
}
```

Поля обязательны: `id`, `path`, `class`, `label`, `split`, `durationSec`, `source`.

---

## Скрипт генерации

- Pure Node.js, без npm-зависимостей.
- Пишет **16-bit PCM mono WAV**, 48 kHz, длительность ~2 с.
- Синтетика согласована с `@membrana/detector-base` (`harmonicDroneWindow` — F₀ 120 + кратные).
- После записи файлов — перезапись `manifest.json` с актуальным списком.

---

## `docs/DATASET.md` — содержание

1. **Статус v0.1** — дата, число сэмплов, ссылка на манифест.
2. **Таблица примеров** — id, class, label, длительность, sr, SNR (оценка), источник, путь.
3. **Шум среды** — подраздел с wind / traffic / silence.
4. **Генерация** — `yarn dataset:generate`.
5. **Чек-лист Музыканта** — таблица «слышно как дрон?» (да/нет/—), заполняется вручную.
6. **Stage-gate** — напоминание: v0.1 ≠ финальный split 60/20/20.

---

## DoD

- [ ] ≥ 9 WAV в `data/detectors-benchmark/v0.1/synthetic/`.
- [ ] `manifest.json` валиден, пути существуют.
- [ ] `yarn dataset:generate` идемпотентен (повторный запуск без сюрпризов).
- [ ] `docs/DATASET.md` описывает все записи; есть чек-лист Музыканта.
- [ ] `data/detectors-benchmark/v0.1/README.md` — краткая инструкция.
- [ ] Нет PII / полевых записей без политики (только synthetic в v0.1).
- [ ] `CURRENT_TASK.md` обновлён после приёмки (или архив буфера).

---

## Out of scope

- Полевые записи, Freesound, DCASE (отдельный PR).
- `yarn benchmark:detectors` (следующий промпт).
- Train/val split > test-only для v0.1.

---

## Связанные документы

| Документ | Зачем |
|----------|--------|
| [`DATASET.md`](../DATASET.md) | целевой каталог |
| [`DETECTOR_BENCHMARK.md`](../DETECTOR_BENCHMARK.md) | потребитель манифеста |
| [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md) | приоритет дня #47 |
| [`issue-45-harmonic-bridge.md`](../discussions/issue-45-harmonic-bridge.md) | harmonic готов |

---

## Промпт целиком (для агента)

### Кто ты

Агент Membrana: **Музыкант** (валидность звука), **Структурщик** (манифест, пути). Не трогай детекторы и клиент, кроме `package.json` script.

### Задача

1. Реализовать `scripts/generate-dataset-synthetics.mjs`.
2. Сгенерировать v0.1 synthetic WAV + `manifest.json`.
3. Переписать `docs/DATASET.md` по DoD выше.
4. Добавить `dataset:generate` в корневой `package.json`.

### Проверка

```bash
yarn dataset:generate
# убедиться: 9+ файлов в data/detectors-benchmark/v0.1/synthetic/
```

Ручная: прослушать 2–3 drone и 1 not-drone в OS-плеере.
