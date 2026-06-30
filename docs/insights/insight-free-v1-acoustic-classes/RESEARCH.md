# Research: Акустические характеристики 7 классов free-v1

**Дата:** 2026-06-30 · **Задача:** fv1-s1-pipeline · **Источник:** WebSearch (Perplexity-каскад)

---

## Q1: Что отличает MACHINE_HUM от DRONE_TIGHT на уровне FFT?

**Запрос:** `drone vs machine hum acoustic differences harmonics periodicity FFT frequency 2000-5000Hz spectral classification`

### Drone (мультироторный)

- Гармоническая структура определяется скоростью вращения ротора и числом лопастей:  
  `BPF = RPM/60 × N_blades`
- Пример DJI: BPF ~377 Hz → гармоники 754, 1100, 1500 Hz, …, энергетически значимые до 5+ kHz
- Центроид спектра: **2000–5000 Hz** (подтверждено DRONE_TIGHT: 2900–4300 Hz)
- Spectral flux: **низкий–средний** (стабильный моторный тон)
- Долгосрочная стабильность: **high / veryHigh**, периодичность: **regular**

### Machine Hum (HVAC, генераторы, двигатели на холостом)

- Основная частота: 50/60 Hz (электродвигатели) или 60–120 Hz (ДВС)
- Гармоники концентрируются в диапазоне **100–1000 Hz**
- Центроид спектра: **100–800 Hz** (принципиально ниже дрона)
- Похожая стабильность и непрерывность — без spectral centroid оба выглядят одинаково

### Ключевой разграничитель: DRONE vs MACHINE_HUM

| Параметр | DRONE_TIGHT | MACHINE_HUM |
|----------|-------------|-------------|
| `centroid` | 2000–5000 Hz | 100–800 Hz |
| `centroidStd` | < 400 (стабильно) | < 150 (ещё стабильнее) |
| `activityRatio` | > 0.8 | > 0.8 |
| `longTermStability` | high / veryHigh | high / veryHigh |
| `periodicity` | regular | regular / semiRegular |

**Вывод:** Spectral centroid — первичный и достаточный дискриминатор. centroid > 1500 Hz → DRONE. centroid < 1000 Hz + stable → MACHINE_HUM.

---

## Q2: Как разграничить GUNSHOT от непрерывных классов?

**Запрос:** `gunshot audio detection spectral features impulse vs continuous sound FFT spectral centroid`

### GUNSHOT — акустический профиль

- **Импульсный характер:** время атаки < 1 мс, полная длительность < 100–200 мс
- **Широкополосный спектр:** одновременная энергия по всем частотам (wideband)
- **Очень высокий peakToAverageRatio:** 10–50× vs 1–3× у непрерывных звуков
- **Низкий activityRatio:** большая часть окна — тишина до/после выстрела (< 0.1–0.2)
- **Высокий RMS в момент импульса**, затем быстрое затухание (reverb)

### Discriminative features — GUNSHOT vs всё остальное

| Параметр | GUNSHOT | DRONE | MACHINE_HUM | BIRDS |
|----------|---------|-------|-------------|-------|
| `activityRatio` | < 0.15 | > 0.8 | > 0.8 | 0.2–0.7 |
| `peakToAverageRatio` | > 8–10 | 1.0–2.5 | 1.0–2.0 | 2–10 |
| `avgBurstDuration` | < 0.2 s | > 2 s | > 2 s | 0.05–0.8 s |
| `envelopeShape` | impulsive | sustained | sustained | impulsive/attackDecay |

**Вывод:** Комбинация `activityRatio < 0.2` + `peakToAverageRatio > 8` + `avgBurstDuration < 0.3 s` однозначно идентифицирует GUNSHOT. BIRDS имеют похожие короткие бёрсты, но PAR значительно ниже.

---

## Q3: Какие threshold-параметры наиболее дискриминативны?

**Запрос:** `environmental sound classification spectral centroid flux RMS discriminative features wind birds speech silence`

### Сводная таблица 7 классов

