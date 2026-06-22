# Stage-Gate 1→2 — решение Teamlead (2026-06-22)

> **Статус:** принято · **LGTM:** Vesnin (Teamlead)  
> **Входы:** [`FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md), [`DETECTOR_BENCHMARK.md`](./DETECTOR_BENCHMARK.md), консилиум [`seanses/morning-audit-action-plan-2026-06-22-2026-06-22.md`](./seanses/morning-audit-action-plan-2026-06-22-2026-06-22.md), фаза 1 утра (merge `techies68` `87612ee` + `8f2ea0a`)  
> **Канон шлюза:** [`WHITE_PAPER.md`](./WHITE_PAPER.md) §8 — precision ≥85%, recall ≥90%

---

## TL;DR

| Вопрос | Решение |
|--------|---------|
| **Hard gate 1→2 пройден?** | **Нет** — на validated val-split лучший FFT ≈52.5% accuracy (VDR6); precision trends `DRONE_TIGHT` ≈76% (<85%) |
| **Soft goal (Этап 1.A) достигнут?** | **Да** — trends `DRONE_TIGHT`: recall 95%, FPR 30% (free-v1 val, эпик #84) |
| **DRONE_TIGHT в production?** | **Да** — shipped в `curated-drone-templates.json`, policy, UserCase graphs; prod path без нового кода |
| **Этап 2 (TDOA, мультиузел)** | **Заморожен** до hard gate или явного пересмотра |
| **Этап 1.B** | **Инициировать параллельно:** полевой VDR v0.3 + YAMNet/CLAP scaffold (см. §4) |

---

## 1. Метрики (источники)

### 1.1 Trends `DRONE_TIGHT` — free-v1 held-out val (эпик #84)

| Метрика | Факт | Soft (80%/40% FPR) | Hard gate (85%/90%) |
|---------|------|--------------------|---------------------|
| Recall | **95%** | ✅ | ✅ |
| Precision | **76%** | ⚠️ | ❌ |
| FPR | **30%** | ✅ | — |
| F1 | **0.844** | ✅ | — |

Источник: [`FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) §0, §4.

### 1.2 Benchmark 2026-06-22 (folder labels, 120 samples)

| Детектор | Precision | Recall | F1 |
|----------|-----------|--------|-----|
| template-match (`DRONE_TIGHT`) | **0.855** | 0.883 | 0.869 |
| cepstral | 0.500 | 1.000 | 0.667 |
| harmonic | 0.436 | 0.683 | 0.532 |
| spectral-flux | 0.464 | 0.867 | 0.605 |

Источник: `yarn benchmark:detectors` → `data/detectors-benchmark/v0.2/reports/latest.json`.

**Интерпретация:** folder-labels оптимистичнее validated ground truth (VDR6: val accuracy ≤53%). Для **hard gate** опираемся на **curated labels**, не на папки `drone/` / `not-drone/`.

### 1.3 Потолок эшелона 0 (FFT-only)

Консилиум #84 и техрефренс: дальнейший рост **только trends-дисциплина**; повторный тюнинг harmonic/cepstral на free-v1 — **no-go**.

---

## 2. Решения

### 2.1 Production (Этап 1.A)

- **Ship** `DRONE_TIGHT` как лучший single-node FFT-детектор (trends template-match).
- **Не блокировать** продукт ожиданием hard gate.
- Live UI: простой индикатор «дрон / не дрон»; карточки confidence/reasoning — **Этап 1.B-UI** (post-gate).

### 2.2 Hard gate 1→2

- **Не пройден.** TDOA, `tdoa-service`, мультиузловая синхронизация — **остаются frozen** ([`WHITE_PAPER.md`](./WHITE_PAPER.md) §8).
- Пересмотр gate — только после:
  - curated v0.3+ manifest, **или**
  - Этап 1.B (нейро/zero-shot) с честным `yarn benchmark:detectors` на validated split.

### 2.3 Этап 1.B — параллельный задел (фазы 4 MAIN_DAY)

| Трек | Суть | Скорость | Надёжность |
|------|------|----------|------------|
| **A — VDR v0.3** | Полевые записи → user-коллекции → label/notes → export manifest | Медленно | Высокая (свой ground truth) |
| **B — YAMNet/CLAP** | `@membrana/yamnet-detector-service` scaffold, zero-shot, эшелон 0 | Быстро | Неопределённо до benchmark |

**Не выбираем один трек сейчас** — к концу недели сравниваем метрики на val и фиксируем лидера для пересмотра gate.

### 2.4 Явно не делаем

- Повторный «магистральный» тюнинг DSP на free-v1 без новых данных.
- Разморозка TDOA «потому что recall 95%».
- Обучение с нуля / платные API до исчерпания эшелона 0 + 1.B zero-shot ([`INTEGRATIONS_STRATEGY.md`](./INTEGRATIONS_STRATEGY.md)).

---

## 3. Артефакты merge (фаза 1, 2026-06-22)

| Артефакт | Ветка / commit |
|----------|----------------|
| device-board post-comp night-build | `e86a8b0` … на `techies68` |
| RAG dual-circuit v1 | `87612ee` |
| lint fix | `8f2ea0a` |

Runtime audit: `exec-successor` / `function-call-resolve` — дублирования с `function-pin-ops` **нет** (post-merge doc в CONCEPT — follow-up, не блокер).

---

## 4. Следующие task-промпты

| Приоритет | id / тема | Владелец |
|-----------|-----------|----------|
| 🔴 | Полевой сбор v0.3 (real-dataset W1) | Музыкант + оператор |
| 🔴 | `yamnet-detector-service` scaffold | Dynin + Структурщик |
| 🟡 | `rag-r7-optional` (full index bootstrap) | по наличию `OPENAI_API_KEY` |
| 🟡 | CONCEPT.md § exec-successor | Ozhegov |
| 🟢 | `detection-ensemble` | после 1.B benchmark |

---

## 5. Подпись

**Teamlead (Vesnin):** LGTM — soft pass для prod `DRONE_TIGHT`; hard gate **не пройден**; Этап 2 frozen; Этап 1.B — VDR + YAMNet параллельно.

**Дата:** 2026-06-22  
**Версия:** 1.0
