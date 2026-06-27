<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-27
  archived-at: 2026-06-27T16:12:36.672Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-27T06:07:33.818Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

**Дата:** 2026-06-26 (среда), 14:20+03:00  
**Последний коммит:** `4fc37d9` — feat(server-first): cabinet lease, capture follower, Nodes controls (SF0-SF9)  
**Branch:** main

---

## 1. Что сделано за период (последние сутки)

### Инфраструктура серверной части и Desktop-приложение
1. **Cabinet lease & Nodes runtime** — добавлена REST API для редактирования лизинга сценария (`scenarioEditLease.ts`), контрольные команды для узлов (pause/authority на field и cabinet), UI-компоненты `NodesPage` с предпросмотром последнего трека из журнала.
2. **Studio Host bridge & journal bootstrap** — стабилизирована логика инициализации журнала при автономном запуске Studio, исправлены дрейфы Vite-портов и Electron-логирование (scenario-trace-fs, shell-log-scrub).
3. **Desktop logging policy** — вводится новый документ `DESKTOP_APP_LOGGING_POLICY.md`, определены границы хранения телеметрии в Electron-приложении.

### Device-Board: Async-v2 и техдолг
4. **Async-v2 L18–L23** — завершена работа над переколлапсом функций в alpha-граф: исправлены цепочки вызовов clip re-arm, детачед-диспатч для upload/live-bundle, функции восстановления в конкуренции. Smoke-тесты: gate-true=4, upload-ok=4, publish-done=4.
5. **CI техдолг** — удалены недостающие тесты (`night-build-router.test.mjs`, `tasks-audit.test.mjs`), добавлен `yarn test:scripts` в CI-воркфлоу, провержена lint-комплаентность device-board React-хуков.
6. **Media library init** — исправлена гонка: обеспечено ожидание `mediaSvc.init()` перед загрузкой трека в сценарий (issue #178).

### Документирование и процессы
7. **Insights-система** — добавлена регистрация процесса инсайтов, skill-файлы для Membrana-инсайта, 13 новых инсайт-папок (agent-scenario-builder, async-v2-narrative, catalog-pipeline и др.) с RRR-структурой (INSIGHT / RESEARCH / REVIEW).
8. **Opencode proxy эксперименты** — заготовка для LLM-прокси интеграции, примеры конфига (opencode.json.example), консилиум optional-proxy-timer-processes.

---

## 2. Привязка к стратегической цели

### Текущий этап дорожной карты

По **WHITE_PAPER.md § 8 (дорожная карта)**, проект находится в **Этапе 0–1.A (фундамент и DSP-эшелон)** с боковым фронтом **Infrastructure & Desktop Application** (не в основной дорожной карте, но критичный для полевых операций).

| Аспект | Статус | Привязка к этапу |
|--------|--------|-----------------|
| **Захват аудио + FFT-анализ** | ✓ stable | Этап 0 завершён (`audio-engine`, `fft-analyzer`) |
| **DSP-детекторы (harmonic/cepstral/flux)** | scaffold/implemented | Этап 1.A; **но по FFT_METRICS §6 — потолок достигнут** |
| **Trends-FFT + DRONE_TIGHT** | ✓ ready (F1 0.844, recall 95%, FPR 30%) | Этап 1.A completion — **продакшн-кандидат** |
| **Multi-node sync, TDOA, локализация** | ⛔ frozen | Этап 2 (после stage-gate 1→2) |
| **Трекинг и счётчик целей** | ⛔ frozen | Этап 4 (зависит от Этапа 2) |
| **Desktop приложение + Cabinet API** | ✓ active | инфраструктура, поддерживает полевые операции |

### Что приближает к цели
- **trends-fft с DRONE_TIGHT** — это готовый и валидный детектор для stage-gate 1→2; нужно лишь промотить в curated-каталог (`template-match`) и переснять benchmark.
- **Device-Board async-v2 + journal bootstrap** — обеспечивает надёжную запись сценариев и трэков на узлах; готово для полевых deployment-сценариев.
- **Cabinet REST API** — позволит управлять узлами удалённо (pause, authority) — необходимо для *будущей* multi-node фьюжн-архитектуры.

### Что нейтрально
- **Insights-система** — вспомогательная документация и аналитика, не влияет на core-функциональность детектора.
- **Opencode proxy** — экспериментальная интеграция с LLM, не заблокирует этапы.

### Недостающие сервисы (по стратегии)

Для **Этапа 2–4** потребуются (сейчас заморожены, помечены как reserved в core):

| Сервис | Статус | Нужен для |
|--------|--------|-----------|
| `@membrana/tdoa-service` | reserved | Этап 2: извлечение времён прихода между узлами |
| `@membrana/localizer-service` | plan | Этап 3: мультилатерация, координаты источников |
| `@membrana/tracker-service` | plan | Этап 4: трекинг целей, фильтр Калмана, счётчик |
| `@membrana/transport-service` | plan | foundation: шина событий узел↔сервер, async/realtime |
| `@membrana/detection-ensemble-service` | plan | Этап 1.B: агрегация результатов детекторов (после stage-gate) |

---

## 3. Риски и долг

### Технические риски

1. **Зависание на FFT-потолке** — до stage-gate 1→2 нужна **валидация DRONE_TIGHT на реальных полевых данных**. Текущие метрики на free-v1 train/val, но **live-данные** могут показать деградацию (шум города, ветер, другие дроны). *Рекомендация:* параллельно с promotion DRONE_TIGHT запланировать **validated dataset** (VDR) эпик с метками оператора.

2. **Desktop Electron + IPC телеметрия** — новая logging-политика вводится, но нет полной аудита утечек приватных данных. `shell-log-scrub` начинает работать, но требует **полная инвентаризация сенсорных логов** перед prod-deployment. *Риск:* случайная запись микрофонного буфера в лог.

3. **Device-Board async-v2 стабильность** — smoke-тесты показывают gate-true=4, но это минимум. Нужна **production-grade нагрузка-тестирование** перед использованием в полях с десятками узлов и длительных сценариев.

4. **Отсутствие TDOA/локализации** — Cabinet API готов управлять узлами, но нет backend-логики для слияния их наблюдений. Узлы будут продолжать работать автономно (не связанными).

### Накопленный долг

- **Unified benchmark детекторов** — harmonic/cepstral/spectral-flux живут отдельно, каждый с собственными порогами. По FFT_METRICS §4 это no-go как магистраль, но документация требует **чистой таблицы метрик** с объяснением, почему каждый детектор используется для диагностики, а не селекции. → *Задача `db3h-s1-tech-debt`: Cleanup detector README и добавить warning в `@membrana/harmonic-detector-service`, `cepstral`, `spectral-flux`.*

- **Desktop logging audit** — `DESKTOP_APP_LOGGING_POLICY.md` написан, но не провержен для всех точек IPC. → *Задача `db3h-s5-desktop-logging`: сканирование логов на содержание сырого аудио/рочных данных.*

- **Stage-gate 1→2 критерии** — в WHITE_PAPER сказано P≥85%, R≥90%; trends достигает R=95%, P=0.76 (F1=0.844). Это **не проходит** исходный gate по precision. Нужно **явно переопределить gate** или выбрать другой путь (nfft/zero-shot). → *Задача на Teamlead: consilium stage-gate-revision.*

### Нарушения границ пакетов (по diff)

- **GOOD:** Cabinet и Client опираются на `@membrana/core` без циклических импортов; Device-Board graph-система остаётся самостоятельной.
- **ATTENTION:** В `apps/cabinet` много чистых TS-утилит (cabinetNodeRuntimeCommands, findLastJournalTrack, fetchNodeTrackBlobUrl) — потом их может потребоваться выделить в отдельный `@membrana/cabinet-service`, но сейчас это локально в приложении, что допустимо.

### Ограничения из WHITE_PAPER, релевантные сейчас

- **Скорость звука** (WHITE_PAPER §5.3) — мы пока не сталкиваемся, т.к. работаем с одним узлом на free-v1. Когда перейдём на TDOA (Этап 2), задержка ~340 м/с станет критична; нужна точная синхронизация GPS-PPS.
- **Многолучёвость** (§5.3, risks table) — акустические отражения от зданий; фьюжн-слой (Этап 3) должен использовать GCC-PHAT и медианные фильтры. Пока не актуально.

---

## 4. План на следующий день

### Задача 1: Promotion trends-fft DRONE_TIGHT в curated-каталог

**Цель:** Перенести шаблон `DRONE_TIGHT` из одноразовых тестов (эпик #84) в **постоянный curated-каталог** `template-match` и обновить `@membrana/trends-detector-service` с дефолтным указанием на этот шаблон.

**Пакет / слой:** `packages/services/trends-detector/` + `@membrana/background-media` (curated catalog).

**Связь с WHITE_PAPER:** Этап 1.A completion (stage-gate 1→2), принцип §3 «чистая математика отдельно от железа» (шаблоны — данные, детектор — логика).

**Definition of Done:**
- [ ] Шаблон `DRONE_TIGHT` (thresholds, temporal-features, frameHitRatio) добавлен в `background-media` curated-каталог с версией и метаданными.
- [ ] `trends-detector-service` загружает этот шаблон по умолчанию при инициализации.
- [ ] Запущен `yarn benchmark:detectors` на свежем шаблоне; результаты залиты в `docs/datasets/week-2026-06-27/trends-promotion-benchmark.md`.
- [ ] Unit-тесты trends-детектора проверяют корректность скоринга на mock-окнах (3+ случая: drone-tight-match, not-drone-reject, edge-case).

**Роль:** Математик (валидация шаблона) + Музыкант (интеграция в background-media catalog).

**Размер:** M.

---

### Задача 2: Audit & cleanup DSP-детекторов (harmonic, cepstral, spectral-flux)

**Цель:** Явно задокументировать, что **три DSP-детектора больше НЕ являются кандидатами для автономной детекции** на free-v1 (см. FFT_METRICS §4, потолок FPR=88–100%). Добавить warning в README каждого, уточнить их роль (диагностика, быстрые индикаторы, объяснимость в журналах).

**Пакет / слой:** `packages/services/detectors/harmonic-detector/`, `cepstral-detector/`, `spectral-flux-detector/`; документы.

**Связь с WHITE_PAPER:** Принцип §3 (чистая математика), этап 1.A (Single-Node Detection First завершён потолок достигнут). **НЕ** продлевать ложные надежды на одиночные DSP.

**Definition of Done:**
- [ ] Каждый детектор имеет обновлённый `README.md` с секцией **«Роль в системе»** и ссылкой на FFT_METRICS §4.
- [ ] В каждом файле `service.ts` добавлен JSDoc-комментарий: `@deprecated-as-primary Используй для диагностики и объяснимости, не для автономной селекции. Порог FPR ~88–100% на free-v1.`.
- [ ] Все пороги и настройки перепроверены против свежих бенчмарков (из задачи 1). Если что-то изменилось — обновлены дефолты.
- [ ] `packages/services/detectors/README.md` содержит сводную таблицу: какой детектор для чего нужен (harmonic → гармонический анализ, cepstral → быстрая F0-оценка, spectral-flux → стабильность).

**Роль:** Структурщик (архитектурная согласованность) + Музыкант (рефакторинг/тестирование).

**Размер:** M.

---

### Задача 3: Scaffold & reserve TDOA-service для Этапа 2

**Цель:** Создать baseline-пакет `@membrana/tdoa-service` с интерфейсами и типами, чтобы он был **готов к реализации** после stage-gate 1→2. Сейчас — только scaffold, тесты, документация.

**Пакет / слой:** Новый пакет `packages/services/tdoa-service/` (analyzer, зависит от `@membrana/core` + `audio-engine-service`).

**Связь с WHITE_PAPER:** Этап 2 (Network), §4.4 (Локализация — TDOA). Заморозить до gate 1→2, но структура должна быть готова.

**Definition of Done:**
- [ ] Структура пакета: `src/math/tdoa-calc.ts` (чистые функции расчёта задержки по GCC-PHAT), `src/core/tdoa-engine.ts` (life-cycle), `src/hooks/useTdoa.ts`, `src/types.ts`, `src/index.ts`.
- [ ] `types.ts` определяет: `TdoaInput { observations: AcousticObservation[] }`, `TdoaOutput { pairwiseDelays: { nodeA, nodeB, delayMs, confidence } }`.
- [ ] `README.md` объясняет GCC-PHAT алгоритм, требования к синхронизации времени (миллисекундная точность), ограничения скорости звука (§5.3 WHITE_PAPER).
- [ ] Smoke-тест: на mock-наблюдениях (два узла, известная разница времён) проверяется, что расчёт совпадает с аналитическим ожиданием в пределах погрешности.
- [ ] Пакет в `tsconfig.json` помечен как `// @stage 2 FROZEN` (не собирается в dev).

**Роль:** Структурщик (scaffold) + Математик (типы и алгоритм GCC-PHAT).

**Размер:** M.

---

### Задача 4: Desktop logging audit (DB3H-S5 спринт)

**Цель:** Провести полный аудит Electron IPC-логирования на предмет утечек сырого аудио, микрофонных буферов, персональных данных. Обновить `DESKTOP_APP_LOGGING_POLICY.md` с конкретными контрольными точками.

**Пакет / слой:** `apps/membrana-studio/` (Electron app), `docs/DESKTOP_APP_LOGGING_POLICY.md`.

**Связь с WHITE_PAPER:** §10 (Этика и право) — приватность буферов, локальные логи должны быть защищены.

**Definition of Done:**
- [ ] Полный список IPC-каналов и логирующих функций в `apps/membrana-studio`: скан по `console.log`, `logger.*`, `ipcRenderer.send`, `ipcMain.on`.
- [ ] Добавлены или уточнены фильтры в `shell-log-scrub.ts` для исключения: AAC-буферов, WAV-заголовков, путей микрофонных файлов, user-specfic paths.
- [ ] В каждом IPC-обработчике добавлен джаспер-комментарий типа `// ✓ no sensitive data` или `// ⚠️ filters applied: shell-log-scrub.excludePattern(...)`.
- [ ] Документ `DESKTOP_APP_LOGGING_POLICY.md` содержит чек-лист для code-review (20–30 пунктов) и примеры безопасных логов.
- [ ] E2E-тест: запуск Studio, захват сценария, проверка, что логи НЕ содержат `[0-9a-f]{8,}` (hex-фрагменты буферов).

**Роль:** Верстальщик (аудит логирования) + Структурщик (политика и чек-листы).

**Размер:** L.

---

### Задача 5: Stage-gate 1→2 review consilium (подготовка к gate)

**Цель:** Провести консилиум с командой (Teamlead + Математик + Структурщик): **критерии gate 1→2 должны быть явно переопределены** в свете results из FFT_METRICS. Принять решение: идти ли в Этап 2 с trends R=95%/P=0.76, или требовать улучшения до P≥85%.

**Пакет / слой:** Документирование, процесс (не код).

**Связь с WHITE_PAPER:** §8 (дорожная карта, stage-gate 1→2), §11 (метрики успеха). Решение повлияет на сроки Этапа 2 и стратегию улучшения качества.

**Definition of Done:**
- [ ] Документ `docs/seanses/stage-gate-1-2-consilium-2026-06-27.md` содержит: вывод FFT_METRICS, текущие метрики trends, альтернативы (nfft увеличение, zero-shot нейро, validated dataset).
- [ ] Teamlead подписывает решение: **GO** (начинаем Этап 2 с trends) или **NO-GO, требуется...** (уточнить следующие шаги).
- [ ] Если GO: обновлена `DETECTOR_BENCHMARK.md` с явным указанием `DRONE_TIGHT` как baseline для gate, установлены **ожидания от live-данных** (может быть деградация до R=90%/P=0.70).
- [ ] Если NO-GO: создана epic-задача для либо VDR (validated dataset), либо zero-shot эшелон 2.

**Роль:** Teamlead (решение) + Структурщик (документирование процесса).

**Размер:** S (процесс).

---

### Задача 6: Утепление device-board async-v2 нагрузочными тестами

**Цель:** Дополнить существующие smoke-тесты (gate-true, upload, publish) **нагрузочными сценариями**: 10 одновременных сценариев, 30-минутный loop recording, корректное завершение без зависаний.

**Пакет / слой:** `packages/device-board/src/graph/` (тесты), `scripts/test-*.mjs` (CI).

**Связь с WHITE_PAPER:** Этап 4 (масштабирование), §9 (доступность > 99%).

**Definition of Done:**
- [ ] Новый тест `usercase-async-v2-load.test.ts`: запускает 10 параллельных микрофонных сценариев, каждый 3 минуты.
- [ ] Метрики: time-to-upload, memory-peak, clip-completion-rate. Пороги: upload < 5s, memory < 200MB, completion > 99%.
- [ ] Тест запускается в CI на каждый PR; результаты логируются в `docs/db-load-test-results/`.
- [ ] Если smoke-тесты проходят (gate-true=10, upload=10, publish=10), статус GREEN; иначе FAIL-и анализ.

**Роль:** Структурщик (scaffold тестов) + Музыкант (реализация load-сценариев).

**Размер:** M.

---

### Задача 7: Расширение Cabinet API: read/write device state

**Цель:** Добавить REST endpoints для чтения состояния узла (последний трек, ошибки, статус микрофона) и **пакетной записи** (несколько узлов одновременно). Подготовить к multi-node фьюжн (Этап 2–3).

**Пакет / слой:** `packages/background-cabinet/` (NestJS), `apps/cabinet/` (UI).

**Связь с WHITE_PAPER:** Этап 4 (масштабирование сети), §4.1 (слой fusion нужен read-данные от всех узлов).

**Definition of Done:**
- [ ] Новые endpoints: `GET /api/nodes/:nodeId/state` (last-track, mic-status, errors), `POST /api/nodes/batch-state` (list of nodeIds, returns states).
- [ ] DTO с типами: `NodeStateDto { lastTrackId?, micStatus, lastErrorAt?, batteryLevel?, gpsLocked? }`.
- [ ] Unit-тесты (mock room): 5 узлов, запрос batch-state, проверка что все ответили.
- [ ] UI на NodesPage: таблица узлов с live-statuses, обновление каждые 2 сек (через WebSocket или polling).
- [ ] Документ `docs/CABINET_API_REFERENCE.md` содержит примеры curl-запросов.

**Роль:** Верстальщик (Cabinet UI) + Структурщик (API дизайн).

**Размер:** M.

---

## 5. Что НЕ делаем на этом горизонте

1. **Unified benchmark harmonic/cepstral/spectral-flux на free-v1 без нового датасета** — Эпик #84 исчерпал потенциал DSP (FPR = 88–100%). Переснимать бенчмарк имеет смысл только если: (а) изменился датасет (VDR-эпик), (б) появился новый алгоритм, (в) добавился нейро-фьюжн (эшелон 2). См. FFT_METRICS §6 «Достигнутый предел». *Текущие ресурсы идут на promotion trends и audit (задачи 1–2).*

2. **Реализация многоузловой синхронизации и TDOA без stage-gate 1→2** — WHITE_PAPER §8 явно замораживает Этап 2 до прохождения gate. Cabinet API (задача 7) — подготовка инфраструктуры, но сами TDOA-расчёты начнутся только после consilium-решения.

3. **Интеграция нейросетевых детекторов (YAMNet, CLAP)** — Это Этап 1.B (после gate 1→2). Сейчас ещё рано; сначала нужно валидировать trends на реальных полевых данных.

4. **Расширение модальностей (RF-приёмник, видео)** — WHITE_PAPER §6 (Этап 6). Архитектура (`SERVICES.md` §3) уже предусмотрела место для них, но реализация только после мультилатерации (Этап 3–4).

5. **Мобильные узлы, активное/отражательное зондирование** — WHITE_PAPER §14 (горизонт за пределами Этапа 7, дальняя перспектива). Не рассматриваем в текущем цикле.

---

## 6. Проверки в конце периода

1. **Trends DRONE_TIGHT в curated-каталог** — Файл `background-media/catalogs/templates/DRONE_TIGHT.json` существует, `yarn benchmark:detectors` показывает recall ≥ 95%, FPR ≤ 30% на val. Плагин trends-analyzer загружает этот шаблон по умолчанию без ошибок.

2. **DSP-детекторы помечены как диагностические** — В README трёх детекторов (harmonic, cepstral, spectral-flux) есть warning-секция, в коде — `@deprecated-as-primary` комментарии. CI не выбросит ошибку, но PR-review должен подтвердить понимание того, что это не путь роста качества.

3. **TDOA-service scaffold готов и frozen** — Пакет `packages/services/tdoa-service/` имеет структуру, типы, README, smoke-тест. Сборка исключена из dev (tsconfig.json помечен @stage 2).

4. **Desktop logging policy документирован с чек-листом** — `DESKTOP_APP_LOGGING_POLICY.md` содержит 20+ пунктов аудита, примеры безопасных логов, исключаемые паттерны. E2E-тест проходит без утечек hex-буферов.

5. **Stage-gate 1→2 решение документировано** — Консилиум-заметки в `docs/seanses/stage-gate-1-2-consilium-2026-06-27.md` содержат явное решение (GO / NO-GO) и следующие шаги. Если GO — `DETECTOR_BENCHMARK.md` обновлён с ожиданиями для live-данных.

6. **Device-Board load-тесты в CI** — `yarn test:db-load` запускается в воркфлоу, результаты логируются. Smoke-метрики (gate-true, upload-ok, publish-done) все ≥ 10.

7. **Cabinet API endpoints для batch-read узлов** — `GET /api/nodes/batch-state` возвращает JSON с statuses 5+ узлов, UI на NodesPage отображает таблицу с live-обновлением. E2E-тест проходит.

---

**Подпись:** Стратегический планировщик проекта Membrana  
**Дата составления:** 2026-06-26, 14:20+03:00