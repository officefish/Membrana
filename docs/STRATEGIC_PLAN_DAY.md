<!-- Сгенерировано: 2026-07-05T07:29:05.906Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день — 2026-07-05

## 1. Что сделано за период (последние сутки)

### presence-capture-board спринт (PCB1–PCB6) — **завершён**
- **PCB1** (7742bd5): Диагностические логи WS-жизненного цикла узла (`[node-ws] connecting/open/close`), WS-логи кабинета (`[cabinet-ws]`), гайд `PRESENCE_OFFLINE_DIAGNOSTIC.md` для root-cause узла → offline.
- **PCB3** (af21abc): Root-cause fix — идемпотентная `connect()` в `nodeRealtimeClient` и `cabinetNodeRealtimeClient`, снятие WS-реконнект-петли (ре-рендеры без disconnect-cleanup).
- **PCB4** (9db23d6c): Новый эндпоинт GET `/v1/nodes/:id/link-state` → `{paired, live, lastSeenAt}` (модуль `node-liveness`).
- **PCB6** (8038ad33): Активная проба живости узла — POST `/v1/nodes/:id/health-ping` (echo по WS, таймаут 3 c) → `{reachable, latencyMs}`.
- **PCB2** (2929d451): Сигнал auth-fail клиента при WS-close 4401, дебаунс 2.5 с → `PairingInvalidDialog`.
- **PCB5** (63263318): Force-open device-board через agenda-store при захвате (флаг `isViewOnlyFromCapture`, view-only контролы скрыты).

### pairing-lifecycle спринт (PL1–PL5) — **реализован**
- **PL1** (c515dc61): `PresenceSnapshotPayload` в core, presence-снапшот при registerCabinet (дедупликация узлов, чинит корневой offline-баг).
- **PL2** (3f4edd99): `Device.pairingStatus` (paired/revoked/unpaired) с миграцией, история через `pairedKeyId`.
- **PL3** (63fbf1bf): Удалить = revoke + delete одной кнопкой (усиленное подтверждение в кабинете).
- **PL4** (e56b2884): Авто-release захвата при отзыве/удалении ключа (`DeviceCaptureService.forceReleaseByNode`).
- **PL5** (c713a9b1): Smoke-рунбук `PAIRING_LIFECYCLE_SMOKE.md` + `STUDIO_HOST_BRIDGE_CONTRACT` §4.6 (Presence контракт).

### ci-gate stabilization (cg1)
- **cg1 fix** (63acf21f): RAG-тест timeout 5 s → 30 s (флейк retrieveContext на нагруженном раннере).

### Tasks & Consiliums
- Архивированы спринты PCB и PL, финализированы closure-reviews (T1/T2 LGTM).
- Зарегистрированы промпты `PRESENCE_CAPTURE_BOARD_SPRINT_PROMPT.md`, `PAIRING_LIFECYCLE_SPRINT_PROMPT.md`.
- Неполный PR-очередь: все ветки на мёрже, завтра будут LGTM из docs/reviews.

---

## 2. Привязка к стратегической цели

### Текущая позиция на дорожной карте
Проект находится на **Этапе 0–1.A (Фундамент и базовая детекция)** по WHITE_PAPER §8:
- ✅ `audio-engine` → кадры захватываются.
- ✅ `fft-analyzer` → спектр в реальном времени.
- ✅ Трёхсекундный live-анализ 3 DSP (harmonic/cepstral/spectral-flux) на клиенте.
- ✅ Trends FFT детектор (`DRONE_TIGHT`) прошёл мягкий гейт (recall 95% / FPR 30%, F1 0.844).
- ⚠ **Hard-gate (85%/90%)** в процессе валидации на независимом пилотном корпусе (30–35 сэмплов).

### Сделанное приближает к цели
Спринты **PCB** и **PL** решали **инфраструктурные блокеры**:
- Диагностика offline-проблемы (WS-жизненный цикл) позволяет итерировать детекторы в боевых условиях.
- Presence snapshot & здоровые сопряжения ключ-устройство → стабильная база для многоузлового тестирования (Этап 2).
- Link-state & health-ping → фундамент мониторинга ферм узлов (Этап 3–4).

