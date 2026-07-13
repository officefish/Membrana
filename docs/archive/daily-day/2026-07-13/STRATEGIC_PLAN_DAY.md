<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-13
  archived-at: 2026-07-13T19:12:43.581Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-13T04:04:07.443Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

> Документ-преемник вечернего ритуала 2026-07-12 (архив дня #406, handoff #405). Привязан к стратегической цели `WHITE_PAPER.md` и продуктовому форсайту 2026-07-06 (финализация FREE-тарифа). Магистраль завтра, зафиксированная в `docs/HANDOFF.md` (#405): **drift-anchor DA4/DA5**.

## 1. Что сделано за период (последние сутки (since="1 day ago"))

Активность за сутки высокая: доминируют два процессных контура (ночные агенты + drift-anchor) и один продуктовый keystone (S2 combined UC). Разбивка по слоям:

- **Новый пакет `@membrana/drift-anchor` (packages/drift-anchor):** DA0 — чистое ядро `computeDrift` (контракты `Snapshot / AnchorResult / MorningDriftDigest / DriftThresholds`, вердикты ok/drift/broken, 9 тестов, без I/O/LLM) (#398). Далее: DA1 структурный якорь (снимок реестра + граф `@membrana`-зависимостей + чек-суммы промптов, `baseline.json`, #399), DA2 поведенческий якорь (golden drone-сэмпл → 3 DSP → `combinedScore`, детерминированно, #400), DA3 ночной раннер (snapshot → computeDrift → Claude-гипотеза через media-прокси, `MorningDriftDigest` JSON, #401). Пороги ε вынесены в `docs/anchors/thresholds.json`.
- **`device-board`:** S2 keystone — новый UserCase `usercase-free-combined-alarm` (DSP combined + alarm-loop поверх `loop-transition-policy` #357, из зарегистрированных узлов, ядро не тронуто, #372); фаза D loop-refactor — Alpha entry-id канонизирован под `SCENARIO_*_ENTRY`, NB6-гард расширен на Alpha/Beta/Gamma (#369); read-only индикатор активного лупа на полотне (#374).
- **`@membrana/core`:** ADR 0002 — `get-microphone / get-audio-stream` как pure-toggle с default-impure (новая категория `PURE_ELIGIBLE_DEFAULT_IMPURE`, обратная совместимость сохранена, #375).
- **`background-office` (вне графа foundation/analyzer, см. `BACKGROUND_SERVERS.md`):** ночной триаж реестра NT1–NT4 (чистое ядро ghost/orphan/stale, рендер отчёта, LLM-нарратив graceful, office-модуль с cron; #381–#384, #386); night-hunt NH1 на ClaudeService через media-прокси (#391); завершена office-VDS-миграция OM4 (cutover на `office.mmbrn.tech`, релокация из-под ТСПУ, #376–#379).
- **Корневая инфра (scripts/):** night-build safe набор — `_ssh-media-exec.mjs`, `git-check-divergence.mjs`, `git-fresh-branch.mjs` + 6 node:test (#412).
- **Документация / процессы:** консилиумы `nightly-agents-platform` (#397), `drift-anchor-triggers` (#404), `s2-combined-uc-dsp` (#371); handoff DA4/DA5 (#405); несколько deferred-инсайтов (`live-neural-combined-detector`, `explicit-loop-switch-nodes`, `persona-persistent-memory`).

## 2. Привязка к стратегической цели

**Текущий этап дорожной карты (WHITE_PAPER §8):** мы находимся на границе **Этапа 1.A/1.B** с де-факто снятым «замком Этапа 2» через нейросетевой free-tier канал. Продуктовая магистраль — **финализация FREE-тарифа** (форсайт 2026-07-06): S2 combined UC → S3 упаковка UserCases → S4 студия-download → S5 лендинг.

**Что приближает к цели:**
- S2 keystone `usercase-free-combined-alarm` (#372) — прямой шаг продуктовой магистрали (S2), реализует комбинированный UC + alarm-loop «ближе/дальше» из форсайта. Ложится на §4.6 (ситуационный слой) и §8 Этап 1.A/1.B.
- ADR 0002 pure-toggle для `get-microphone / get-audio-stream` (#375) — укрепляет контракт `audio-engine` как единственного узла Web Audio (ARCHITECTURE §1b), готовит почву под чистые графы device-board.

**Что нейтрально к WHITE_PAPER, но ценно для устойчивости команды:**
- Весь контур drift-anchor (#396–#405) и ночные агенты (NT/NH) — это **процессная инфраструктура против агентного дрейфа**, а не сенсорная сеть. Прямо к этапам дорожной карты не приближает, но снижает риск деградации автономной разработки. DA2 переиспользует боевое fusion-ядро детекторов — косвенная связь с §4.5.
- Office-VDS-миграция (#376–#379) — операционный долг, разблокирует dev-интеграции (`background-office`, §6 таблица).

**Что отвлекает:** формального «отвлечения» от цели нет, но доля процессных/инфра-коммитов за сутки заметно превышает долю продуктовых (детекция + UC). Это осознанный выбор дня по handoff #405, но на следующем горизонте баланс стоит вернуть к продуктовой магистрали (S3).

**Недостающие сервисы:** по коммитам **не пора** начинать `tdoa-service` / `localizer-service` / `tracker-service` / `transport-service` — Этап 2+ заморожен и мультиузел не в фокусе. `drone-detector-service` (в смысле семейства детекторов) уже покрыт: trends `DRONE_TIGHT` (go) + yamnet (prod, F1 0.803). Пробел, который **виден по коммитам** — отсутствие единой сравнительной таблицы «trends+`DRONE_TIGHT` vs yamnet» на val (поддерживающий долг объяснимости).

## 3. Риски и долг

**Технические риски / долг:**
- **Перекос в процессную инфру.** За сутки создан целый новый пакет + 4 фазы drift-anchor + 4 фазы night-triage. Риск — продуктовая магистраль (S3 упаковка UserCases) отстаёт от процессного контура. Долг: вернуть фокус на S3.
- **Хрупкость ночных агентов на гео-фильтрах.** Повторяющийся паттерн (OpenRouter 403 → свап на ClaudeService через media-прокси, #386/#391) и релокация office из-под ТСПУ (#376) показывают, что весь ночной контур завязан на нестабильный сетевой канал из РФ. Долг: явные reachability-проверки (отложено в #409).
- **DA2 якорит `combinedScore` DSP-детекторов** — если fusion-ядро или веса детекторов поменяются легитимно, baseline требует осознанного `yarn drift:baseline`. Риск ложных «broken» после легитимного рефактора детекции.
- **Отложенный долг из session-friction** (#407–#411): pr:ship yarn-resilience, office-deploy exec, llm-reachability, sprint:register, warn-hook wiring — накапливается, пока не разобран.
- **Границы пакетов:** нарушений по diff-у **не видно**. `drift-anchor` — самостоятельный пакет с чистым ядром; device-board правки идут через зарегистрированные узлы без вторжения в ядро; ADR 0002 расширяет core-контракт обратносовместимо. `background-office` корректно вне графа foundation/analyzer.

**Ограничения из WHITE_PAPER, релевантные сейчас:**
- §9 «Шум среды» и «доля ложных тревог < 5%» (§11): текущий потолок free-v1 — trends 95% recall / 30% FPR и yamnet FPR 36.7%; до целевого <5% FPR ещё далеко. Это ограничение free-tier, не блокер выпуска (форсайт: VDR-железо ~17.07 — валидация, не блокер).
- §5.2/§9 синхронизация времени, многолучёвость, TDOA — **не релевантны** на этом горизонте (Этап 2 заморожен).

## 4. План на следующий день

Магистраль дня — **drift-anchor DA4/DA5** (handoff #405). Поддерживающая полоса — один продуктовый шаг S3 и один долг объяснимости детекции.

### Задача 1 — Drift-anchor DA4: триггер-контур (CI-гейт vs серверное расписание)

- **Цель:** появляется механизм запуска drift-anchor раннера по триггерам (data/code якоря) согласно консилиуму `drift-anchor-triggers` (#403/#404).
- **Пакет / слой:** infra (scripts/ + `@membrana/drift-anchor` как чистое ядро) + `background-office` для серверного расписания (вне графа foundation/analyzer).
- **Связь с WHITE_PAPER:** процессная устойчивость автономной разработки (§14 порядок изменения, косвенно §4.4 надёжность fusion-ядра через DA2-якорь). Не этап дорожной карты, а несущая для неё.
- **Definition of Done:**
  - triggers-логика (когда data-якорь, когда code-якорь) вынесена чистой функцией + node:test;
  - раннер `drift:run` подключён к триггеру (CI-гейт **или** серверный cron согласно вердикту #404);
  - exit-код 2 при `broken` корректно алертит; graceful при недоступности LLM-канала.
- **Роль:** Структурщик (границы пакета + чистое ядро), поддержка Teamlead (вердикт CI vs schedule).
- **Размер:** M

### Задача 2 — Drift-anchor DA5: утренний дайджест в ритуал

- **Цель:** `MorningDriftDigest` из DA3-раннера включается в утренний ритуал (`plan:day` / `standup`) как read-only сводка дрейфа.
- **Пакет / слой:** infra (scripts/ + чтение `docs/reports/drift-anchor/DRIFT_<date>.json`).
- **Связь с WHITE_PAPER:** §14 (порядок изменения, хранитель Teamlead) — раннее обнаружение дрейфа канона ARCHITECTURE/промптов.
- **Definition of Done:**
  - `plan:day`/`standup` читают последний `DRIFT_*.json` и выводят компактную секцию (ok/drift/broken по якорям);
  - при отсутствии свежего дайджеста — graceful (не падать);
  - тест на рендер секции из фикстуры-дайджеста.
- **Роль:** Структурщик; ревью Teamlead.
- **Размер:** S

### Задача 3 — S3-старт: упаковка UserCases в device-board (3+1)

- **Цель:** появляется каркас упаковки free-tier UserCases (3 базовых + 1 combined `usercase-free-combined-alarm` #372) в device-board — следующий шаг продуктовой магистрали после S2.
- **Пакет / слой:** device-board.
- **Связь с WHITE_PAPER:** §4.6 ситуационный слой, §8 Этап 1.A/1.B; продуктовая магистраль форсайта (S3).
- **Definition of Done:**
  - в каталог `free-tier-user-case-entries` добавлены/сгруппированы 3+1 UC как единая упаковка;
  - все UC собраны из **зарегистрированных** узлов, ядро device-board не тронуто (правило USERCASE_COMPETITION_LESSONS);
  - `user-case-catalog.test.ts` зелёный, покрывает наличие упаковки;
  - каждый UC валиден в рантайме (entry-id канон `SCENARIO_*_ENTRY`, гард NB6).
- **Роль:** Верстальщик (device-board UI/каталог) + Структурщик (границы), ревью Teamlead.
- **Размер:** M

### Задача 4 — Долг объяснимости: сравнительная таблица trends+`DRONE_TIGHT` vs yamnet на val

- **Цель:** появляется одна таблица в `DETECTOR_BENCHMARK.md`, сводящая trends `DRONE_TIGHT` и yamnet на held-out `val` — кто основной кандидат в hard-gate, кто объяснимый бэкап.
- **Пакет / слой:** analyzer-уровень (данные из `trends-detector-service` + `neural-drone-analyzer`), артефакт — документация. **Без** нового прогона DSP на free-v1.
- **Связь с WHITE_PAPER:** §8 stage-gate 1→2, §11 (доля ложных тревог); поддерживающая полоса детекции (не магистраль).
- **Definition of Done:**
  - таблица использует **существующие** val-результаты (trends 95%/30%, yamnet F1 0.803 P71.4/R91.7/FPR36.7) — без переобучения;
  - явно указано: yamnet — основной по F1, trends — объяснимый бэкап (профили ошибок слабо коррелированы, ND3);
  - зафиксировано, что это подготовка к hard-gate на VDR-корпусе (~17.07), не сам gate.
- **Роль:** Математик; ревью Teamlead.
- **Размер:** S

### Задача 5 (опциональная, если останется ёмкость) — Разбор долга session-friction #407–#411

- **Цель:** один-два пункта из отложенного (`git-warn-hook wiring` #411 или `llm-reachability` #409) переведены из issue в реализацию.
- **Пакет / слой:** infra (scripts/) + `background-office` для reachability.
- **Связь с WHITE_PAPER:** §2 «локальная автономность» / устойчивость dev-контура (косвенно).
- **Definition of Done:**
  - выбран **один** пункт, реализован с node:test;
  - остальные явно помечены как «остаётся в issue».
- **Роль:** Структурщик.
- **Размер:** S

## 5. Что НЕ делаем на этом горизонте

- **Не** запускаем повторный unified benchmark harmonic / cepstral / spectral-flux на free-v1 без нового датасета, алгоритма или fusion-стратегии — эшелон 0 DSP/FFT исчерпан (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6; FPR одиночных DSP 88–100%). Повтор не даст прироста.
- **Не** ставим «довести Этап 1.A» / stage-gate 85/90 через одиночные DSP как магистраль — это no-go по вердикту #84.
- **Не** начинаем `tdoa-service` / `localizer-service` / `tracker-service` / многоузловую синхронизацию — Этап 2 заморожен до прохождения hard-gate (WHITE_PAPER §8); мягкий гейт пройден trends, hard-gate — на VDR-корпусе (~17.07).
- **Не** проводим «разведку» или повтор yamnet-детектора/плагина — уже в prod (#266/#268, F1 0.803), эшелон 2 де-факто открыт.
- **Не** тянем VDR-железо/validated dataset вперёд графика — это работа после ~17.07 и НЕ блокер выпуска FREE (форсайт 2026-07-06).

## 6. Проверки в конце периода

- **Drift-anchor DA4/DA5:** `yarn drift:run` отрабатывает по триггеру, выдаёт `DRIFT_<date>.json` с exit-кодом по вердикту; `plan:day`/`standup` показывают секцию дрейфа; все новые node:test зелёные.
- **S3 упаковка:** в device-board каталоге присутствует упаковка 3+1 UC, `user-case-catalog.test.ts` зелёный, ядро device-board не изменено (diff подтверждает).
- **Таблица детекции:** в `DETECTOR_BENCHMARK.md` есть сводная таблица trends `DRONE_TIGHT` vs yamnet на val с явным вердиктом «основной/бэкап»; новых прогонов DSP на free-v1 нет.
- **Границы пакетов:** ни один diff не вводит горизонтальную зависимость между сервисами; `drift-anchor` остаётся чистым пакетом; `background-office` вне графа foundation/analyzer.
- **Долг session-friction:** ≥1 пункт из #407–#411 закрыт с тестом либо явно оставлен в issue (без «зависших» полу-реализаций).
- **Баланс горизонта:** доля продуктовых (S3) + детекционных артефактов в дне не ниже, чем в предыдущем — фокус смещается обратно к продуктовой магистрали.