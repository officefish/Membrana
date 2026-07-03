<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-03
  archived-at: 2026-07-03T13:49:15.651Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-03T04:54:55.258Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день (2026-07-03)

## 1. Что сделано за период (последние сутки, since="2026-07-02")

### Device Board Capture Tariff v2 (эпик завершён)
- **CT0–CT9**: полный цикл реализации явного захвата устройства вместо неявного run=capture.
  - **@membrana/core** (CT1): контракты `board.capture/heartbeat/release`, `selectScenario`, `run{scenarioId}`, `stop{fadeOutMs}` с деградацией v1-поверхности (@deprecated).
  - **background-cabinet** (CT2): `DeviceCaptureService`, REST-захват, TTL 5m auto-release, вытеснение с `fadeOutMs:200`, gateway whitelist enforcement.
  - **apps/cabinet** (CT3): REST API `capture(mode)/release`, мост на WS (board.capture/heartbeat/release broadcast), UI кластер Захватить/Отпустить.
  - **apps/client** (CT4): `serverFirstStore` ось capture, TTL-таймер 5m, follower enforcement (hard блокирует run, soft разрешает last-write-win), boardLeaseBridge синхронизация.
  - **packages/audio-engine** (CT6): `fadeOutMs` в `BufferPlayer`, `playback-registry`, остановка вытеснённого воспроизведения.
  - **device-board** (CT5): `CaptureAlertToasts`, badges v2 (мягкий/жёсткий/TTL), a11y aria-live, server-first flags enforcement.
  - **Wire CT7**: удаление pause/resume/setMode из wire (tariff v3), legacy-sync упрощение.
  - **Docs CT9**: ARCHITECTURE обновлена под v2, DEVICE_BOARD_SERVER_FIRST v2.0 финализирована, DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md runbook.