### Мостик к Этапу 2 (TDOA, локализация, трекинг)
**Достаточно:** наблюдения с одного узла стабильны, детекция на мягком гейте, транспорт узел ↔ сервер работает.  
**Не хватает:**
- `tdoa-service` (извлечение разницы времён прихода между узлами).
- `localizer-service` (мультилатерация).
- `tracker-service` (трекинг целей, фильтр Калмана).
- `transport-service` (асинхронная шина событий; сейчас WS-broadcast, нужна очередь/кеш при разрывах).

### Детекция: статус и магистраль
По `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6:
- **Эшелон 0 (DSP/FFT) исчерпан** на free-v1: лучший результат trends `DRONE_TIGHT` = **95% recall / 30% FPR**, precision ≈ 0.76 → не покрывает hard-gate 85%/90%.
- **Не предлагать** как основную задачу дня: повторный benchmark harmonic/cepstral/flux, unified voting, тюнинг порогов на free-v1.
- **Магистраль качества:**
  1. **Validated Dataset (VDR hard-gate)** — независимый пилотный корпус (30–35 сэмплов, intra-rater ≥95%), включить в `benchmark:detectors`.
  2. **Trends + DRONE_TIGHT curated-promotion** — внедрить в template-match, переснять val.
  3. **Эшелон 2 (нейро/zero-shot)** — CLAP / YAMNet / reasoning-детектор поверх trends (см. `INTEGRATIONS_STRATEGY.md`).

---

## 3. Риски и долг

### Технические риски

| Риск | Статус | Действие |
|------|--------|---------|
| **Синхронизация времени узлов для TDOA** | Блокирует Этап 2 | Требует GPS-PPS или NTP/PTP в spec узлов; пока не дефайнен контракт `TimeSyncProvider`. |
| **Многолучёвость акустики** | Постоянный (WHITE_PAPER §9) | На Этапе 3+ при мультилатерации — GCC-PHAT + робастная медиана TDOA-оценок. |
| **Детекция vs классификация в одной сети** | Архитектурный вопрос | Классификатор (multirotор/крыло/не-дрон) пока только trends-шаблон; нейро ← Этап 1.B. |
| **Отсутствие validated-датасета** | Критично для hard-gate | VDR-пилот (30–35 сэмплов, ручная разметка) — зависимость для Этапа 2. |

### Накопленный долг

| Компонент | Где | Описание |
|-----------|-----|---------|
| `TimeSyncProvider` контракт | `@membrana/core` | Отсутствует; нужен перед `tdoa-service`. |
| `transport-service` архитектура | Foundation (не реализован) | Broadcast WS → очередь/дебаунс при разрывах (PL2b heartbeat → Foundation). |
| Template-match каталог шаблонов | `background-media` vs `packages/services/detector-*` | Где живут `DRONE_TIGHT`-шаблоны — не чётко определено; нужна миграция / договор. |
| E2E smoke multi-node | Ручной | Сейчас только single-node bench; multi-node presence/capture/board — only CI (unit). |

### Нарушения границ (по коммитам)

Не видно; архитектура соблюдается. Детекторы, agenda, device-board не смешиваются. Анализ: `ARCHITECTURE.md` §1c (registry) — MembranaRegistry работает как фасад, lazy-loading держит.

---

## 4. План на следующий день

### 4.1. Validated Dataset (VDR) hard-gate pilot

| | |
|---|---|
| **Цель** | Собрать независимый пилотный датасет (30–35 audio-сэмплов) с ручной разметкой (intra-rater ≥95%) и переснять `benchmark:detectors` на нём. |
| **Пакет / слой** | Dataset / docs; не код (доступ к железу / запись). |
| **Связь с WHITE_PAPER** | §8 Stage-gate 1→2 (обязательный шлюз перед TDOA): hard-gate 85%/90% must-pass. |
| **Definition of Done** | <ul><li>`docs/datasets/vdr-pilot-2026-07-*/manifest.json` (30–35 сэмплов, разметка, intra-rater метрики).</li><li>`yarn benchmark:detectors` на VDR-пилоте даёт P/R/F1 для trends DRONE_TIGHT, harmonic, cepstral, spectral-flux, live-brief.</li><li>Таблица результатов в `docs/DETECTOR_BENCHMARK.md` (VDR-пилот vs free-v1 val).</li><li>Вердикт: hard-gate пройден или провалился (действие по результату).</li></ul> |
| **Роль** | Верстальщик (сбор + нотация), Математик (разметка валидности, intra-rater). |
| **Размер** | **L** (полевая запись, ручная разметка, кросс-проверка). |

---

### 4.2. Trends DRONE_TIGHT curated-promotion

| | |
|---|---|
| **Цель** | Перевести `DRONE_TIGHT` FFT-шаблон из экспериментального статуса в prod-готовый, опубликовать в `background-media` каталоге как `trends-drone-tight-curated-v1`. |
| **Пакет / слой** | `@membrana/trends-detector-service` (logic), `background-media` (catalog + versioning). |
| **Связь с WHITE_PAPER** | §8 Этап 1.A DSP-эшелон финализация: trends — единственный FFT-детектор, прошедший мягкий гейт. |
| **Definition of Done** | <ul><li>Шаблон `DRONE_TIGHT` из эпика #84 экспортирован в JSON-схему (спектральные пороги + временные признаки).</li><li>Версионирование в `background-media`: `templates/drone-tight-curated-v1.json` (метаданные: аттестация на free-v1, recall/FPR, дата).</li><li>CLI-утилита `yarn trends:curate --template drone-tight-curated-v1` переснимает bench на любом датасете с этим шаблоном.</li><li>Документация в `packages/services/trends-detector/README.md` (как использовать prod-шаблон, как кастомизировать для других сценариев).</li></ul> |
| **Роль** | Структурщик (контракт шаблона, версионирование), Математик (валидация параметров). |
| **Размер** | **M** (рефакторинг detection scoring, JSON-экспорт, вспомогательные скрипты). |

---

### 4.3. TimeSyncProvider контракт в @membrana/core

| | |
|---|---|
| **Цель** | Определить интерфейс синхронизации времени между узлом и сервером (GPS-PPS, NTP/PTP, heartbeat-калибровка), потребуемый для TDOA-сервиса. |
| **Пакет / слой** | `@membrana/core` (types, contracts; не реализация). |
| **Связь с WHITE_PAPER** | §5.2 TDOA и мультилатерация: точность зависит от синхронизации времени (целевой джиттер — единицы мс). |
| **Definition of Done** | <ul><li>Тип `TimeSyncProvider` в `packages/core/src/contracts/time-sync/` с методами `getCurrentSyncedTime()`, `getSyncOffset()`, `getJitterMs()`.</li><li>Версионированные контракты: `TimeSyncMethod` = 'gps-pps' \| 'ntp' \| 'ptp' \| 'heartbeat-calibration'.</li><li>Unit-тесты: mock TimeSyncProvider, оценка offsets при различных методах.</li><li>Документ `packages/core/TIME_SYNC_SPEC.md` (требования для каждого метода, типовые ошибки).</li></ul> |
| **Роль** | Структурщик (контракт + иерархия), Математик (модель ошибок, джиттер). |
| **Размер** | **M** (контракт, документация, unit-тесты). |

---

### 4.4. Transport-service скелет (foundation)

| | |
|---|---|
| **Цель** | Создать заготовку `@membrana/transport-service` с поддержкой асинхронной шины событий (очередь при разрывах, дебаунс, replay на переподключении). |
| **Пакет / слой** | `packages/services/transport/` (foundation; не зависит от других analyzer-сервисов). |
| **Связь с WHITE_PAPER** | §4.4 Слияние данных (fusion): transport отделяет сенсорные узлы от фьюжн-слоя, буферизует потерянные события. |
| **Definition of Done** | <ul><li>Базовые типы в `packages/services/transport/src/types.ts`: `TransportEvent`, `EventQueue`, `ReplayStrategy`.</li><li>Интерфейс `TransportService` (singleton): `enqueueEvent()`, `subscribeToEvents()`, `flush()`, `getQueueLength()`.</li><li>Реализация in-memory queue с ограничением по размеру (деградация — drop-old при переполнении).</li><li>Тесты: очередь, дебаунс переподключения, replay, идемпотентность.</li><li>README: архитектура, как подключить к fusion (на этапе 2).</li></ul> |
| **Роль** | Структурщик (интерфейс, иерархия пакета), Математик (стратегия replay, оценка задержек). |
| **Размер** | **M** (контракт, реализация памяти, unit-тесты). |

---

### 4.5. Диагностический гайд: live-анализ 3 DSP на клиенте

| | |
|---|---|
| **Цель** | Обновить `PRESENCE_OFFLINE_DIAGNOSTIC.md` с пошаговой инструкцией: как использовать live 3-DSP brief (`mic-live-drone-analysis`) для быстрой проверки, что микрофон слышит дрон-подобный сигнал (диагностика перед Этапом 2). |
| **Пакет / слой** | Docs / actions; клиент (`apps/client/src/plugins/microphone-stream-viz/`). |
| **Связь с WHITE_PAPER** | §4.2 Сенсорный узел: локальная автономность, буферизация для доказательной базы. |
| **Definition of Done** | <ul><li>Раздел `PRESENCE_OFFLINE_DIAGNOSTIC.md` "§6 Live DSP Brief как диагностика": когда он срабатывает, когда молчит (ложные отрицания / положительные).</li><li>Плагин `mic-live-drone-analysis` в продакшене модуля «Микрофон» (кнопка «Запустить 3-сек анализ» → вывод: isDrone + harmonic/cepstral/spectral-flux confidence).</li><li>Примеры логов и интерпретация для операторов (фон не-дрон, слабый дрон, сильный дрон).</li></ul> |
| **Роль** | Верстальщик (UI плагина), Музыкант (гайд, примеры). |
| **Размер** | **S** (UI finalize + doc update). |

---

### 4.6. Эпик-промпт INTEGRATIONS_STRATEGY уточнение (Этап 1.B подготовка)

| | |
|---|---|
| **Цель** | Подготовить детальный задачник по интеграции zero-shot детекторов (CLAP, YAMNet) в качестве Этапа 1.B (после hard-gate VDR). |
| **Пакет / слой** | `docs/prompts/` (архитектурный разбор, не реализация). |
| **Связь с WHITE_PAPER** | §8 Этап 1.B Neural & Agentic эшелон: `@membrana/clap-detector-service`, `@membrana/yamnet-detector-service`. |
| **Definition of Done** | <ul><li>Документ `docs/prompts/STAGE_1B_NEURAL_ROADMAP.md` (контракты детекторов, какие inference-движки, потребление VRAM, батчинг).</li><li>Таблица zero-shot моделей: CLAP (Laion), YAMNet (Google), их лицензии и требования к железу (CPU vs GPU vs Wasm).</li><li>Архитектурный выбор: где живут веса моделей (client assets vs background-media), как streaming vs batching.</li><li>Дефолтные параметры для free-v1 датасета (score threshold, confidence calibration).</li></ul> |
| **Роль** | Структурщик (архитектура, разбор вариантов), Математик (калибровка + бенчмарк). |
| **Размер** | **M** (исследование, документирование, примеры конфигов). |

---

## 5. Что НЕ делаем на этом горизонте

### 5.1. **Не** повторять unified benchmark harmonic/cepstral/spectral-flux на free-v1
- **Причина:** эшелон 0 (FFT) физически исчерпан (см. `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6). Лучший результат — trends DRONE_TIGHT (95%/30%). Одиночные DSP-детекторы дают FPR 88–100%.
- **Альтернатива:** VDR hard-gate пилот на независимом датасете (4.1) или переход на Этап 1.B (нейро).

