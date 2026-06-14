<!-- Сгенерировано: 2026-05-16T05:35:38.993Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: dsp-drone-detector -->

# MAIN_DAY_ISSUE — Центральная задача дня

> **Дата:** 2026-05-16 · **Роль:** Teamlead (Vesnin)  
> **Источники:** `DAILY_STANDUP.md`, `STRATEGIC_PLAN_DAY.md`, `DAILY_CODE_REVIEW.md`, GitHub Issues (#28–#36, #45)

---

## 🎯 Обязательный фокус дня

### **Завершить фундамент Этапа 1 — убрать нарушения слабой связанности и добавить контракты синхронизации**

**Одна задача, три компоненты:**

1. **Слабая связанность плагинов микрофона** (#30 — КРИТИЧНО)
   - Проверить: нет ли прямых импортов `@membrana/telemetry*` из `apps/client/src/plugins/microphone-stream-viz`?
   - Проверить: нет ли прямых вызовов Web Audio вне `@membrana/audio-engine-service`?
   - **Command:** `rg -n "@membrana/telemetry|navigator.mediaDevices|AudioContext" apps/client/src/plugins/microphone* apps/client/src/modules/microphone`
   - **Результат:** граф импортов чистый (no direct plugin-to-plugin, all telemetry через agenda).

2. **Типы синхронизации в `@membrana/core`** (задача 4.1 STRATEGIC_PLAN)
   - Добавить интерфейсы: `SyncedTimestamp`, `TimeSyncProvider`, `TdoaResult`.
   - **File:** `packages/core/src/types.ts`
   - **Экспорт:** из `core/index.ts`
   - **Результат:** `yarn test --filter=@membrana/core` зелёный (TDOA unit-тесты на синтетических данных).

3. **Скелет `@membrana/tdoa-service`** (задача 4.2 STRATEGIC_PLAN)
   - Структура: `src/math/tdoa.ts` (чистые функции), `src/core/tdoa-service.ts`, `src/hooks/`.
   - **Функция:** `computeTdoa(obs1, obs2) => TdoaResult`.
   - **Тесты:** ≥4 unit-теста (zero signal, known sine, TDOA на расстояниях 10/100/1000 м).
   - **Результат:** `yarn test --filter=@membrana/tdoa` зелёный.

---

## 📋 Definition of Done (к вечеру)

- [ ] **#30 закрыта:** `rg`-поиск на слабую связанность чистый; плагины импортируют только из `@membrana/*-service` и core.
- [ ] **`@membrana/core/src/types.ts`** экспортирует `SyncedTimestamp`, `TimeSyncProvider`, `TdoaResult`.
- [ ] **`@membrana/tdoa-service`** содержит скелет с ≥4 unit-тестами; `yarn test --filter=@membrana/tdoa` ✅.
- [ ] **FFT math-функции** задокументированы (JSDoc с примерами и edge cases).
- [ ] **`packages/temp/`** очищена (осталась только `.gitkeep`); ценное в `docs/discussions/`.
- [ ] **Скрипты** `consilium.mjs`, `main-day-issue.mjs` закоммичены в `scripts/`; `package.json` обновлён.
- [ ] **`yarn lint` и `yarn test`** проходят без ошибок.
- [ ] **LGTM от Teamlead:** код соответствует `ARCHITECTURE.md`, нет нарушений дизайна.

---

## ⏱️ Таймбокс (3 блока × 2.5–3 ч)

| Блок | Время | Что делать | Роли |
|------|-------|-----------|------|
| **A. Аудит #30 + типы core** | 09:00–11:30 | Проверить слабую связанность; добавить `SyncedTimestamp`, `TimeSyncProvider`, `TdoaResult` в core. | Структурщик, Математик |
| **B. Скелет tdoa-service** | 12:00–15:00 | Создать пакет, функция `computeTdoa`, ≥4 unit-теста. | Математик, Структурщик |
| **C. Очистка + финализация** | 15:00–18:00 | Убрать `packages/temp/` (архив в docs/), закоммитить скрипты, LGTM. | Верстальщик, Teamlead |

---

## 🚀 Следующие шаги (после MAIN_DAY_ISSUE)

1. **Drone-detector-service** (эшелон 0.1) — задача задачи 4.3 из STRATEGIC_PLAN.
2. **Контракт наблюдения (AcousticObservation, Track)** — задача 4.5.
3. **VirtualNodeSimulator** для тестирования на двух узлах — задача 4.6.

---

**Источник:** STRATEGIC_PLAN_DAY.md (задачи 4.1–4.5) · DAILY_CODE_REVIEW.md (критичные issues) · DAILY_STANDUP.md (приоритизация)