### Инфраструктурные спринты
- **Tailwind Coverage Hardening** (TWC-L1/L2, PR #225): per-package README frontmatter, `generate-tailwind-configs.mjs`, CI gate `verify:tailwind-coverage`.
  - **Cabinet fix** (PR #224): tailwind content глобы для device-board + core (node/minimap layout).
- **CI-gate stabilization** (CG1–CG4): регистрация спринта; обнаружена проблема `pull_request.branches` для feat/* (workaround: `workflow_dispatch`).

### Завершение эпиков и архивация
- Device Board Capture Tariff v2 эпик архивирован (CT0–CT9 merged в main, prod-gate E2E на окно деплоя cabinet).
- Tailwind Coverage Hardening эпик архивирован.
- Evening ritual: DAILY_CODE_REVIEW, MAIN_DAY_ISSUE, STRATEGIC_PLAN_DAY архивированы в `docs/archive/daily-day/2026-07-02/`.

---

## 2. Привязка к стратегической цели

### Текущая позиция на дорожной карте
По WHITE_PAPER §8, система находится на **рубеже Этапа 0–1.A**:
- ✅ **Этап 0** (Фундамент): `audio-engine` и `fft-analyzer` полностью работают.
- 🔄 **Этап 1.A** (DSP-эшелон): три детектора (`harmonic`, `cepstral`, `spectral-flux`) реализованы, но их качество на free-v1 не проходит stage-gate (см. FFT_METRICS §4).
- ⏸️ **Этап 2–4** (Мультиузел, TDOA, локализация, трекинг): заморожены до stage-gate 1→2.

### Что сделано — уточнение стратегии
**Сделанное за сутки** относится **отдельно** к детекции:
1. **Device Board Capture v2** — это **тактическое** улучшение управления сценариями на полевых узлах (Cabinet ↔ Client), не продвигает детекцию напрямую.
2. **CI-gate & Tailwind** — инфраструктурные задолженности (нет дефектов в коде детекции).
3. Архитектурных нарушений **не обнаружено**; граф зависимостей `@membrana/core` → foundation → analyzer остаётся чистым.

### Недостающие сервисы и что срочно нужно
По WHITE_PAPER §6 и ARCHITECTURE §1a:
- ❌ **`@membrana/detection-ensemble-service`** — агрегатор результатов трёх DSP-детекторов (stage-gate конкурент trends-fft).
- ❌ **`@membrana/tdoa-service`** — разница времён прихода (заморожен до stage-gate 1→2).
- ❌ **`@membrana/localizer-service`** — мультилатерация (заморожен).
- ❌ **`@membrana/tracker-service`** — трекинг целей (заморожен).
- ❌ **`@membrana/transport-service`** — шина событий узел ↔ сервер (заморожен).

### Осознание по детекции (FFT_METRICS_POTENTIAL_AND_LIMITS.md §6)
**Эшелон 0 DSP/FFT на free-v1 исчерпан:**
- Сырые покадровые метрики (centroid/flux/rms) + голосование — потолок ~75% recall / 40% FPR.
- **Trends FFT с DRONE_TIGHT** — единственный FFT-кандидат продакшена (recall 95% / FPR 30% / F1 0.844, stage-gate пройден).
- Гармонический, кепстральный, spectral-flux по отдельности — **no-go как детекторы** (FPR 88–100%); только диагностика.
- **Дальнейший рост** — за пределами DSP: нейро (YAMNet/CLAP zero-shot) и validated data (VDR).

### Видимые отвлечения
- **Tailwind coverage** (TWC-L1/L2) — необходимая техдолг, но косвенно релевантна детекции.
- **CI-gate stabilization** (CG1–CG4) — решение боли в CI, зелёная линия важна, но не продвигает функцию.
- **Cabinet Deploy Friction** — управленческий спринт (не вычислительный).

---

## 3. Риски и долг

### Технические риски

| Риск | Статус | Как смягчаем |
|------|--------|------------|
| **Single-Node Detection First stage-gate не ломается, но FFT-эшелон потолок зафиксирован** | 🟠 Aktual | Не повторять бенчмарк harmonic/cepstral/flux на free-v1; переходить на trends/validated data или эшелон 2 (нейро). |
| **Мультиузловая синхронизация (TDOA) зависит от GPS-PPS**, которого нет в текущей lab-среде | 🟠 Aktual | TDOA-сервис должен быть готов к обогащению NTP/PTP данными; пока заморожен до stage-gate. |
| **Многолучёвость (отражение от зданий)** искажает TDOA на **10–30 м** — предусмотрено в WHITE_PAPER §9 | 🔵 Known | Архитектурно решено: избыточность узлов, robust-оценки (GCC-PHAT). Реализация отложена на Этап 3. |
| **Скорость звука меняется с метеоусловиями** на **±1–2%** | 🔵 Known | Модель калмановского фильтра должна учитывать. Реализация отложена на Этап 4. |

### Накопленный долг

1. **CI-gate flaky tests (CG4)** — обнаружена проблема `pull_request.branches` для feat/*; недокрыта часть B (CI-gate granularity). Следующий консилиум.
2. **Studio App** — device-board-capture-tariff-v2 скоуп не включал Studio; требует отдельного спринта (зафиксировано в консилиуме 2026-07-02).
3. **Validated Dataset (VDR)** — free-v1 используется для trends; для нейро-эшелона нужны размеченные вручную дроны/не-дроны (эпик отсутствует).
4. **Template-match catalog** — trends работает с `DRONE_TIGHT`-шаблоном; полный curated catalog требует интеграции с background-media (взаимосвязь не продумана).

### Нарушения границ пакетов
**Обнаружены?** Нет. `@membrana/core` → foundation → analyzer граф чист; cabinet ↔ client общаются только через WS + REST (согласно ARCHITECTURE §1).

---

## 4. План на следующий день

### Приоритет 1: Stabilization & Validation

#### Task 4.1 — Запуск CI-gate stabilization спринта (CG1–CG3)
- **Цель**: зафиксировать flaky-тесты в CI, восстановить зелёный статус для main.
- **Пакет / слой**: корневая инфра (GitHub Actions, CI workflow).
- **Связь с WHITE_PAPER**: §0 — инфраструктурное качество.
- **Definition of Done**:
  1. Выявлены все тесты с intermittent failures (yarn test:ci на 5 прогонах).
  2. Pull request в feat/ci-gate-flaky-fix с выключением или переписью ненадёжных assertion-ов.
  3. CI зелёный на main + scheduled-ci workaround документирован в docs/CI_GATE_STABILIZATION_SPRINT_PROMPT.md.
- **Роль**: Структурщик (планирование + assessment), Верстальщик (workflow правки).
- **Размер**: M.

#### Task 4.2 — Обновление docs/DETECTOR_BENCHMARK.md с новой интерпретацией эшелона 0
- **Цель**: зафиксировать вердикт FFT_METRICS §4–6 как обязательный контекст для будущих детекторных задач.
- **Пакет / слой**: документация (`docs/`), не код.
- **Связь с WHITE_PAPER**: §8 Stage-gate 1→2, принцип Single-Node Detection First.
- **Definition of Done**:
  1. Таблица в DETECTOR_BENCHMARK.md: recall/FPR для trends-DRONE_TIGHT, harmon./cepstral/flux по отдельности, OR-консенсус.
  2. Явная заметка: «Дальше рост — trends + CLAP/YAMNet (эшелон 2) или VDR» (см. FFT_METRICS §6).
  3. Ссылка на FFT_METRICS_POTENTIAL_AND_LIMITS.md как обязательное чтение.
- **Роль**: Структурщик (консолидация), Музыкант (валидация чисел).
- **Размер**: S.

### Приоритет 2: Продуктивность детекции (trends-DRONE_TIGHT → кураторский каталог)

#### Task 4.3 — Интеграция trends-DRONE_TIGHT в background-media (template catalog)
- **Цель**: опубликовать `DRONE_TIGHT`-шаблон в curated-катлалоге background-media, сделать его доступным для client через media-library-service.
- **Пакет / слой**: `packages/background-media` (NestJS), `@membrana/media-library-service` (analyzer), docs.
- **Связь с WHITE_PAPER**: §5 Контракт наблюдений, §8 Этап 1.A (trends как лучший FFT-детектор).
- **Definition of Done**:
  1. Prisma-модель `TrendTemplate` с fields: `key` ('DRONE_TIGHT'), `centroidRange`, `fluxRange`, `rmsRange`, `temporalFeatures` (JSON).
  2. REST-endpoint `/trends-templates` (GET, cached).
  3. `@membrana/trends-detector-service` загружает каталог из media-library-service.
  4. `yarn benchmark:detectors` переснят с DRONE_TIGHT из каталога → report в docs/datasets/.
- **Роль**: Музыкант (интеграция шаблона), Структурщик (API контракт).
- **Размер**: L.

#### Task 4.4 — Калибровочный плагин для trends в client (live-калибрация пользователем)
- **Цель**: дать оператору UI для экспериментирования с bounds-ами trends на реальном микрофоне (ручная настройка DRONE_TIGHT).
- **Пакет / слой**: `apps/client` (плагин), `@membrana/trends-detector-service` (конфигурируемость).
- **Связь с WHITE_PAPER**: §4.6 Ситуационный слой, интерактивная диагностика.
- **Definition of Done**:
  1. Компонент `TrendCalibrationPanel` (слайдеры для centroidMin/Max, fluxMin/Max, rmsMin/Max, temporalThresholds).
  2. Live-график спектральных метрик + попадание в текущий бокс (зелёный/красный).
  3. Export калиброванных параметров в JSON.
  4. Плагин регистрируется в `registerClientModules.ts` (lazy-loaded, см. ARCHITECTURE §1c).
- **Роль**: Верстальщик (компоненты), Математик (визуализация метрик).
- **Размер**: M.

### Приоритет 3: Фундамент для эшелона 2 (нейро)

#### Task 4.5 — Scaffold @membrana/clap-detector-service (контракт, заглушка)
- **Цель**: создать пакет-сервис CLAP (Contrastive Language-Audio Pre-training) как analyzer-уровня детектор, готовый к zero-shot детекции дронов (без fine-tune на free-v1).
- **Пакет / слой**: `packages/services/detectors/@membrana/clap-detector-service` (analyzer, зависит от detector-base + audio-engine).
- **Связь с WHITE_PAPER**: §8 Этап 1.B Neural & Agentic, эшелон 2.
- **Definition of Done**:
  1. Структура: `src/math/clap-model.ts` (загрузка модели CLAP из Hugging Face или локально), `src/core/clap.ts` (инференс), `src/hooks/useClapDetector.ts`.
  2. Контракт `DroneDetector` из `detector-base` реализован (методы `detect(window)`, `getConfig()`).
  3. Unit-тесты на mock AudioWindow; latency p95 measure (цель < 500ms на CPU).
  4. Интеграция в `@membrana/detector-report` (optional; за флагом эшелон2:enabled).
  5. README с примером использования.
- **Роль**: Математик (CLAP-инференс), Структурщик (контракт).
- **Размер**: L.

#### Task 4.6 — Scaffold @membrana/yamnet-detector-service (аналогично CLAP)
- **Цель**: YAMNet (Google Audio Model) как второй zero-shot конкурент (особенно для классификации «мульти-ротор vs крыло»).
- **Пакет / слой**: `packages/services/detectors/@membrana/yamnet-detector-service` (analyzer).
- **Связь с WHITE_PAPER**: §8 Этап 1.B, классификация.
- **Definition of Done**:
  1. Аналогично CLAP (контракт, инференс, hooks, latency).
  2. Особенность: выход — не бинарный «дрон / не дрон», а распределение по классам (aircraft, helicopter, drone, wind, rain, …).
  3. Адаптер в `detector-report`: агрегация классов в бинар isDrone (если класс ∈ {drone, helicopter, aircraft}).
- **Роль**: Математик, Структурщик.
- **Размер**: L.

### Приоритет 4: Документирование ограничений

#### Task 4.7 — Дополнить WHITE_PAPER §9 оценкой SNR-требований и шумового профиля
- **Цель**: явно задокументировать, какой SNR требуется для детекции дрона в городской среде, чтобы будущие field-тесты имели метрику.
- **Пакет / слой**: `docs/WHITE_PAPER.md` (раздел 9 Ограничения).
- **Связь с WHITE_PAPER**: §9 Ограничения и риски.
- **Definition of Done**:
  1. Добавлена таблица: сценарий (открытое поле / город днём / город ночью / дождь) → требуемый SNR для дрона → рекомендуемая позиция микрофона.
  2. Ссылка на ESC-50 / DCASE шумовые классы и как они маппятся на non-drone в free-v1.
  3. Явное: «Ночная фоновая сигнала ниже, но меньше помех от ветра; город требует большей чувствительности».
- **Роль**: Музыкант (акустические меры), Структурщик (интеграция).
- **Размер**: S.

---

## 5. Что НЕ делаем на этом горизонте

1. **Не повторяем unified benchmark harmonic + cepstral + spectral-flux на free-v1 без нового датасета.**
   - Причина: FFT_METRICS §4 чётко показал FPR ≈ 88–100% для каждого из них. Переснятие бенчмарка без изменения данных или алгоритма — потраченное время.
   - Исключение: если появится validated dataset или новый метод (например, сочетание с trends в ensemble-сервисе).

2. **Не начинаем Этап 2 (TDOA, мультиузловую синхронизацию) без stage-gate 1→2.**
   - Причина: stage-gate требует precision ≥ 85% и recall ≥ 90% на одном узле. Trends-DRONE_TIGHT пока покрывает soft-цель (80%/40%), а не hard (85%/90%). Многоузловая архитектура даст прирост, но не компенсирует слабый одиночный детектор.
   - Шаги: (а) валидировать trends на реальных данных; (б) интегрировать YAMNet/CLAP для диверсификации; (в) только потом TDOA.

3. **Не выделяем @membrana/detection-ensemble-service до явного запроса.**
   - Причина: OR-консенсус трёх DSP-детекторов имеет FPR ~100% (сигнализатор присутствия, не селектор). Ensemble имеет смысл только когда есть несколько качественных детекторов (trends + YAMNet + CLAP).
   - Возможное: планировать на следующий спринт, когда scaffold YAMNet/CLAP завершены.

4. **Не трогаем transport-service / fusion-layer / TDOA-service / localizer-service / tracker-service.**
   - Причина: заморожены до stage-gate. Их незавершённость не блокирует текущий прогресс (не импортированы клиентом, не связаны с детекцией).
   - Зависимость: как только завершена детекция (эшелон 1.A/1.B), возможна разработка TDOA, но независимо в отдельном спринте (эшелон 2).

5. **Не выполняем Studio App спринт в этом окне.**
   - Причина: консилиум 2026-07-02 явно исключил Studio из device-board-capture-tariff-v2 скоупа. Его требует отдельный спринт.

---

## 6. Проверки в конце периода

1. **CI зелёный на main после CG1–CG3.**
   - Артефакт: PR с CI-gate fixes merged, GitHub Actions green для всех commits на main.
   - Метрика: 0 intermittent failures на 3 последовательных прогонах scheduled-ci.

2. **DETECTOR_BENCHMARK.md обновлена и ссылается на FFT_METRICS.**
   - Артефакт: commit в docs/ с таблицей trends/harmonic/cepstral/flux результатов.
   - Проверка: ревью Teamlead-ом; присутствие текста «дальше рост — эшелон 2 или VDR».

3. **Background-media интеграция trends-DRONE_TIGHT завершена.**
   - Артефакт: Prisma migration, REST-endpoint, cached каталог.
   - Проверка: `yarn benchmark:detectors` переснят с DRONE_TIGHT из каталога, результат в docs/datasets/week-2026-07-03/.

4. **TrendCalibrationPanel компонент live в client.**
   - Артефакт: UI плагин открывается в меню; слайдеры управляют bounds-ами в реальном времени.
   - Проверка: live-график на микрофонном потоке показывает попадание/непопадание метрик в бокс.

5. **Scaffolds YAMNet + CLAP готовы к инференсу.**
   - Артефакт: оба сервиса имеют структуру, контракт DroneDetector реализован, unit-тесты проходят.
   - Проверка: `yarn build packages/services/detectors/*` без ошибок; README содержит примеры use.

6. **WHITE_PAPER §9 дополнена SNR-таблицей.**
   - Артефакт: commit в docs/WHITE_PAPER.md.
   - Проверка: ревью Teamlead; ссылка на ESC-50 присутствует; явные сценарии (город / поле / ночь).

---

## Резюме

**Стратегическое движение**: Закрепляем эшелон 0 (trends-DRONE_TIGHT пройден через stage-gate soft), готовимся к эшелону 2 (YAMNet/CLAP zero-shot). Device Board Capture v2 — успешно завершён; инфраструктура стабилизируется (CI-gate, Tailwind).

**Тактическое фокусирование**: Не ломаем FFT-бенчмарки заново, не начинаем мультиузловый TDOA без валидации одиночной детекции. Инвестируем в validated data и нейро-детекторы как путь через stage-gate к эшелону 2.

**Команда готова**: Каждая задача привязана к роли и размеру; нет календарных обещаний, только техническая ясность.