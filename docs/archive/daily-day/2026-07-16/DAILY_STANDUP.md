<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-16
  archived-at: 2026-07-16T15:53:58.165Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-16T05:00:09.295Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (22), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🗓 Ежедневный стендап виртуальной команды Membrana — 2026-07-16

**Координатор:** Vesnin (Teamlead)
**Источники:** STRATEGIC_PLAN_DAY (16.07), DAILY_CODE_REVIEW (15.07 вечер, T0), MAIN_DAY_ISSUE (15.07, канон упаковки FREE), CURRENT_TASK (буфер), FFT_METRICS §6 (#84), открытые GitHub Issues (22, gh CLI), packages/temp (0), RAG operative

---

## Резюме дня

Главный фокус — **продуктовая магистраль FREE перед дедлайном ~17.07**: либо старт **S2 combined UC (fusion спектр+нейро + alarm-loop)** по STRATEGIC_PLAN_DAY, либо, если считать S2 уже слитым (#416 closed), **наполнение трёх фрагментарных UC-каркасов** (спектр/нейро/библиотека) пересборкой существующих узлов. Первый шаг обязателен — **разведка §5**: восстановить точное состояние S2 из `registry.json` + `foresight-2026-07-06.md`, снять противоречие между планом и MAIN_DAY_ISSUE. Главный риск — **1 день до дедлайна FREE, а продуктовый шаг в коде под вопросом**; вчера сутки ушли в тулинг/инфру. Критерий успеха к вечеру: **разведка закрыта, магистраль однозначно определена и стартовала в коде** (fusion-узел ИЛИ первый непустой UC-документ), рабочее дерево чистое.

---

## Входные артефакты

| Источник | Актуальность | Что берём сегодня |
|----------|--------------|-------------------|
| STRATEGIC_PLAN_DAY.md | ✅ свежий (16.07) | Магистраль = **S2 combined UC (fusion + alarm-loop)**; разведка §5 обязательна; анти-приоритеты §6; риск дедлайна §7 |
| DAILY_CODE_REVIEW.md | ✅ вечер 15.07 | **T0**, CI зелёный (test 57/57, lint 36/36), diff docs-only. Проверить статус `docs/archive/night-hunt/2026-07-15/` — закоммитить осознанно или очистить |
| MAIN_DAY_ISSUE.md | ⚠️ вчерашний (15.07, fallback) | Альт-трактовка: S2 слит (#416), остаток = **упаковка 3 UC-каркасов**. Снять противоречие с планом в разведке — что именно магистраль |
| CURRENT_TASK.md | 🔸 буфер | Шум прошлых спринтов (drift-panel, telegram, office-panel — закрыты). Магистраль не трогать. #452 detector-compare — не сегодня |
| FFT_METRICS §6 (#84) | ✅ канон | Эшелон 0 исчерпан → **не** «Этап 1.A / benchmark 3 DSP»; продакшн — trends DRONE_TIGHT |
| GitHub Issues (открыто 22) | ✅ актуально | #415 (live-neural fusion — критпуть FREE), #494 (batch — пост-FREE), #476/#407–#411 (tooling-долг), #396/#420 (drift), #236/#197/#196/#195/#187, #57/#34/#33/#27/#10/#8/#7 (math/ui-долг) |
| packages/temp | — (0, каталог отсутствует) | Набросков нет — ничего не подмешиваем |
| RAG operative | ✅ | Подтверждает непрерывность магистрали S2→drift→упаковка (13→16.07) |

---

## Порядок работы

Магистраль FREE — цепочка эвристики №1 (фича с UI+звуком), но **разведка ставится нулевым шагом**:

**Vesnin (разведка §5 + вердикт «S2 vs упаковка»)** → **Kuryokhin** (fusion-узел / детекторная ветка графа) ∥ **Rodchenko** (UC-карточка/каталог) → **Ozhegov** (границы пакетов, device-board интеграция) → **Vesnin (LGTM)**. Консилиум по #415 не нужен — контракт зафиксирован мандатом владельца.

---

## [Teamlead]

**Стратегический фокус.** День решающий: до дедлайна FREE ~17.07 остаётся ~1 день. Первое действие — **разведка §5 STRATEGIC_PLAN_DAY** (не код): прочитать `foresight-2026-07-06.md`, найти карточку S2 в `registry.json` (`combined`/`fusion`/`s2`/`alarm`), проверить статус `neural-drone-analyzer`/yamnet-confidence в графе device-board. Снять противоречие плана (S2 не начат) и MAIN_DAY_ISSUE (S2 слит #416 → упаковка). **Мой предварительный вердикт:** #415 (`live-neural-combined-fusion`) — прямой мандат владельца и критпуть FREE; если fusion в коде ещё не живёт — это магистраль дня. Если fusion уже слит — переключаемся на наполнение трёх UC-каркасов.

**LGTM-границы.** Fusion-логика графа — в `device-board`; детекторы остаются сервисами `packages/services/detectors/*`; **горизонтальных зависимостей между сервисами не вводить** (ARCHITECTURE §1a/1e). Fusion берёт **сырой confidence yamnet, не бинарный вердикт** (заметка ND3). Без LGTM слияния нет.

**Не делаем сегодня (анти-приоритеты §6):** ❌ «Этап 1.A / unified benchmark 3 DSP» (FFT_METRICS §6 — потолок зафиксирован); ❌ повторный тюнинг порогов DSP без новых данных; ❌ переизобретение yamnet (#266/#268 готовы); ⚠️ тулинг-гигиена как магистраль — вчера её было достаточно, при дедлайне приоритет продукту; ❌ 🚫 **новых узлов палитры не делать** (слово владельца) — только пересборка существующих basn-узлов. ❄️ **Живой дрон — не гейт перед отгрузкой FREE**, а её смысл (полевые испытания = следующий жизненный цикл).

**Приоритизация Issues.**
- **В скоупе дня:** #415 (live-neural fusion — магистраль/критпуть FREE).
- **Пост-FREE, не начинать:** #494 (batch-collection), #420 (полевой data-anchor, privacy-гейт).
- **Долг (side-слот при простое магистрали):** #476 п.1 merge-driver реестра, #407–#411 (session-friction) — не в ущерб S2.
- **Отложено:** #236 (tray-стоп), #197/#196/#195 (intern), #187 (proxy-perf), #57 (template-editor), #34/#33/#27/#10/#8/#7 (math/ui/test-долг).

**Детекция.** Магистраль по FFT — только trends `DRONE_TIGHT` (95%/30%, go) + fusion с yamnet-confidence (эшелон 2). Рост качества — за счёт validated data или нейро, не за счёт нового DSP-тюнинга.

---

## [Структурщик]

**Ozhegov.** Фаза 0 (блокирующая гигиена перед кодом): `yarn neighbors` (проверить коллизии worktree/main), `yarn catalog:verify-client` (каталог UC — предмет дня), `yarn turbo run lint typecheck test --filter=@membrana/device-board`. Разобрать untracked из dev-review: `docs/archive/night-hunt/2026-07-15/`, `docs/comms/drafts/alex-response-swallow.md`, `docs/prompts/DETECTOR_METRICS_CHARACTERIZATION_PROMPT.md` — закоммитить осознанно или очистить (чистое дерево перед deploy-preflight).

При интеграции fusion — контроль границ: `device-board` потребляет confidence yamnet через **публичное API детектор-сервиса**, не через прямой импорт внутренностей. Никаких горизонтальных связей `detectors/harmonic ↔ detectors/cepstral ↔ neural`. Если увижу прямой импорт между плагинами/сервисами — верну с пометкой `нарушена слабая связанность`. `detection-metrics-service` (заведён #524) — оставить вне скоупа S2, не тянуть в fusion сегодня.

---

## [Математик]

**Dynin.** Fusion-объединение confidence — **чистая функция**: вход — `{ spectralConfidence, yamnetConfidence, rms }`, выход — `combinedScore` + метка источника; без side-эффектов, без фреймворков. Не бинарный OR — взвешенное/калиброванное объединение (профили ошибок DSP/нейро слабо коррелированы, ND3). Alarm-loop «ближе/дальше» — производная от RMS-тренда (RMS уже считается в `fft-analyzer`, не дублировать ядро).

Math-долг (#10, #34) — **не сегодня**, но помню: fft-analyzer чистая математика без тестов — риск при любой правке ядра детекции. Держать в фоне, поднять после FREE. FFT edge cases (#34) — тем же пакетом.

---

## [Музыкант]

**Kuryokhin.** Веду детекторную ветку графа (по вердикту разведки). Форму fusion-узла и alarm-loop согласовать с Vesnin (1–2 абзаца + список модулей) **до существенного кода** — правило взаимодействия. yamnet-confidence достаётся из `neural-drone-analyzer` (проверить точку стыковки в device-board — разведка §5.4). Не менять алгоритмы детекторов без Математика; не дублировать мат-ядро.

**Поток audio-engine.** `sampleRate` **не фиксируется** (48 kHz desktop / 44.1 kHz часть macOS — берётся из `AudioContext.sampleRate`, FFT_METRICS §Mic). Fusion и alarm-loop масштабируются по фактическому `frame.sampleRate`, не по «целевым» 48 kHz. Полевые сэмплы (реальные записи) — **следующий жизненный цикл** (#420), не гейт FREE.

---

## [Верстальщик]

**Rodchenko.** Веду UC-карточку/каталог по DESIGN.md (параллельно Kuryokhin). Форму карточки согласовать с Vesnin до кода. Каталожный контракт: `yarn catalog:verify-client` зелёный после правок. Никакой бизнес-логики/Web Audio в JSX — только презентация; fusion-логика живёт в device-board-графе.

**packages/temp:** каталог отсутствует (0 набросков) — **переносить нечего**. Анти-паттерн: не тащить в JSX прямые вызовы аудио или device-board-внутренностей. Untracked `alex-response-swallow.md` (comms-черновик) — не UI, оставить Структурщику на разбор.

---

## План на сегодня

| Блок | Размер | Задача | DoD | Issues |
|------|--------|--------|-----|--------|
| Разведка §5 | S | Прочитать `foresight-2026-07-06.md`, найти карточку S2 в registry, проверить статус yamnet-confidence в графе | Вынесен вердикт «S2 fusion vs наполнение UC-каркасов»; точка стыковки yamnet задокументирована | #415 |
| Фаза 0 гигиена | S | `neighbors` + `catalog:verify-client` + `turbo lint/typecheck/test --filter=device-board`; разобрать 3 untracked + night-hunt | CI зелёный; рабочее дерево чистое (осознанный коммит либо очистка) | — |
| Fusion-узел (магистраль A) | M | Проектирование + impl fusion-узла: сырой yamnet-confidence + спектр → combinedScore в графе device-board | Чистая функция объединения + тест; graceful DSP-only с видимой меткой; без горизонтальных зависимостей | #415 |
| Alarm-loop | M | Механика «ближе/дальше» по RMS-тренду в графе | Реагирует на изменение RMS; метка «спектр+нейро»; перф на живом каденсе | #415 |
| UC-карточка | M | Карточка/каталог combined UC по DESIGN.md | `catalog:verify-client` зелёный; a11y; без логики в JSX | #415 |
| Долг (side) | S | При простое магистрали: #476 п.1 merge-driver реестра ИЛИ #407 pr:ship устойчивость | 1 tooling-долг закрыт PR — только не в ущерб S2 | #476/#407 |

---

## Матрица Issues ↔ задачи дня

| Задача дня | GitHub Issues |
|------------|---------------|
| Разведка §5 + вердикт магистрали | #415 |
| Фаза 0 гигиена / чистое дерево | — |
| Fusion-узел (combinedScore) | #415 |
| Alarm-loop «ближе/дальше» | #415 |
| UC-карточка/каталог | #415 |
| Долг (side-слот, при простое) | #476, #407 |
| **Отложено (пост-FREE)** | #494, #420 |
| **Отложено (долг)** | #236, #197, #196, #195, #187, #57, #34, #33, #27, #10, #8, #7, #396, #408–#411 |

---

## Итоговый артефакт

- `docs/STRATEGIC_PLAN_DAY.md` — фиксация вердикта разведки (S2 fusion vs наполнение UC).
- `packages/device-board/src/**` — fusion-узел (объединение confidence) + alarm-loop в графе combined UC.
- `packages/services/detectors/neural/**` или существующий сервис — точка выдачи сырого yamnet-confidence (если нужна доработка API).
- Чистая функция объединения + тест (рядом с fusion-логикой).
- UC-карточка/каталог (`packages/device-board/src/catalog/**` или `apps/client`), DESIGN.md.
- Разбор untracked: `docs/archive/night-hunt/2026-07-15/`, `docs/comms/drafts/alex-response-swallow.md`, `docs/prompts/DETECTOR_METRICS_CHARACTERIZATION_PROMPT.md`.

---

## Definition of Done (день)

- [ ] Разведка §5 закрыта: вердикт «S2 fusion vs наполнение UC-каркасов» вынесен и зафиксирован.
- [ ] Точка стыковки yamnet-confidence в графе device-board найдена и задокументирована.
- [ ] Фаза 0 пройдена: `neighbors` + `catalog:verify-client` + `turbo lint/typecheck/test --filter=device-board` зелёные.
- [ ] Рабочее дерево чистое: 3 untracked + night-hunt закоммичены осознанно либо очищены.
- [ ] Магистраль стартовала в коде: fusion-узел (сырой yamnet-confidence, не бинарный OR) ИЛИ первый непустой UC-документ.
- [ ] Fusion — чистая функция объединения confidence + тест; graceful DSP-only с видимой меткой.
- [ ] Без горизонтальных зависимостей между сервисами/плагинами (ARCHITECTURE §1a/1e); Teamlead LGTM.
- [ ] Не запускались анти-приоритеты: benchmark 3 DSP, тюнинг порогов, новые узлы палитры, живой-дрон-гейт.

---

## 🧭 Дрейф-якоря (read-only, DRIFT_2026-07-13.json)

Сводка: ok 8 · drift 0 · broken 0 — снимок 2026-07-13T05:16:22.454Z.

Все якоря в норме. Вердикты вынесены чистой `computeDrift`, не LLM.