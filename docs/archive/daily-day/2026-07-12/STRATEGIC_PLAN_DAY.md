<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-12
  archived-at: 2026-07-12T15:09:54.369Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-12T03:59:51.414Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

## 1. Что сделано за период (последние сутки (since="1 day ago"))

**`device-board` — рефакторинг связки detection→alarm (спринт `detection-alarm-loop-refactor`):**
- Консилиум `detection-alarm-loop-switch` (#355) зафиксировал вход в alarm-луп по fusion `combinedScore` через `front + loop-transition-policy`, единый порог `branch-on-detection/0.5`.
- Фаза A (#357): новый `loop-transition-policy` (вход main→alarm по `combinedScore`, гистерезис 0.15/debounce 3) заменил `isDetectionFrontEdge` в `scenario-runtime`.
- Фаза B (#358): тумблер шапки отражает фактический активный луп (`activeBranch`); мягкий/жёсткий захват гейтит `setMode`.
- ADR `LOOP_SWITCH_CONTROL_ADR` (#356) и журнал уроков L32/L34/L35/L36 (#354) — задокументирована архитектура переключения лупов.
- Фазы C-адаптация + D перенесены в завтрашнюю «сценарную переделку» (#359).

**Корневая инфра / деплой (спринт `office-vds-migration`, ночной эпик `tooling-retro`):**
- OM1-OM2 (#351/#352): переезд `background-office` на выделенный VDS — параметризация домена/IP (шаблон Caddyfile), build-фиксы за фильтрованным NAT, SSH key-auth; скилл + runbook фильтрованной сети (#353).
- Ночной build (NB1-NB6, #362-#367): `logs:parse` секция detection-alarm, `net:diag <ip>` батарея диагностики сети, `code-review --staged`, мягкий `task:close-github`, скилл `membrana-adr` + `docs/adr/`, pack-гард canonical entry-ids в тестах device-board.

**`apps/client`:**
- Мемоизация `samples` в `SampleLibraryModule` (#348, nit из ревью).

**Наблюдение:** за сутки нет ни одного коммита в `packages/services/*` (детекторы, fusion), `@membrana/core` или новые сенсорные сервисы. Вся активность — device-board (loop-switch), инфра деплоя и тулинг. Детекционная и продуктовая магистраль (FREE-тариф) в git-истории за период **не двигались напрямую**; готовился инфраструктурный и сценарный фундамент под них.

## 2. Привязка к стратегической цели

**Текущий этап дорожной карты (WHITE_PAPER §8):** мы между **Этапом 1.B** (нейро-эшелон — yamnet уже в prod-бенчмарке, F1 0.803) и продуктовой магистралью **финализации FREE-тарифа** (форсайт 2026-07-06). Многоузловые этапы (2-7: TDOA, локализация, трекинг) остаются заморожены до hard-gate.

**Что приближает к цели:**
- Рефактор `loop-transition-policy` (#357/#358) — прямо готовит **S2 combined UC** (fusion спектр+нейро + alarm-loop «ближе/дальше»): вход в alarm по `combinedScore` — это и есть fusion-точка, где сойдутся trends-FFT и сырой confidence yamnet.
- Консилиум + ADR по переключению лупов (#355/#356) — снимает архитектурную неопределённость перед сборкой combined UserCase.
- Миграция `background-office` на VDS (#349-#353) — устойчивый data-plane под упаковку UserCases (S3) и студию-download (S4).

**Что нейтрально:**
- Ночной тулинг (NB1-NB6), скиллы, ADR-шаблон — поддержка ритма команды, не двигают продукт напрямую.
- `net:diag` / VDS-runbook — операционная зрелость, косвенно нужны для S4-S5.

**Что отвлекает:** явных отвлечений в коммитах не видно — активность сфокусирована. Риск лишь в том, что **продуктовая полоса S2 не появилась в коде за сутки** при дедлайне FREE ~17.07.

**Недостающие сервисы:** по коммитам **не пора** начинать `tdoa-service` / `localizer-service` / `tracker-service` / `transport-service` — они за hard-gate (WHITE_PAPER §8, «Stage 2 заморожен»). Актуальный недостающий контракт — **fusion-точка combined UC**: где живёт объединение trends-FFT + yamnet confidence. По форсайту это сырой confidence yamnet (не бинарный вердикт), логика — в сценарии device-board через уже собранный `loop-transition-policy`; отдельный `detection-ensemble-service` пока не выделяем (нет двух+ потребителей).

**Детекция (эпик #84):** эшелон 0 DSP/FFT на free-v1 исчерпан (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6). Магистралью не ставим повторный benchmark harmonic/cepstral/flux и тюнинг порогов. Рабочий детектор — trends `DRONE_TIGHT` (95%/30%) как объяснимый бэкап + yamnet (F1 0.803) как основной. Следующий рост качества — только через fusion этих двух или новые данные.

## 3. Риски и долг

- **Продуктовый дедлайн vs. фактический прогресс:** FREE-тариф целится ~17.07, но за сутки в коде появился только фундамент (loop-policy, деплой), а сам **S2 combined UC** ещё не собран. Риск сдвига магистрали — высший приоритет дня.
- **Фазы C/D спринта loop-refactor отложены** (#359) в «завтрашнюю сценарную переделку» — накопленный незакрытый спринт; нужно явно ввести в план, иначе повиснет.
- **Долг объяснимости:** нет единой таблицы «trends+`DRONE_TIGHT` vs yamnet на val» — непонятно, кто основной в hard-gate, кто объяснимый бэкап (форсайт, заметка ND3). Профили ошибок DSP/нейро слабо коррелированы → fusion обязан брать **сырой** confidence, не бинарный вердикт.
- **Тестовый долг device-board:** L36 Alpha entry-id поломка задокументирована как «самоуничтожается при фиксе» (#367) — незакрытый red-тест на границе pack-гарда canonical entry-ids.
- **Границы пакетов:** нарушений в diff за сутки не видно — device-board работал внутри себя, сервисы не трогались. Fusion-логику combined UC важно **не** размещать так, чтобы analyzer-сервисы начали зависеть друг от друга (SERVICES.md §граф): объединение trends+yamnet — на уровне сценария device-board / client, не внутри детектор-сервиса.
- **Ограничения WHITE_PAPER, релевантные сейчас:** синхронизация времени и многолучёвость (§9) не актуальны — мы на одном узле. Актуальны ограничение «тишина дрона» и «шум среды» (§9): FPR yamnet 36.7% и trends 30% — граница ложных тревог alarm-loop; combined UC должен снижать FPR через согласие двух модальностей.

## 4. План на следующий день

### Задача 1 — Собрать S2 combined UserCase (fusion спектр+нейро + alarm-loop)
- **Цель:** появляется работающий UserCase, где вход в alarm-луп решается объединением trends-FFT и сырого confidence yamnet, с петлёй «ближе/дальше» по громкости.
- **Пакет / слой:** device-board (сценарий) + client (UI-сборка UserCase); потребление analyzer-сервисов через уже существующий `loop-transition-policy`.
- **Связь с WHITE_PAPER:** продуктовая магистраль (форсайт 2026-07-06, S2); принцип §3 «слияние модальностей в одной шине»; §4.5 классификация на признаках FFT + нейро.
- **Definition of Done:**
  - alarm-переход использует **сырой** confidence yamnet + trends-score (не бинарные вердикты);
  - тумблер лупа и `activeBranch` (#358) корректно отражают вход/выход в alarm;
  - на смоук-прогоне (`logs:parse` секция detection-alarm) виден вход в alarm по `combinedScore>=0.5` и петля громкости работает;
  - fusion-логика **не** создаёт зависимость analyzer↔analyzer (SERVICES.md).
- **Роль:** Teamlead (координация fusion-контракта) + Математик (правило объединения confidence).
- **Размер:** L

### Задача 2 — Закрыть фазы C/D спринта detection-alarm-loop-refactor
- **Цель:** «сценарная переделка» (#359) завершена — адаптация сценариев под loop-transition-policy и финальные узлы.
- **Пакет / слой:** device-board.
- **Связь с WHITE_PAPER:** обеспечивает §4.4/§4.6 (event-поток «цель/алерт» → ситуационный слой) для combined UC.
- **Definition of Done:**
  - сценарии Beta/Gamma зелёные на pack-гарде;
  - L36 Alpha entry-id red-тест либо зафикшен (тогда self-destruct), либо явно перевешен в долг с тикетом;
  - registry.json спринта закрыт, карточка в archive.
- **Роль:** Структурщик (границы сценариев) + Верстальщик (UI лупов).
- **Размер:** M

### Задача 3 — Таблица объяснимости: trends `DRONE_TIGHT` vs yamnet на val
- **Цель:** одна таблица метрик на held-out `val`, фиксирующая, кто основной детектор для hard-gate, кто объяснимый бэкап.
- **Пакет / слой:** analyzer (существующие `trends-detector` / `neural-drone-analyzer`) + docs (`DETECTOR_BENCHMARK.md`); **без** нового прогона DSP-порогов на free-v1.
- **Связь с WHITE_PAPER:** §8 stage-gate 1→2 (мягкий гейт пройден, hard-gate на VDR); §11 «доля ложных тревог < 5%».
- **Definition of Done:**
  - таблица P/R/FPR/F1 для обоих на одном `val`-срезе;
  - зафиксирована рекомендация fusion: сырой yamnet confidence + trends как объяснимый бэкап;
  - обновлён `DETECTOR_BENCHMARK.md`; **не** перезапускался unified DSP-бенчмарк.
- **Роль:** Математик.
- **Размер:** M

### Задача 4 — Проверка S3-готовности: упаковка UserCases (3+1) в device-board
- **Цель:** появляется каркас упаковки combined UC вместе с существующими сценариями в device-board (3+1) — заготовка под S3.
- **Пакет / слой:** device-board.
- **Связь с WHITE_PAPER:** продуктовая магистраль S3; §6 отображение UI на архитектуру (`@membrana/device-board`).
- **Definition of Done:**
  - canonical entry-ids (SCENARIO_*_ENTRY) валидны pack-гардом для всех 3+1;
  - combined UC (задача 1) регистрируется через `MembranaRegistry` (ARCHITECTURE §1c), без прямого `registerModule`;
  - смоук-прогон показывает все сценарии в каталоге.
- **Роль:** Структурщик.
- **Размер:** M

### Задача 5 — Смоук деплоя background-office на новом VDS (закрытие миграции)
- **Цель:** подтверждён рабочий `background-office` на выделенном VDS как data-plane под студию-download (S4).
- **Пакет / слой:** infra (`background-office`, deploy-артефакты).
- **Связь с WHITE_PAPER:** §6 (`background-office` — stateless шлюз), продуктовая S4 «студия к скачиванию».
- **Definition of Done:**
  - OM3 (остаток спринта миграции) закрыт;
  - `_ssh-office-smoke` / TLS проходят на новом домене;
  - runbook фильтрованной сети применён и проверен на живом endpoint.
- **Роль:** Teamlead (owner деплоя).
- **Размер:** S

## 5. Что НЕ делаем на этом горизонте

- **Не** запускаем повторный unified benchmark harmonic/cepstral/spectral-flux на free-v1 без нового датасета/алгоритма/fusion — эшелон 0 исчерпан, потолок зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6). DSP-бенчмарк — только при смене данных или fusion-стратегии (trends+yamnet).
- **Не** «доводим Этап 1.A» и не тюним пороги DSP «ещё раз» — это не магистраль (приоритеты детекции).
- **Не** трогаем `tdoa-service` / `localizer-service` / `tracker-service` / `transport-service` и синхронизацию времени — Stage 2 заморожен до hard-gate (WHITE_PAPER §8, §9 «синхронизация», «скорость звука»).
- **Не** переизобретаем yamnet-детектор/плагин/бенчмарк — реализованы (#266/#268), эшелон 2 де-факто открыт; никакой «разведки» нейро.
- **Не** выделяем отдельный `detection-ensemble-service` — пока один потребитель fusion (combined UC), правило SERVICES.md «выделять foundation при нескольких потребителях» не выполнено; держим логику в сценарии device-board.

## 6. Проверки в конце периода

- **Combined UC демонстрируем:** живой прогон показывает вход в alarm-луп по fusion (trends + сырой yamnet confidence) и петлю «ближе/дальше» по громкости; подтверждено `logs:parse` (секция detection-alarm).
- **Спринт loop-refactor закрыт:** фазы C/D смёржены, registry.json обновлён, Beta/Gamma pack-гард зелёные, судьба L36 Alpha явно решена.
- **Таблица объяснимости:** в `DETECTOR_BENCHMARK.md` есть строка «trends `DRONE_TIGHT` vs yamnet» на одном `val` с зафиксированной ролью каждого; unified DSP-бенчмарк не перезапускался.
- **S3-каркас:** 3+1 UserCases (включая combined) проходят pack-гард canonical entry-ids и регистрируются через `MembranaRegistry`.
- **VDS-деплой:** office-smoke/TLS зелёные на новом домене, спринт `office-vds-migration` закрыт (#349).
- **Граница пакетов чиста:** новый fusion-код не вводит зависимость analyzer↔analyzer (проверка по diff / import-lint).