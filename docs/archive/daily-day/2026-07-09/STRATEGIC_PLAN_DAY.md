<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-09
  archived-at: 2026-07-09T18:25:46.691Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-09T06:12:45.744Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день — Membrana

## 1. Что сделано за период (последние сутки (since="1 day ago"))

- **Корневая инфра / agent-tooling (Night Build NB0–NB8, #315):** добавлен one-shot PR-флоу `yarn pr:ship` (dry-run по умолчанию), `yarn build:affected` (пересборка dist затронутых пакетов, борьба со stale-dist), `yarn verify:wire-sync` (сверка `NODE_REALTIME_EVENT_TYPES`/`BoardScenarioListItem` между core ESM и bg-cabinet CJS), scoped pre-push typecheck + commit-msg хук, `deploy:when-green`, `prisma:migration`, `tasks:archive-closed`, централизованный `lib/git-day-context.mjs`. Скиллы `membrana-ship`, `membrana-tooling-doctor`.
- **Корневая инфра / ритуалы (druid):** починены два бага тулинга — `context-collector` больше не фильтрует дневную активность по локальному git-автору (squash-мерджи от GitHub-аккаунта не выпадают), `team-evening-feedback` больше не отсекает файлы ранних коммитов дня (sort + cap 120). Перегенерированы `DAILY_CODE_REVIEW`, вечерний фидбэк (6.8→8.2).
- **Процесс / инсайты (druid):** доведён инсайт `hermes-liaison-agent` (draft→adopted, вес 7.4), заведён спринт `hermes-brief` (task-промпт M), добавлен скилл `membrana-insight-to-sprint` (мост adopted-инсайт → спринт), proxy-aware Perplexity + доменные Q1–Q3 в research-каскаде.
- **`@membrana/core` (#288, #302, #303):** новый pure-хелпер `fuseDetectorConfidences` (взвешенное среднее сырого confidence trends+yamnet + agreement, без бинарного OR, 11 тестов); обогащён контракт `BoardScenarioListItem` (`kind`, `description`, `entitlement`, счётчики); добавлено событие `presence.entitlements` / `NodeEntitlementsPayload`.
- **`device-board` (#288, #305, #312):** каркас 3+1 FREE UserCase в каталоге (спектр/библиотека/нейро/combined+alarm, tier `bundled`); извлечён шареный презентационный `UserCaseCardView`; документирован аудит 7 singleton-мостов §3.5.
- **`packages/services/fft-analyzer` (#288):** чистый `LoudnessTrendTracker` (скользящее окно «ближе/дальше») + `evaluateProximityAlarm` (порог завязан на `combinedScore` из fusion-ядра, а не на громкости), 22 unit-теста.
- **`apps/client` (#288, #306, #311, #313):** плагин `mic-proximity-alarm` «Микрофона» (alarm-loop через engine, без прямого Web Audio); узел объявляет user + системные сценарии единым списком; `CabinetScenarioPicker` (карточный выбор с tariff-бейджами).
- **`background-cabinet` (#299, #300, #303, #310):** персистентность выбора сценария (`DeviceScenarioRegistry` + Prisma write-through), обновление `lastSeenAt` на реконнекте, доставка `node.entitlements` узлу, синхронизация CJS wire-копии.

## 2. Привязка к стратегической цели

**Где мы на дорожной карте (WHITE_PAPER §8):** между **Этапом 1.B** (Neural & Agentic эшелон, один узел — yamnet в prod, F1 0.803) и продуктовой финализацией **FREE-тарифа** (форсайт 2026-07-06). Многоузловые этапы (2–4: TDOA, локализация, трекинг) **заморожены** до прохождения hard-gate (VDR-железо, §8), что корректно.

**Что приближает к цели:**
- `fuseDetectorConfidences` в `@membrana/core` — это фундамент **fusion-принципа** (WHITE_PAPER §3.3, §4.4): слияние разнородных модальностей в одной шине сырым confidence, а не бинарным вердиктом. Прямой задел под задачу S2 (combined UC).
- Alarm-loop «ближе/дальше» + каркас 3+1 UserCase — это **ситуационный слой** (§4.6) и «раннее предупреждение» (§2, п.4) на уровне одного узла.
- Обогащённый контракт сценариев + персистентность + tariff-контекст — это упаковка UserCases (S3), напрямую обслуживает продуктовую магистраль.

**Что нейтрально:** agent-tooling / ритуалы / инсайт-процесс — инфраструктура скорости команды, не двигает картину неба, но снижает трение (оправдано как разовый Night Build).

**Недостающие сервисы:** по коммитам **пока рано** заводить `tdoa-service`, `localizer-service`, `tracker-service`, `transport-service` — они за stage-gate 1→2 (§8) и осознанно заморожены. Ближайший кандидат к формализации — **combined/ensemble-продюсер** (`combinedScore`): сейчас `combinedScore=0` до появления продюсера, fusion-ядро в core есть, но analyzer-слой, который его питает (`detection-ensemble-service` из таблицы §6), ещё каркас. Это следующий естественный сервисный шаг.

**Детекция (эпик #84, FFT_METRICS §6):** эшелон 0 (чистый DSP/FFT на free-v1) **исчерпан** — потолок trends `DRONE_TIGHT` 95%/30%. Рост качества — только через новые данные (VDR labels) или fusion trends+yamnet. Повторный benchmark harmonic/cepstral/flux — **не планируем** (см. раздел 5).

## 3. Риски и долг

- **Тех-долг wire-контракта (P1, повторяется в #302/#303/#310):** `BoardScenarioListItem` и `NODE_REALTIME_EVENT_TYPES` дублируются `@membrana/core` (ESM) ↔ `background-cabinet` (CJS-копия), синхронизация ручная. Night Build дал `verify:wire-sync` как гейт, но источник дублирования остаётся — это долг, а не решение.
- **`combinedScore=0` как placeholder:** alarm-loop (B) и combined UC (E) — каркасы; порог тревоги завязан на `combinedScore`, которого пока не производит ни один продюсер. Пока combined-продюсер не написан, alarm-loop безопасно деградирует, но продуктовой ценности не даёт.
- **Расхождение MAIN_DAY_ISSUE ↔ факт (отмечено в team-feedback 2026-07-08):** утренний канон фиксировал fusion (A) магистралью, день частично ушёл в scenario-picker + tech-debt. Риск дрейфа приоритетов — свести план дня с фактическим scope.
- **Границы пакетов:** нарушений не видно. `fft-analyzer` зависит только от core/audio-engine, `device-board` — только от core, детекторы разнесены. `family` в fusion — свободная метка, core не тянет сервисы-детекторы. ✅
- **Ограничения WHITE_PAPER, релевантные сейчас:** «грубая громкость — не координата» (индикатор alarm-loop честно помечен) — до многоузловой TDOA (§5.2) настоящей локализации нет; alarm по громкости ≠ трек. Синхронизация времени и многолучёвость (§9) не в игре, пока gate не пройден.
- **Precision hard-gate не достигнут:** trends на val ≈ 0.76 против цели P≥85% (DETECTOR_BENCHMARK). Hard-gate 85/90 ждёт независимого пилотного корпуса (VDR) — это блокер Этапа 2, но **не** блокер FREE-выпуска (форсайт).

## 4. План на следующий день

### Задача 1 — Combined-продюсер: питать `combinedScore` из fusion-ядра
- **Цель:** появляется продюсер, который прогоняет trends + yamnet на окне и отдаёт `combinedScore` в клиент через `fuseDetectorConfidences`.
- **Пакет / слой:** analyzer (`packages/services/detection-ensemble-service`, каркас → минимальная реализация) + потребление в `apps/client` (combined UserCase).
- **Связь с WHITE_PAPER:** §3.3, §4.4 (fusion модальностей), S2 из форсайта (combined UC — keystone FREE).
- **Definition of Done:**
  1. Сервис зависит только от core + foundation (audio-engine); не импортирует другие analyzer-сервисы напрямую (детекторы через контракт).
  2. `combinedScore > 0` при живом входе, alarm-loop реагирует на него (не на сырую громкость).
  3. Unit-тесты: согласие trends↔yamnet → высокий score, расхождение → середина.
  4. `check:boundaries` зелёный.
- **Роль:** Математик (ведёт), Музыкант (интеграция в plugin).
- **Размер:** M

### Задача 2 — Наполнить combined+alarm UserCase реальным графом
- **Цель:** UserCase «combined + alarm» в device-board перестаёт быть пустым документом — содержит граф спектр+нейро→fusion→alarm.
- **Пакет / слой:** device-board (каталог) + client (монтаж сценария).
- **Связь с WHITE_PAPER:** §4.6 (ситуационный слой, раннее предупреждение), S2→S3 форсайта.
- **Definition of Done:**
  1. `loadDocument` combined-UC возвращает валидный непустой граф.
  2. Сценарий монтируется в клиенте end-to-end (smoke).
  3. device-board зависит только от core (границы чистые).
- **Роль:** Верстальщик (ведёт), Математик (контракт графа).
- **Размер:** M

### Задача 3 — Устранить корень дублирования wire-контракта core↔CJS
- **Цель:** `BoardScenarioListItem` / `NODE_REALTIME_EVENT_TYPES` имеют единый источник, CJS-копия генерируется/переиспользуется, а не поддерживается вручную.
- **Пакет / слой:** infra + `@membrana/core` (источник) + `background-cabinet`.
- **Связь с WHITE_PAPER:** §7 (открытый стабильный контракт наблюдений/событий), принцип §3.5.
- **Definition of Done:**
  1. Одна декларация — CJS-потребитель читает её без ручной пересборки полей.
  2. `verify:wire-sync` тривиально зелёный (нечему расходиться) либо заменён источником-истиной.
  3. Существующие тесты core/cabinet проходят, миграции не требуются.
- **Роль:** Структурщик (ведёт).
- **Размер:** M

### Задача 4 — Объяснимость: одна таблица trends `DRONE_TIGHT` vs yamnet на каноническом val
- **Цель:** одностраничная таблица P/R/FPR/F1 обоих детекторов на одном `latest.json` — кто основной в hard-gate, кто объяснимый бэкап.
- **Пакет / слой:** infra (docs/benchmark, без нового прогона DSP на новом датасете — переиспользуем существующий val).
- **Связь с WHITE_PAPER:** §8 (stage-gate, метрики), §11 (доля ложных тревог < 5%).
- **Definition of Done:**
  1. Таблица в `DETECTOR_BENCHMARK.md` с явной пометкой «yamnet основной, trends объяснимый бэкап».
  2. Зафиксировано, что hard-gate 85/90 ждёт VDR-корпус.
  3. Никакого повторного тюнинга порогов DSP.
- **Роль:** Математик (ведёт), Teamlead (LGTM вывода).
- **Размер:** S

### Задача 5 — Свести MAIN_DAY_ISSUE дня с фактическим scope (ритуал)
- **Цель:** утренний канон дня и вечерний факт совпадают; дрейф приоритетов зафиксирован явно.
- **Пакет / слой:** infra (ритуалы/docs).
- **Связь с WHITE_PAPER:** дисциплина §14 (порядок изменения, приоритет White Paper).
- **Definition of Done:**
  1. MAIN_DAY_ISSUE отражает продуктовую магистраль (S2 combined) как №1.
  2. Поддерживающая полоса (детекция/объяснимость) помечена как supporting, не магистраль.
  3. `yarn plan:day` / `standup` читают актуальный приоритет.
- **Роль:** Teamlead (ведёт).
- **Размер:** S

## 5. Что НЕ делаем на этом горизонте

- **Не** запускаем повторный unified benchmark harmonic/cepstral/spectral-flux на free-v1 без нового датасета — эшелон 0 исчерпан (FFT_METRICS §6: FPR 88–100%, потолок зафиксирован). DSP-детекторы остаются объяснимым индикатором, не путём роста качества.
- **Не** заводим `tdoa-service`, `localizer-service`, `tracker-service`, `transport-service` — они за stage-gate 1→2 (WHITE_PAPER §8) и осознанно заморожены до hard-gate/VDR.
- **Не** трогаем yamnet-детектор/плагин/бенчмарк как «разведку» — они уже в prod (#266/#268, F1 0.803), не переизобретаем.
- **Не** повторяем тюнинг порогов DSP на free-v1 «ещё раз прогнать» — только при смене датасета, алгоритма или fusion-стратегии (trends+yamnet, что и делает combined-продюсер).
- **Не** запускаем hermes-оркестратор как 6-ю роль — по консилиуму это read-only функция ритма (`yarn hermes:brief`), отложенная гипотеза.

## 6. Проверки в конце периода

- **Combined работает end-to-end:** `combinedScore > 0` при живом входе, alarm-loop «ближе/дальше» реагирует на fusion-score, а не на сырую громкость (demo в «Микрофоне»).
- **FREE combined UserCase монтируется:** непустой граф спектр+нейро→fusion→alarm, smoke-тест зелёный, карточка видна в пикере с корректным tariff-бейджем.
- **Границы чисты:** `check:boundaries` + `verify:wire-sync` зелёные; новый `detection-ensemble-service` не зависит от других analyzer-сервисов.
- **Тесты:** новые unit-тесты combined-продюсера (согласие/расхождение) проходят; регрессов в core/fft-analyzer/device-board нет.
- **Объяснимость зафиксирована:** таблица trends vs yamnet в `DETECTOR_BENCHMARK.md` с явным вердиктом «основной / бэкап» и пометкой блокера hard-gate (VDR).
- **Приоритет синхронизирован:** MAIN_DAY_ISSUE и вечерний team-feedback показывают единую магистраль (S2 combined), без расхождения канон↔факт.