### 5.2. **Не** начинать Этап 2 (TDOA, локализация, трекинг) без hard-gate
- **Причина:** WHITE_PAPER §8 stage-gate 1→2 — обязательный шлюз: детекция на одном узле must-pass 85%/90%.
- **Текущий статус:** trends DRONE_TIGHT = 95% recall / 30% FPR (мягкий гейт), но precision ≈ 0.76 < 0.85. Ждём VDR hard-gate.
- **Когда распечатаем TDOA:** только после hard-gate LGTM Teamlead'а.

### 5.3. **Не** писать нейросетевые детекторы без контракта `@membrana/detector-base`
- **Причина:** ARCHITECTURE.md §1e требует единого контракта `DroneDetector`, иначе fusion не сможет их агрегировать.
- **Подготовка:** контракт уже есть (2024); Этап 1.B ждёт INTEGRATIONS_STRATEGY (4.6).

### 5.4. **Не** расширять presence/pairing логику без консилиума
- **Причина:** PCB + PL спринты закончились; дальше — multi-node (PCB-D2, отложено). Новые фичи требуют согласования с transport-service (4.4) и health-ping (уже реализован).

### 5.5. **Не** трогать архитектурные границы пакетов
- Детекторы **не зависят** друг от друга (только `detector-base` и `audio-engine`).
- Новые analyzer-сервисы **не зависят** от других analyzer-сервисов (только foundation).
- Любое нарушение → Teamlead отклоняет PR (см. ARCHITECTURE.md §1).

