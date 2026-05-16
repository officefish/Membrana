<!-- Обновлено: 2026-05-16 — Single-Node Detection First (#47, консилиум) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) -->
<!-- active в реестре: single-node-detection-first -->

# MAIN_DAY_ISSUE — Центральная задача дня

> **Дата:** 2026-05-16 · **Роль:** Teamlead (Vesnin)  
> **Источники:** консилиум `docs/seanses/single-node-detection-first-2026-05-16.md`, task-промпт #47

---

## 🎯 Обязательный фокус дня

### **Single-Node Detection First — дорожная карта + scaffolding детекторов**

**Реестр:** `single-node-detection-first` · **GitHub:** [#47](https://github.com/officefish/Membrana/issues/47)  
**Промпт:** [`docs/prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md`](./prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md)

**Одна задача, пять блоков:**

1. **Стратегические документы** — `WHITE_PAPER` (1.A / 1.B, stage-gate), `ARCHITECTURE` §1e, `INTEGRATIONS_STRATEGY` §4, `DESIGN` (карточка детектора), `DETECTOR_BENCHMARK.md`, `DATASET.md`.
2. **`@membrana/detector-base`** — контракты `DroneDetector`, `DetectionResult`, `AudioWindow`, фикстуры для тестов.
3. **Scaffolding** — 6 пакетов в `packages/services/detectors/*` (placeholder + unit-тесты контракта).
4. **Заморозка TDOA** — `@experimental @stage 2` типы в core; `packages/services/tdoa/` frozen; milestone Stage 2 — Network.
5. **Связь с #45** — `dsp-drone-detector` **не расширять**; эталон → `harmonic-detector` в следующем промпте.

---

## 📋 Definition of Done (к вечеру)

- [ ] Документы обновлены (см. промпт §3.1–3.2).
- [ ] `yarn test:detectors` и `yarn build` зелёные на detector-пакетах.
- [ ] TDOA/мультиузел явно в «не делаем» (`STRATEGIC_PLAN_DAY.md`).
- [ ] GitHub: milestone «Stage 1: Single-Node Detection» + issues детекторов (по возможности).
- [ ] LGTM Vesnin.

---

## ⏱️ Таймбокс

| Блок | Содержание | Роли |
|------|------------|------|
| A | WHITE_PAPER, ARCHITECTURE, INTEGRATIONS, DESIGN, скелеты benchmark/dataset | Teamlead, Математик |
| B | detector-base + 6 scaffold-пакетов, turbo/yarn workspaces | Структурщик, Математик |
| C | Заморозка TDOA, issues/milestones, CI | Структурщик, Teamlead |

---

## 🚫 Что НЕ делаем сегодня

- **TDOA, многоузловая синхронизация, локализация** — заморожены до stage-gate 1→2.
- **Реализация детекторов** (кроме placeholder) — отдельные промпты, первый: `HARMONIC_DETECTOR_IMPLEMENTATION`.
- **Расширение #45** (`dsp-drone-detector`) без согласования с Teamlead.

---

## 🚀 Следующие шаги

1. `HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md` — эталонный DSP-детектор.
2. `DATASET_BOOTSTRAP_PROMPT.md` · `BENCHMARK_RUNNER_PROMPT.md`.
3. Остальные детекторы 1.A / 1.B → `STAGE_GATE_1_TO_2_REVIEW`.
