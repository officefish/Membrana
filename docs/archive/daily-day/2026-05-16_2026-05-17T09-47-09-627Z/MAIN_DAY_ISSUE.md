<!--
  archive-role: archive-snapshot
  archive-day: 2026-05-16
  archived-at: 2026-05-17T09:47:09.629Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-05-16T06:46:47.271Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: dsp-drone-detector, single-node-detection-first -->

# MAIN_DAY_ISSUE

**Дата:** 2026-05-16 (утро, после стендапа)  
**Роль:** Teamlead (Vesnin)  
**Период:** Single-Node Detection First (консилиум завершён)

---

## 🎯 Один обязательный фокус дня

### **Реализация harmonic-detector-service + dataset + benchmark + UI интеграция**

**GitHub:** [#47](https://github.com/officefish/Membrana/issues/47) (Single-Node Detection First)  
**Реестр:** `single-node-detection-first` (scaffold → реализация)

После консилиума и утреннего стендапа **scaffolding завершено**. Переходим на **реальную реализацию** DSP-эшелона **Этапа 1.A**.

**Четыре параллельных блока:**

1. **Harmonic-детектор** — `@membrana/harmonic-detector-service/src/math/harmonic-extractor.ts` (FFT-парсинг, F₀ 80–250 Гц, гармоники).
2. **Dataset + Benchmark** — `docs/DATASET.md` (9+ примеров), `yarn benchmark:detectors` (TP/FP/FN).
3. **Hub + Хок в клиенте** — `droneDetectionResultHub`, `useDroneDetectionSensor()` для подписки плагинов.
4. **UI-компонент** — `DroneDetectionHeaderSensor` (иконка, текст, цветовая шкала по уверенности).

---

## 📋 Definition of Done

- [ ] `@membrana/harmonic-detector-service` реализован полностью (не placeholder); `yarn test` **зелёный**.
- [ ] Unit-тесты на синтезированных дронах, шуме, edge cases; latency < 100 мс.
- [ ] `docs/DATASET.md` содержит минимум 9 примеров с источниками и метаинформацией.
- [ ] `yarn benchmark:detectors` собирается и выполняется; результаты в JSON + `DETECTOR_BENCHMARK.md`.
- [ ] `DroneDetectionHeaderSensor` в заголовке клиента отображает иконку + текст (цвет по confidence).
- [ ] Hub и хук работают; детектор может публиковать результаты в hub, UI получает их.
- [ ] **Архитектурная целостность:** нет циклических зависимостей, нет прямых импортов между детекторами.
- [ ] **LGTM от Vesnin** на PR перед слиянием в `main`.

---

## ⏱️ Порядок работы (цепочка ролей)

| Фаза | Роль | Содержание | Выход |
|------|------|-----------|-------|
| **1** | Teamlead | Согласовать контракт, границы, LGTM-критерии | ADR (1 абзац) |
| **2** | Математик | Реализовать `harmonic-extractor.ts` + unit-тесты | FFT-классификатор, тесты pass |
| **3** | Музыкант | Валидировать на реальных звуках из DATASET | Recall ≥ 80%, precision ≥ 70% |
| **4** | Структурщик | Собрать интеграцию (hub, хук, детектор в registry) | Модульная структура, нет циклов |
| **5** | Верстальщик | UI-компонент, a11y, интеграция в header | Компонент в клиенте, проверка a11y |
| **6** | Teamlead | LGTM на целостность архитектуры, merge | Завершение |

---

## 🚫 Что НЕ делаем сегодня

- ❌ Реализация spectral-flux и cepstral детекторов → отдельные task-промпты после LGTM на harmonic.
- ❌ YAMNet, CLAP, Agentic детекторы → Этап 1.B, после Этапа 1.A.
- ❌ TDOA, синхронизация, многоузловая локализация → явно за stage-gate 1→2.
- ❌ Расширение #45 без согласования → отложить.

---

## 📊 Матрица Issues ↔ день

| Задача дня | GitHub | Статус |
|------------|--------|--------|
| Harmonic-детектор | #47 (main-day-issue) | 🟢 в работе |
| Dataset | #47 | 🟢 в работе |
| Benchmark | #47 | 🟢 в работе |
| Hub + HeaderSensor | #47 | 🟢 в работе |
| Проверка архитектуры | #47, #30 | 🟢 параллельно |
| Code-review issues | #28–#36 | 🟡 backlog (мониторим) |
| Unit-тесты backlog | #9–#12 | 🟡 если остаётся время |

---

## 🚀 Следующие шаги

1. **После LGTM harmonic** → task-промпты на spectral-flux, cepstral.
2. **После stage-gate 1→2** (precision ≥ 85%, recall ≥ 90%) → разблокировка TDOA, Этап 2.
3. **Параллельно** → разведка синхронизации времени для Этапа 2 (`TIME_SYNCHRONIZATION_STRATEGY.md`).