---

## 6. Проверки в конце периода

### 6.1. VDR hard-gate dataset готов
- ✅ В `docs/datasets/vdr-pilot-2026-07-*/` находится manifest.json с 30–35 сэмплами, разметкой, intra-rater ≥95%.
- ✅ `yarn benchmark:detectors --dataset vdr-pilot` проходит green.

### 6.2. Trends DRONE_TIGHT в prod-каталоге
- ✅ Шаблон экспортирован в `background-media/templates/drone-tight-curated-v1.json`.
- ✅ CLI-утилита работает: `yarn trends:curate --template drone-tight-curated-v1`.

### 6.3. TimeSyncProvider контракт в core
- ✅ Типы в `packages/core/src/contracts/time-sync/index.ts` (экспортируются в публичный API).
- ✅ Unit-тесты в `*.test.ts` (mock provider, offset-оценка).
- ✅ Документ `packages/core/TIME_SYNC_SPEC.md` прочитан Teamlead'ом (LGTM).

### 6.4. Transport-service скелет
- ✅ Пакет создан в `packages/services/transport/` с vite.config.ts, tsconfig.json, package.json.
- ✅ Интерфейс `TransportService` в `src/service.ts`; основной контракт в `src/types.ts` экспортируется из `src/index.ts`.
- ✅ Unit-тесты проходят (очередь, replay, дебаунс).

