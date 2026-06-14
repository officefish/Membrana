<!--
  archive-role: archive-snapshot
  archive-day: 2026-05-16
  archived-at: 2026-05-16T06:43:26.309Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-05-16T05:21:27.770Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (22), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# Ежедневный стендап виртуальной команды Membrana
**2026-05-16** · Синхронизация на основе вчерашнего code-review, стратегического плана и открытых задач

---

## Резюме дня

**Главный фокус:** завершить фундамент Этапа 1 («Одинокий слушатель») — убрать нарушения слабой связанности, добавить контракты синхронизации времени в `@membrana/core` и подготовить скелет `tdoa-service` для Этапа 2.

**Главный риск:** дублирование документации (VIRTUAL_TEAM_PROMPT.md vs. TASK_PROMPT_WORKFLOW.md), untracked скрипты (consilium.mjs, main-day-issue.mjs), нарушения дизайна в плагинах микрофона (#30 — критично).

**Критерий успеха к вечеру:** все скрипты закоммичены, слабая связанность в плагинах проверена, типы SyncedTimestamp добавлены в core, минимум одна полнофункциональная демонстрация drone-detector с confidence score.

---

## Входные артефакты

| Источник | Актуальность | Что берём сегодня |
|----------|--------------|-------------------|
| **STRATEGIC_PLAN_DAY.md** | ✅ Актуален (2026-05-15, 6 задач на день) | Задачи 4.1–4.5: типы синхронизации, tdoa-service, drone-detector переименование, очистка temp/, контракт наблюдений |
| **DAILY_CODE_REVIEW.md** (вчер.) | ⚠️ Требует уточнений (9 расхождений между review и фактом) | Критичные: #28 (core тесты), #30 (mic plugin), #31 (telemetry journal), #32 (FFT edge cases); остальное — nice to have |
| **GitHub Issues** (22 открытых) | ✅ Актуальны | #45 (dsp-drone-detector task), #30–#36 (code review follow-ups), #7–#12 (unit testing needs) |
| **packages/temp/** | 🔴 Пусто (0 файлов) | Не берём — temp уже очищена |

---

## Порядок работы

**Цепочка ролей на день:**

1. **Teamlead (Vesnin)** — фреймирует приоритеты, определяет, что в скоупе, ревьюит финальное состояние.
2. **Структурщик (Ozhegov)** → параллельно с остальными — проверяет импорты, слабую связанность в плагинах.
3. **Математик (Dynin)** → Структурщик → Teamlead — контракты данных (SyncedTimestamp, TDOA), чистота функций.
4. **Верстальщик (Rodchenko)** → параллельно — подтверждает, что drone-detector UI соответствует DESIGN.md.
5. **Teamlead (Vesnin)** — LGTM по завершении.

---

## [Teamlead]

### Стратегический фокус

Этап 1 дорожной карты **завершаем**, Этап 2 **подготавливаем**. Сегодняшний день — мост между ними.

**Что в скоупе:**
- Типы и контракты синхронизации (core) — фундамент для многоузловой системы.
- Скелет tdoa-service — демонстрация подготовленности архитектуры к Этапу 2.
- Финализация drone-detector на одном узле (Этап 1).
- Метаинфраструктура (скрипты consilium, main-day-issue, дедупликация документации).

**Что НЕ делаем сегодня:**
- ❌ Полную синхронизацию по GPS-PPS (заглушка будет).
- ❌ Fusion-сервис и мультилатерацию (это Этап 3).
- ❌ Фильтр Калмана и трекинг целей (Этап 4).
- ❌ Общую переработку design-system (отложить после Этапа 2).

### Приоритизация GitHub Issues

| Приоритет | Issues | Действие |
|-----------|--------|---------|
| **КРИТИЧНО** | #28, #30, #31 | Включить в Definition of Done на вечер |
| **ВЫСОКИЙ** | #7–#12 (unit testing), #26, #36 | Часть в скоупе дня, часть → backlog Этапа 2 |
| **СРЕДНИЙ** | #32–#35 (документация, a11y) | Nice to have; можно отложить до конца Этапа 1 |
| **BACKLOG** | #37–#46 (регистры, синхронизация с Linear) | Отложить на период инфраструктуры |

---

## [Структурщик]

### Слабая связанность и граничные проверки

**На вечер проверить:**

1. **Плагины микрофона** (#30 — КРИТИЧНО):
   - Нет ли прямых импортов `@membrana/telemetry*` из `apps/client/src/plugins/microphone-stream-viz`?
   - Нет ли прямых вызовов Web Audio методов вне `@membrana/audio-engine-service`?
   - Command: `rg -n "@membrana/telemetry|navigator.mediaDevices|AudioContext" apps/client/src/plugins/microphone* apps/client/src/modules/microphone`

2. **Новые сервисы** (tdoa-service, типы sync):
   - Импорты только из `@membrana/core` + локальные типы.
   - Ни React, ни Web Audio, ни @membrana/audio-engine.
   - Пакеты находятся в `packages/services/` с правильным `package.json`.

3. **Плагины FFT, Sound Quality, Drone Detector**:
   - Нет ли импортов между соседями?
   - Все вызовы сервисов идут через consensus интерфейсы, не через приватные функции.

4. **Дедупликация документации**:
   - Разделить ответственность: VIRTUAL_TEAM_PROMPT.md → координация ролей, TASK_PROMPT_WORKFLOW.md → оформление issue → work.
   - Убрать дублирование таблицы персонажей.

**Definition of Done (Структурщик):**
- [ ] Граф импортов проверен: `rg "from.*plugins/" packages/plugins/*/src/` (пусто).
- [ ] Скрипты consilium.mjs, main-day-issue.mjs закоммичены.
- [ ] `yarn lint` зелёный (нет import-ошибок).
- [ ] Дедупликация документации завершена или явно отложена в task #X.

---

## [Математик]

### Контракты данных и чистые функции

**На вечер доставить:**

1. **Типы синхронизации в @membrana/core** (задача 4.1 STRATEGIC_PLAN):
   ```typescript
   // packages/core/src/types.ts
   interface SyncedTimestamp {
     localMs: number;           // локальное время узла
     globalMs: number;          // согласованное глобальное время
     confidence: number;        // 0..1, уверенность в синхронизации
   }
   
   interface TimeSyncProvider {
     calibrate(nodeId: string): Promise<{ offset: number; confidence: number }>;
   }
   
   interface TdoaResult {
     deltaT: number;            // разница времён прихода, микросекунды
     confidence: number;        // уверенность в TDOA
     signalPower?: number;      // мощность сигнала для фильтрации шума
   }
   ```

2. **Скелет tdoa-service** (задача 4.2 STRATEGIC_PLAN):
   - Структура: `packages/services/tdoa/src/math/tdoa.ts` (чистые функции).
   - Функция `computeTdoa(obs1: AcousticObservation, obs2: AcousticObservation) => TdoaResult`.
   - Unit-тесты: синтетические сигналы (1 кГц, 48 kHz), известные расстояния (10 м, 100 м, 1000 м).

3. **Чистота math-слоя FFT** (#32 — проверка):
   - Файлы `packages/services/fft-analyzer/src/math/{fft,metrics,statistics}.ts` не содержат React/DOM/Web Audio.
   - Контракты в JSDoc: допустимые входы, edge cases (пустой буфер, NaN, Nyquist).

**Definition of Done (Математик):**
- [ ] `packages/core/src/types.ts` экспортирует SyncedTimestamp, TimeSyncProvider, TdoaResult.
- [ ] `packages/services/tdoa/src/math/tdoa.test.ts` содержит ≥4 unit-теста (zero signal, known sine, TDOA на расстояниях).
- [ ] FFT math-функции документированы (JSDoc с примерами и ограничениями).
- [ ] `yarn test --filter=@membrana/core` и `yarn test --filter=@membrana/tdoa` проходят.

---

## [Музыкант]

### Поток audio-engine и качество сигнала

**На вечер проверить:**

1. **Параметры захвата микрофона** для Этапа 1:
   - Sample rate: 48 kHz (по STRATEGIC_PLAN).
   - Буфер: размер согласован с FFT window (2048 сэмплов).
   - Нет ли clipping на типичных уровнях звука (разговор, дрон 80–250 Гц).

2. **Drone detector plugin** (task 4.3 STRATEGIC_PLAN):
   - Confidence score вместо boolean on/off.
   - Фоновый профиль (30 сек записи без дрона) сохраняется в persist.
   - Unit-тест: synthetic audio с дроном (120 Гц) → confidence > 0.7; фоновый шум → confidence < 0.3.

3. **VirtualNodeSimulator для тестирования** (task 4.6):
   - Скелет класса для эмуляции двух узлов с разной временной задержкой.
   - Пример в README audio-engine.

**Definition of Done (Музыкант):**
- [ ] Drone detector переименован: `packages/plugins/fft-threshold-test` → `packages/plugins/drone-detector-test`.
- [ ] Confidence score реализован и проверен на синтетическом audio.
- [ ] Фоновый профиль сохраняется/загружается из persist.
- [ ] Unit-тест на классификацию дрона vs. шума включен в `yarn test`.
- [ ] README audio-engine содержит пример VirtualNodeSimulator (заглушка OK).

---

## [Верстальщик]

### UI по DESIGN.md и очистка temp/

**На вечер проверить:**

1. **Drone detector UI** (задача 4.3 STRATEGIC_PLAN):
   - Confidence score отображается визуально (progress bar / gauge).
   - Кнопка "Запись фонового профиля" есть и работает.
   - Соответствие `docs/DESIGN.md` (цвета, размеры, доступность).

2. **Журнал телеметрии** (#31 — presentational only):
   - Фильтрация (tag, type) — логика выделена из компонента или в сервис?
   - ARIA-метки на карточках: `aria-label`, `aria-live="polite"`.
   - Контрастность текста (WCAG 2.1 AA).

3. **Очистка packages/temp/** (задача 4.4 STRATEGIC_PLAN):
   - `three-param-analyzer/` удалена.
   - Старые компоненты `Journal/*` удалены (ценные идеи → `docs/discussions/journal-concepts.md`).
   - `.gitkeep` остаётся для будущих песочниц.

4. **Проверка переносов из temp:**
   - Какие компоненты из `packages/temp/` использует клиент в боевых плагинах?
   - Если переиспользуются — вынести в `packages/design-system/` или `packages/plugins/`.
   - Если one-off — удалить, не копировать.

**Definition of Done (Верстальщик):**
- [ ] Drone detector UI соответствует DESIGN.md (скриншот прилагается).
- [ ] `packages/temp/` содержит только `.gitkeep`.
- [ ] Telemetry journal имеет ARIA-разметку на критичных элементах.
- [ ] Коммит `chore(repo): archive experimental packages to docs/discussions` подготовлен.

---

## План на сегодня

| Блок | Размер | Задача | DoD | Issues |
|------|--------|--------|-----|--------|
| **4.1** | M | Типы синхронизации в @membrana/core | SyncedTimestamp, TimeSyncProvider, TdoaResult экспортированы; unit-тесты на TDOA-вычисление | — |
| **4.2** | M | Скелет @membrana/tdoa-service | `src/math/tdoa.ts`, unit-тесты на синтетических данных, README с примером | — |
| **4.3** | S–M | Drone detector: переименование + confidence score | Плагин переименован, confidence: 0..1, фоновый профиль, unit-тест | — |
| **4.4** | S | Очистка packages/temp/ | Удалены three-param-analyzer и Journal/, архивирование в docs/, git чистый | — |
| **4.5** | M | Контракт наблюдения (AcousticObservation, Track) | Типы в core, экспорт из core/index.ts, примеры в README, интеграция с fusion-слоем | — |
| **Meta** | S | Дедупликация документации и скрипты | consilium.mjs + main-day-issue.mjs закоммичены, VIRTUAL_TEAM_PROMPT vs. TASK_PROMPT разделены, package.json обновлён | #36, #46 |
| **Проверка** | S | Слабая связанность плагинов, FFT math-чистота | Граф импортов проверен, no-react в math/, rg-поиск чистый | #30, #32 |

---

## Матрица Issues ↔ задачи дня

| Задача дня | GitHub Issues |
|----------|--------------|
| 4.1–4.5 (STRATEGIC_PLAN) | Не привязаны к конкретным Issues (стратегические) |
| Meta — дедупликация docs | #36 (code-review discrepancies), #46 (VIRTUAL_TEAM_PROMPT sync) |
| Проверка mic plugin (#30) | #30 (audit mic plugin — КРИТИЧНО) |
| FFT math-чистота (#32) | #32 (verify math purity) |
| Telemetry journal UI (#31) | #31 (presentational only) |
| Unit tests (#7–#12) | #7 (agenda store), #8 (module registration smoke), #9 (microphoneStreamHub), #10 (FFT math tests), #11 (resolveMicStreamVizConfig), #12 (CI scripts) |

**Отложить на Этап 2:**
- #25–#27 (lazy-loading, Storybook, graceful degradation).
- #33–#35 (a11y расширения, avatar graphics).
- #37–#46 (регистры, синхронизация с Linear).

---

## Итоговый артефакт

**К вечеру на git:**

```
✅ packages/core/src/types.ts
   ├─ SyncedTimestamp interface
   ├─ TimeSyncProvider interface
   └─ TdoaResult interface

✅ packages/services/tdoa/ (новый пакет)
   ├─ src/math/tdoa.ts
   ├─ src/math/tdoa.test.ts
   ├─ src/core/tdoa-service.ts
   ├─ src/hooks/useTdoa.ts (заглушка)
   ├─ README.md
   └─ package.json

✅ apps/client/src/plugins/drone-detector-test/ (переименование из fft-threshold-test)
   ├─ index.ts
   ├─ DroneDetectorPanel.tsx (с confidence score)
   └─ drone-detector.test.ts

✅ packages/services/audio-engine/README.md
   └─ Раздел VirtualNodeSimulator (пример)

✅ docs/discussions/journal-concepts.md (если есть ценное из temp)

✅ docs/VIRTUAL_TEAM_PROMPT.md (дедупликация завершена или отложена)

✅ scripts/consilium.mjs, scripts/main-day-issue.mjs (закоммичены)

✅ package.json (скрипты consilium, main-day-issue добавлены)

✅ git: chore(repo): archive experimental packages to docs/discussions
```

---

## Definition of Done (день)

- [ ] `@membrana/core` экспортирует `SyncedTimestamp`, `TimeSyncProvider`, `TdoaResult`; unit-тесты на TDOA-вычисление зелёные.
- [ ] `@membrana/tdoa-service` содержит скелет с чистыми функциями и ≥4 unit-тестами на синтетических данных.
- [ ] Плагин `drone-detector-test` переименован, confidence score реализован, фоновый профиль работает.
- [ ] `packages/temp/` очищена (осталась только `.gitkeep`); ценное архивировано в `docs/discussions/`.
- [ ] Скрипты `consilium.mjs`, `main-day-issue.mjs` закоммичены в `scripts/`, `package.json` актуален.
- [ ] Проверены нарушения слабой связанности в плагинах микрофона (#30) — `rg`-поиск чистый.
- [ ] FFT math-функции задокументированы (JSDoc с примерами); edge cases явно описаны.
- [ ] `yarn lint` и `yarn test` проходят без ошибок; turbo кеш актуален.
- [ ] LGTM от Teamlead: код соответствует `ARCHITECTURE.md`, нет нарушений дизайна.

---

## Риски

1. **Дедупликация документации может перекрыться на другие PR:**
   - Если споры затянутся → отложить в отдельный issue (сохранив статус-кво в VIRTUAL_TEAM_PROMPT).
   - **Срезаем первым:** разрешаем оставить оба документа с явной перекрёстной ссылкой, переделаем на следующей неделе.

2. **Синхронизация времени — холодный старт для TDOA:**
   - Заглушка `SyncedTimestamp` с `offset: 0` будет неправильной для реальной мультилатерации.
   - **Действие:** в скелете tdoa-service явно отметить TODO для калибровки; unit-тесты используют идеальную синхронизацию.

3. **Plausible runtime-баг в drone-detector confidence-вычислении:**
   - На синтетических 120 Гц данных score может быть неинтуитивным.
   - **Действие:** тесты включают обратные сценарии (фоновый шум должен < 0.3); логирование confidence во время отладки.

4. **FFT edge cases — документация может отстать от кода:**
   - Если функции меняются после документирования → актуальность теряется.
   - **Действие:** при unit-тестировании все edge cases должны быть покрыты тестами (source of truth).

---

## Что обсудить на синхронизации (optional)

- Будет ли VirtualNodeSimulator в публичном API audio-engine или только для тестов?
- Когда стартовать работу над fusion-сервисом (Этап 3)? После Этапа 1 finalise?
- На Этапе 2 нужна ли работа с persistence узла (сохранение профилей) или это Этап 3+?

---

**Источники:** STRATEGIC_PLAN_DAY.md · DAILY_CODE_REVIEW.md · GitHub Issues (#28–#36, #45) · ARCHITECTURE.md · SERVICES.md