| Класс | centroid (Hz) | flux | rms | activityRatio | centroidStd | peakToAvg |
|-------|--------------|------|-----|---------------|-------------|-----------|
| **DRONE** | 2000–5000 | 0.03–0.16 | 0.07–0.28 | > 0.8 | < 400 | 1.0–2.5 |
| **SILENCE** | < 500 | < 0.05 | < 0.025 | < 0.1 | < 100 | 1.0–2.0 |
| **WIND** | 100–1000 | 0.05–0.4 | 0.04–0.18 | > 0.9 | < 100 | 1.0–1.5 |
| **BIRDS** | 1500–6000 | 0.5–2.5 | 0.02–0.20 | 0.2–0.7 | > 500 | 2–10 |
| **SPEECH** | 400–3000 | 0.3–1.5 | 0.04–0.35 | 0.35–0.85 | 200–800 | 1.5–5 |
| **MACHINE_HUM** | 100–800 | 0.03–0.3 | 0.05–0.30 | > 0.8 | < 150 | 1.0–2.0 |
| **GUNSHOT** | 500–5000 | high (peak) | high (peak) | < 0.15 | N/A | > 8 |

### Иерархия дискриминативности

1. **`centroid` + `activityRatio`** — разделяют 5 из 7 классов с первой попытки
2. **`peakToAverageRatio`** — изолирует GUNSHOT (> 8)
3. **`centroidStd`** — отделяет BIRDS (нестабильный > 500) от DRONE (стабильный < 400)
4. **`avgBurstDuration`** — SPEECH/BIRDS (< 1.5 s) vs WIND/DRONE/MACHINE_HUM (> 2 s)
5. **`flux`** — вторичный: BIRDS высокий, SILENCE/WIND/DRONE низкий
6. **`rms`** — порог SILENCE, иначе вторичный

### Confusion matrix — зоны риска

| Путаница | Причина | Разграничитель |
|----------|---------|----------------|
| DRONE ↔ MACHINE_HUM | оба stable + continuous | centroid: drone >2kHz, hum <1kHz |
| BIRDS ↔ SPEECH | оба freq jumps + modulation | centroidStd: birds > 500, speech 200–800 |
| GUNSHOT ↔ BIRDS | оба короткий burst | peakToAverageRatio: gunshot > 8, birds < 10 |
| WIND ↔ SILENCE | оба stable, low activity | rms + activityRatio: wind выше |

---

## Рекомендации для порогов шаблонов S2

1. **MACHINE_HUM** (high priority): `centroid.max = 1000 Hz`, `activityRatio.min = 0.7`
2. **GUNSHOT** (high priority): `peakToAverageRatio.min = 8`, `activityRatio.max = 0.2`, `avgBurstDuration.max = 0.3`
3. **BIRDS**: `centroidStd.min = 400`, `frequencyJumps.enabled = true`
4. **WIND**: `centroid.max = 1200 Hz`, `longTermStability = [high, veryHigh]`
5. **SPEECH**: `activityRatio 0.35–0.85`, `periodicity = [semiRegular, irregular]`
6. **SILENCE**: `rms.max = 0.025` (строго), `activityRatio.max = 0.1`

---

*Источник: WebSearch (Perplexity-каскад) 2026-06-30*

- [Passive acoustic detection of drones — Acta Acustica 2026](https://acta-acustica.edpsciences.org/articles/aacus/full_html/2026/01/aacus250134/aacus250134.html)
- [Drone sound recognition via adaptive feature fusion — MDPI Electronics 2025](https://www.mdpi.com/2079-9292/14/8/1491)
- [Drone Sound ID by Harmonic Line Association — ResearchGate](https://www.researchgate.net/publication/314856552_Drone_Sound_Identification_and_Classification_by_Harmonic_Line_Association_Based_Feature_Vector_Extension)
- [Firearm classification from acoustic signals (CRNN) — Scientific Reports 2025](https://www.nature.com/articles/s41598-025-27949-z)
- [Environmental Sound Classification: descriptive review — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2667305322000539)
- [Review of physical/perceptual feature extraction for ESC — MDPI Applied Sciences](https://www.mdpi.com/2076-3417/6/5/143)
- [Spectral Centroid overview — ScienceDirect Topics](https://www.sciencedirect.com/topics/engineering/spectral-centroid)