### 6.5. Диагностический гайд live DSP
- ✅ `PRESENCE_OFFLINE_DIAGNOSTIC.md` §6 написан и проверен на примерах из live-brief.
- ✅ Плагин `mic-live-drone-analysis` включён в device-board (кнопка в UI).

### 6.6. INTEGRATIONS_STRATEGY уточнено для Этапа 1.B
- ✅ Промпт `docs/prompts/STAGE_1B_NEURAL_ROADMAP.md` готов (таблица моделей, inference-опции, параметры).
- ✅ Зарегистрирован в `docs/tasks/registry.json` как вход в эпик 1.B.

---

## Заключение

На следующий день фокус переходит с **инфраструктурной стабилизации** (PCB, PL) на **закрытие Этапа 1.A** (детекция на одном узле) и **подготовку Этапа 2** (многоузловая триангуляция).

**Критический путь:**
1. VDR hard-gate (независимый датасет) — решает, идём ли дальше в TDOA или в нейро.
2. Trends DRONE_TIGHT prodification — утверждаем стандартный FFT-детектор.
3. Контракты (TimeSyncProvider, Transport) — раскрепощают Этап 2.
4. Диагностические гайды — вовлекают операторов в тестирование ферм.

**Не предлагаем магистралью:** повторный benchmark harmonic/cepstral, single-node stage-gate через несколько DSP, расширение Этапа 1.A без hard-gate.