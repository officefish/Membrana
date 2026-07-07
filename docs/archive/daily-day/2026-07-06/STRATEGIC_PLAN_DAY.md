<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-06
  archived-at: 2026-07-07T03:55:01.329Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-06T04:16:03.792Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

## 1. Что сделано за период (последние сутки (since="1 day ago"))

Практически вся работа суток ушла на **эпик `comms-contour-environment` (CC1–CC9, #254–#264)** — построение изолированного leaf-контура внешних коммуникаций. Это не продуктовая (детекционная) работа: команда сама зафиксировала это как дрейф в вечернем feedback (6.8/10, «один канон = одна реальная работа»).

- **`apps/comms-studio` (новый leaf-воркспейс, корневая инфра)** — создан контур внешних коммуникаций «сток, не исток»:
  - CC1: leaf-воркспейс без `@membrana/*` в зависимостях (`leaf-zero`), декларация Слой 1–3 канона строковыми путями (чтение≠импорт), TBD-заглушки Слой 3.
  - CC2: инвариант `check:boundaries` — `outdegree=0` + `indegree=0` с поз/нег тестами.
  - CC3: отдельная CI-полоса `comms-studio.yml` + `paths-ignore` в продуктовых пайплайнах + CODEOWNERS.
  - CC4: изолированный `.env.example` + блокирующий `secret-scan`.
  - CC8–CC9: агент живого чтения (canon fs-read, tone-guard, out-writer, orchestrator) + первый выход `out/v0.1/` (5 брифов + INDEX) + срез партнёра `PARTNER.md`.
- **`docs/comms/canon/*` (документация)** — наполнены `FACTS_SHEET.md`, `GLOSSARY.md`, `BRAND_TOKENS.md` (CC5–CC7): лист фактов, заблокированный глоссарий, визуальный канон — с маркерами подтверждён/гипотеза/TBD.
- **`apps/client` (client)** — точечные фиксы, наследие вчерашних спринтов: разрешены `exhaustive-deps` warnings в `UserCaseSettingsPanel`, финализация PCB-эпика.
- **`packages/background-cabinet` + `@membrana/core` (foundation-адъюнкт / core)** — из закрытого ранее эпика `presence-capture-board` (PCB1–PCB6): `link-state` endpoint, `health-ping` (echo/pong по WS), auth-fail сигнал (4401→диалог), force-open view-only board. Это **инфраструктура присутствия узлов** — ближе к транспортному слою, чем к детекции.
- **Ритуалы/инфра** — утренний план целил в `DRONE_TIGHT trends curated + benchmark v0.3`, но фактическая работа ушла в comms; зарегистрирован follow-up спринт `comms-sandbox-docs-adaptation` (CD1–CD6).

> **Ключевое наблюдение:** заявленный фокус дня (DRONE_TIGHT / VDR) **не реализован**. Магистраль детекции за сутки не сдвинулась.

## 2. Привязка к стратегической цели

**Текущий этап дорожной карты (WHITE_PAPER §8):** мы между **Этапом 1.A/1.B** и **Stage-gate 1→2**. По статусу gate (§8): мягкий гейт пройден trends-детектором (95% recall / 30% FPR на fv1), hard-gate 85/90 проверяется на пилотном корпусе (эпик `vdr-hard-gate`). Многоузловые этапы (2–4: TDOA, локализация, трекинг) **заморожены** до прохождения шлюза.

**Что приближает к цели:**
- PCB-эпик (link-state, health-ping, presence fan-out) — де-факто закладка **транспортного слоя** «узел ↔ сервер» (WHITE_PAPER §6, `transport-service` план). Полезно для будущего Этапа 2, но **не** снимает stage-gate.

**Что нейтрально:**
- `comms-contour` — брендинг/внешние коммуникации. Архитектурно чисто (leaf-zero, инвариант границ), но к детекции и fusion отношения не имеет.

**Что отвлекает:**
- Весь объём суток ушёл в comms при том, что стратегическая магистраль (WHITE_PAPER §8, принцип Single-Node Detection First) — это **закрытие hard-gate через trends/DRONE_TIGHT** либо переход к **эшелону 2**. Это зафиксировано и командой (вечерний feedback).

**Про детекцию (эпик #84, `FFT_METRICS_POTENTIAL_AND_LIMITS.md`):** эшелон 0 (чистый DSP/FFT на free-v1) **исчерпан и зафиксирован**. Потолок — trends `DRONE_TIGHT` 95%/30%. Магистраль качества — **не** повторный DSP-бенчмарк, а: (а) промоушен `DRONE_TIGHT` в curated template-match, (б) validated data / VDR labels, (в) эшелон 2 (нейро/zero-shot: CLAP/YAMNet).

**Недостающие сервисы (по коммитам видно, что пора/скоро):**
- `@membrana/transport-service` (foundation) — PCB-работа фактически строит его функции ad-hoc в `background-cabinet`; стоит осознать границу. **Не** начинать сейчас как магистраль — Этап 2 заморожен.
- `detection-ensemble-service`, `tdoa-service`, `localizer-service`, `tracker-service` — **заморожены** до stage-gate. Не начинать.

## 3. Риски и долг

- **Стратегический дрейф (главный риск).** Второй день подряд магистраль детекции не двигается — работа уходит в инфраструктуру/коммуникации. Риск: hard-gate `vdr-hard-gate` буксует, а именно он разблокирует всю сеть (Этапы 2–7).
- **Расползание транспортной логики.** PCB-функции (`node-liveness`, `node-realtime`, health-ping) живут в `background-cabinet`. WHITE_PAPER §6 предполагает `@membrana/transport-service` как foundation. Пока это не нарушение (background-серверы — отдельное семейство вне SERVICES.md), но контракт «узел↔сервер» размазывается — надо зафиксировать, где он живёт.
- **Долг документации comms.** Зарегистрирован спринт `comms-sandbox-docs-adaptation` (CD1–CD6) — 4 партнёрских документа импортированы как baseline и требуют адаптации. Это долг, конкурирующий за внимание с детекцией.
- **Committed-vs-generator drift** (`out/v0.1/`) — P2 follow-up от CC9: закоммиченный выход может разойтись с генератором.
- **Границы пакетов** — по diff нарушений графа `@membrana/*` не видно; comms-контур явно проверяется на `outdegree=0/indegree=0`. Это здоровый сигнал.
- **Ограничения WHITE_PAPER, релевантные сейчас (§9):** пока мы на одном узле, ограничения синхронизации времени и многолучёвости ещё не активны — но physical-потолок FFT (§3 FFT_METRICS: не-дрон перекрывает дрон по centroid) уже уперся в нас. Разделяющий сигнал — во времени (trends), это и есть текущая ставка.

## 4. План на следующий день

Магистраль дня — **вернуться к детекционной стратегии**: промоушен `DRONE_TIGHT` и подготовка hard-gate. Comms-долг — фоновая, не приоритетная полоса.

### Задача A — Промоушен `DRONE_TIGHT` в curated template-match каталог
- **Цель.** Шаблон `DRONE_TIGHT` (победитель эпика #84) внедрён в curated-каталог `@membrana/template-match-detector-service` как production-кандидат.
- **Пакет / слой.** `packages/services/detectors/template-match` (analyzer, `detectors/*`).
- **Связь с WHITE_PAPER.** §8 Этап 1.B / принцип Single-Node Detection First; §11 (FPR < 5% — целевой ориентир); follow-up `trends-drone-tight-curated-promotion`.
- **Definition of Done.**
  - `DRONE_TIGHT` (centroid 2900–4300, flux 0.03–0.16, rms 0.07–0.28, temporal-профиль) добавлен в curated каталог с системными не-дрон конкурентами.
  - Границы `detectors/*` соблюдены (только `detector-base` + `core` + `audio-engine` для типов окна).
  - Unit-тесты на скоринг шаблона (spectral 0.3 / temporal 0.7) зелёные.
- **Роль.** Математик (ведёт), Структурщик (границы пакета).
- **Размер.** M

### Задача B — Пересъёмка `benchmark:detectors` v0.3 с trends/DRONE_TIGHT
- **Цель.** Обновлённая таблица метрик в `DETECTOR_BENCHMARK.md`, где trends+`DRONE_TIGHT` зафиксирован как единственный FFT-кандидат в prod.
- **Пакет / слой.** infra (скрипт `yarn benchmark:detectors`) + `docs/DETECTOR_BENCHMARK.md`.
- **Связь с WHITE_PAPER.** §8 Stage-gate 1→2; §11 (доля ложных тревог). Это **разрешённая** пересъёмка — смена конфигурации детектора (trends+tight), а не повтор free-v1 DSP.
- **Definition of Done.**
  - Прогон включает trends+`DRONE_TIGHT`, не только одиночные DSP.
  - Метрики recall/FPR/F1 на `val` совпадают с §4 FFT_METRICS в пределах шума либо расхождение объяснено.
  - `DETECTOR_BENCHMARK.md` обновлён, помечен датасет (free-v1 / val) и дата.
- **Роль.** Математик (ведёт), Teamlead (LGTM на stage-gate таблицу).
- **Размер.** M

### Задача C — Live-калибровка trends-fft в библиотеке сэмплов под `DRONE_TIGHT`
- **Цель.** Пользователь может вручную прогнать эксперимент trends+`DRONE_TIGHT` на текущем датасете через плагин в библиотеке сэмплов.
- **Пакет / слой.** `apps/client` (плагин `trends-fft-analyzer` / sample-library) — только публичный API `audio-engine` + trends-сервис (client, §1b/§1c ARCHITECTURE).
- **Связь с WHITE_PAPER.** §8 (эксперимент как продукт: плагин «VDR-валидация»); §4.5 классификация; follow-up «калибровка trends-fft под DRONE_TIGHT».
- **Definition of Done.**
  - Плагин зарегистрирован через `MembranaRegistry.registerPlugin` (не прямой store).
  - Никаких `new AudioContext()` / `getUserMedia` вне engine (ARCHITECTURE §1b).
  - Ручной прогон даёт визуализацию попадания в `DRONE_TIGHT` бокс + вердикт.
- **Роль.** Верстальщик (ведёт UI), Музыкант (пресеты калибровки).
- **Размер.** M

### Задача D — Разведка эшелона 2: контракт подключения zero-shot аналайзера
- **Цель.** Разведочный документ/scaffold: как CLAP/YAMNet-детектор ложится на `detector-base` контракт без нарушения границ (эшелон 2 по `INTEGRATIONS_STRATEGY.md`).
- **Пакет / слой.** `packages/services/detectors/*` (analyzer, scaffold) + `docs/prompts/` (разведка).
- **Связь с WHITE_PAPER.** §8 Этап 1.B (`yamnet-detector-service`, `clap-detector-service`); §3 принцип «слияние модальностей одним контрактом»; FFT_METRICS §6 (рост качества за пределами эшелона 0).
- **Definition of Done.**
  - Зафиксировано, реализует ли zero-shot тот же `DroneDetector`/`DetectionResult`.
  - Отмечено, что модель/веса — внешний npm/asset, границы `detectors/*` не ломаются.
  - Если картина неясна — явные разведочные шаги (какие данные, какой инференс-рантайм в браузере/node).
- **Роль.** Математик (ведёт), Структурщик (границы), Teamlead (go/no-go на эшелон 2).
- **Размер.** S (разведка, без реализации)

### Задача E — Зафиксировать границу транспортного слоя (разведка)
- **Цель.** Разведочная заметка: какие функции PCB (link-state, health-ping, presence) — кандидаты в будущий `@membrana/transport-service` (foundation), а что остаётся в `background-cabinet`.
- **Пакет / слой.** infra / docs (ARCHITECTURE §6 mapping); без переноса кода.
- **Связь с WHITE_PAPER.** §6 (`transport-service` план, foundation); принцип «сырые данные не покидают узел, только наблюдения».
- **Definition of Done.**
  - Таблица: функция → текущее место → целевое место (foundation vs background-server).
  - Явно: Этап 2 заморожен, поэтому это фиксация, а не реализация.
- **Роль.** Структурщик (ведёт), Teamlead (LGTM).
- **Размер.** S

### Задача F — Comms-долг: адаптация baseline-документов (фоновая полоса)
- **Цель.** Начать CD1–CD6: адаптировать 4 партнёрских документа под реализацию CC1–CC9 (живой канон, hook переиспользует tone-guard).
- **Пакет / слой.** `apps/comms-studio` (leaf) + `docs/comms/sandbox/*`.
- **Связь с WHITE_PAPER.** Косвенная (§10 этика/позиционирование через канон). Не магистраль.
- **Definition of Done.**
  - Хотя бы RUNBOOK/CHECKLIST адаптированы под Вариант A (живой канон, не копии).
  - `check:boundaries` leaf-zero остаётся зелёным.
- **Роль.** Teamlead координирует, партнёр действует по докам.
- **Размер.** S (в рамках дня — только начать)

> Приоритет дня: **A → B → C** (детекционная магистраль), затем **D, E** (разведка), **F** — только при остатке ёмкости. Это прямой ответ на вечерний feedback «один канон = одна реальная работа».

## 5. Что НЕ делаем на этом горизонте

- **НЕ** повторный unified benchmark harmonic/cepstral/spectral-flux на free-v1 без нового датасета/алгоритма/fusion (FFT_METRICS §6): эшелон 0 DSP исчерпан, эти детекторы — no-go как селекторы (FPR 88–100%). Их роль — объяснимость в журнале и ранний индикатор.
- **НЕ** повторный тюнинг порогов DSP на free-v1 «ещё раз прогнать бенчмарк» — вердикт зафиксирован.
- **НЕ** начинаем `tdoa-service` / `localizer-service` / `tracker-service` — Этапы 2–4 заморожены до прохождения stage-gate 1→2 (WHITE_PAPER §8).
- **НЕ** начинаем полноценную реализацию `transport-service` — только фиксация границы (Задача E); реализация привязана к Этапу 2.
- **НЕ** расширяем comms-контур новыми фичами сверх адаптации baseline-докумов — это уже отмечено как дрейф; comms остаётся фоновой полосой.

## 6. Проверки в конце периода

- **Артефакт детекции:** `DRONE_TIGHT` присутствует в curated template-match каталоге, `benchmark:detectors` v0.3 переснят, `DETECTOR_BENCHMARK.md` обновлён с явной пометкой датасета и trends-строкой.
- **Метрика:** trends+`DRONE_TIGHT` на `val` воспроизводит ~95% recall / ~30% FPR (совпадение с FFT_METRICS §4 или объяснённое расхождение).
- **Тесты:** unit-тесты скоринга шаблона и границ `detectors/*` зелёные; `check:boundaries` (включая comms leaf-zero) зелёный.
- **UI-демо:** плагин trends-fft в библиотеке сэмплов даёт ручной прогон `DRONE_TIGHT` с визуализацией вердикта; зарегистрирован через `MembranaRegistry`, без прямого Web Audio.
- **Разведка:** есть go/no-go заметка по эшелону 2 (zero-shot на `detector-base`) и таблица границы транспортного слоя.
- **Дисциплина фокуса:** вечерний feedback фиксирует, что магистраль дня была детекционной (не comms) — устранён дрейф прошлых суток.