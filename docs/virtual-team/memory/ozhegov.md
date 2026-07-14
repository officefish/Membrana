# Журнал субъектного опыта — ozhegov (Структурщик)

> Автогенерация `yarn persona:memory ozhegov` — файл перезаписывается целиком,
> руками не редактировать. Человек-гейт = ревью diff в PR. Фаза 1 инсайта
> `insight-persona-persistent-memory`; важность записи — человек-флаг в
> `docs/virtual-team/memory/importance.json` (ключ = provenance).

Записей: 34 из 72 кандидатов (бюджет <5000 токенов).

### 2026-07-14 · голос · insight-office-panel-qa-section

> внедрять: Да · этап: вместе с панельным эпиком #438 · оценка: 7/10 — Архитектурно чисто и дёшево. Источник истины — markdown в `docs/comms/qa/` (одна запись = один файл с фронтматтером: вопрос, дата, роль-автор, версия корпуса метрик) — редактируется без кода, ревьюится обычным PR-флоу, RAG-индексация приходит бесплатно. Панель читает контент за […]

— источник: `docs/insights/insight-office-panel-qa-section/REVIEW.md#vote`

### 2026-07-14 · позиция · detector-compare-board

> Это и есть развилка 2. Эпик зафиксировал границу «panel зависит максимум от `@membrana/core`». `@membrana/sample-playback-service` — готовый waveform, но он тянет привычки клиентской библиотеки и создаёт прецедент размывания границы на второй же день жизни панели. Термины: […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/detector-compare-board-2026-07-14.md#reply-1`

### 2026-07-14 · позиция · office-panel-contour

> Форма (a) — новый `apps/panel` — ложится в граф чисто: `apps/*` уже 7 приложений, turbo дёшев, изоляция по comms-прецеденту (CC1-CC9) — норма, а не украшательство. Секция в кабинете (b) создала бы синоним-слой: две аудитории под одним публичным API кабинета, связанность растёт. […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/office-panel-contour-2026-07-14.md#reply-1`

### 2026-07-14 · позиция · quality-control-contour

> Начну с терминов, чтобы не поплыли. «Контроль качества» — зонтичный термин с двумя контурами и разными источниками данных: **командный контур** (панель: drift-anchor, benchmark-таблицы, golden-корпус, baseline — проектные данные, живут в репо/office-digest) и **пользовательский […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/quality-control-contour-2026-07-14.md#reply-1`

### 2026-07-13 · позиция · agent-tooling-friction

> Прежде чем говорить о форме — уточню границы. Четыре инструмента разнородны по зоне ответственности: (1) и (2) — про артефакты и реестры репозитория (docs/), (3) и (4) — про сеть и LLM-провайдеров. Это два разных «словаря». Меня смущает объединение в один пакет […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/agent-tooling-friction-2026-07-13.md#reply-1`

### 2026-07-13 · позиция · live-neural-combined-fusion

> По точке (1) — однозначно **одна точка**: добавить yamnet в список `createCombinedStreamDetectors()`. Это не вкус, это граф зависимостей. Функция уже питает И клиентский плагин `mic-combined-detection`, И device-board мост `scenarioMicJournalBridge:1236` через […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/live-neural-combined-fusion-2026-07-13.md#reply-1`

### 2026-07-13 · позиция · team-evening-feedback

> Ozhegov. Оценка артефактов: стендап дал мне чёткий мандат вести DA4/DA5 чистой функцией — и это сошлось: `buildCodeAnchorRecord`/`evaluateProdMainDivergence` живут в `@membrana/core` (#413, ADR 0003), а office получил тупой транспорт (POST/GET digest, #418, ADR 0004). Инвариант […]

— источник: `docs/seanses/team-evening-feedback-2026-07-13.md#reply-1`

### 2026-07-12 · голос · insight-persona-persistent-memory

> внедрять: да · этап: месяц · оценка: 7/10 — Архитектурно чисто ложится как **детерминированный read-only контур ритма** — тот же паттерн, что `hermes-brief` (PR #316): extractor читает `docs/seanses/*-PROTOCOL.md` и `docs/insights/*/REVIEW.md`, пишет `docs/virtual-team/memory/<persona>.md`, загрузчик consilium/ask […]

— источник: `docs/insights/insight-persona-persistent-memory/REVIEW.md#vote`

### 2026-07-12 · позиция · drift-anchor-triggers

> Зафиксирую термины, иначе спор будет о словах. У нас два разных якоря: **data-anchor** — дрейф входных данных/фичей при фиксированном коде детектора, и **code-anchor** — дрейф самого детекторного кода при фиксированном эталонном наборе. Это две леммы, не одна. Frozen-image ловит […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/drift-anchor-triggers-2026-07-12.md#reply-1`

### 2026-07-12 · позиция · nightly-agents-platform

> Стоп — прежде чем плодить сущности, дам определение по-ожеговски. У нас уже есть три словарные статьи: `night-triage` (детерминированный триаж реестра), `night-hunt` (Claude через media-прокси), `hermes:brief` (сборщик состояния сессии, 6 источников). Не создавайте четвёртый […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/nightly-agents-platform-2026-07-12.md#reply-1`

### 2026-07-12 · позиция · s2-combined-uc-dsp

> Прежде чем строить — зафиксируем нумерацию агенды, чтобы каждая точка получила отдельный вердикт. Читаю задачу так: **(1)** наполнить пустой scaffold `usercase-free-combined-alarm` (loadDocument сейчас отдаёт пустой валидный документ); **(2)** цепочка […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/s2-combined-uc-dsp-2026-07-12.md#reply-1`

### 2026-07-12 · позиция · team-evening-feedback

> Ozhegov. Оценка артефактов: план дня хорошо охранял границы (fusion — в сценарии, не в analyzer-сервисе; `detection-ensemble-service` не выделять) — этот инвариант в коде соблюдён. Но артефакты не предвидели drift-anchor как отдельный пакет, поэтому по факту документы отставали […]

— источник: `docs/seanses/team-evening-feedback-2026-07-12.md#reply-1`

### 2026-07-11 · позиция · detection-alarm-loop-switch

> Зафиксирую термины, иначе будем спорить о синонимах. У нас три сущности с разной леммой: `lastDetection` (выход make-detection-fusion? или выход соло-детектора?), `fusionStore` (последний `DetectionFusion` main-тика) и `branch-on-detection` (exec-ветвление по `combinedScore ≥ […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/detection-alarm-loop-switch-2026-07-11.md#reply-1`

### 2026-07-11 · позиция · team-evening-feedback

> Ozhegov **Оценка артефактов:** Документы внутренне непротиворечивы и хорошо детализированы (Фаза 0 гигиены, DoD по задачам), но ценность плана как «карты дня» просела — реальный git-трек (#355–#359 + OM-миграция) в утренних артефактах не предсказан вовсе. `DAILY_CODE_REVIEW` […]

— источник: `docs/seanses/team-evening-feedback-2026-07-11.md#reply-1`

### 2026-07-10 · позиция · comp-findings-fixes

> Тогда зафиксируем термин. Сейчас «invalid-ref» перегружен: он означает и «значение ещё не готово», и «типовое несоответствие». Это как раз то, против чего я — один термин, один смысл. Предлагаю: пустой batch → `ref{ valid:false, kind: <target> }` — то есть **ref знает свой […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/comp-findings-fixes-2026-07-10.md#reply-1`

### 2026-07-10 · позиция · night-triage-routine

> По сути пилот не создаёт новую инфраструктуру, а замещает звено — это правильный шаг с точки зрения связанности. Ключевой инвариант «sink not source» соблюдён: отчёт — производная от состояния репо и трекера. Меня беспокоит одно: рутина читает `registry.json` и `README.md`, но […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/night-triage-routine-2026-07-10.md#reply-1`

### 2026-07-10 · позиция · team-evening-feedback

> Ozhegov. Оценка артефактов: MAIN_DAY_ISSUE и DAILY_STANDUP чётко прописали Фазу 0 (гигиена дерева) и границы (device-board→core), что помогло; DAILY_CODE_REVIEW корректно поднял P2-warning и watch-точки по синглтону LiveJournal и error-visibility latent. Расхождение план↔факт по […]

— источник: `docs/seanses/team-evening-feedback-2026-07-10.md#reply-1`

### 2026-07-09 · голос · insight-hermes-liaison-agent

> внедрять: да · этап: сейчас · оценка: 8/10 — Размещение в `scripts/` + `.claude/`, вне графа `packages/services/*` — правильно, слой ops/tooling переносим и не создаёт связей с foundation/analyzer. Переиспользование `git-day-context.mjs` вместо дублирования — за это отдельный плюс. Ключевое требование от меня: […]

— источник: `docs/insights/insight-hermes-liaison-agent/REVIEW.md#vote`

### 2026-07-09 · голос · insight-team-stack-watch

> внедрять: Да · этап: неделя (формат+инъекция), месяц (stack-watch) · оценка: 7/10 — Архитектурно идея чистая, если удержать развязку. Q1/Q2 дают правильный каркас: **разделить role-definition (промпт персоны) и knowledge-source (досье/RAG)**. Это ровно наш принцип слабой связанности — досье `docs/virtual-team/knowledge/<persona>.md` не должно импортироваться […]

— источник: `docs/insights/insight-team-stack-watch/REVIEW.md#vote`

### 2026-07-09 · позиция · board-alarm-scenario-nodes

> Поддерживаю Математика и Teamlead: `DetectionFusion` — value-тип, симметрично `FftTrendsPolicy`, один термин — один смысл. Ref вводим только когда сущность имеет идентичность и время жизни (поток, трек, отчёт). Тогда словарь чистый: `EnsembleAnalysisRef`, `ProximityRef`, […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/board-alarm-scenario-nodes-2026-07-09.md#reply-1`

### 2026-07-09 · позиция · team-evening-feedback

> Границы пакетов сегодня — образцовый день. Оценка артефактов: план и стендап корректно назначили мне корень wire-дублирования (Задача 3) как приоритет — и это оказалось правильным вложением, а не «долгом ради долга». `MAIN_DAY_ISSUE` держал DoD «только core+audio-engine» для […]

— источник: `docs/seanses/team-evening-feedback-2026-07-09.md#reply-1`

### 2026-07-08 · позиция · hermes-liaison-agent

> Терминологически наведу порядок. «Hermes» как **агент** и «hermes:brief» как **скрипт** — два разных смысла одного слова, и это опасно. Предлагаю зафиксировать: `hermes:brief` — это **утилита сбора** (`scripts/hermes-brief.mjs`), лемма «сборщик брифа». Отдельный агент […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/hermes-liaison-agent-2026-07-08.md#reply-1`

### 2026-07-08 · позиция · team-evening-feedback

> Ozhegov. Оценка артефактов: MAIN_DAY_ISSUE чётко расставил границы («fusion в core/client, НЕ в detectors/*»), и по факту diff это соблюдено: `detection-fusion.ts` лежит в `packages/core/src/contracts/`, а не внутри детекторов. Регламент границ отработал; code-review подтвердил […]

— источник: `docs/seanses/team-evening-feedback-2026-07-08.md#reply-1`

### 2026-07-07 · позиция · team-evening-feedback

> Ozhegov **Оценка артефактов дня:** Документы были точны в границах: fusion-контракт явно предписан в `@membrana/core`, а не внутри `detectors/*` (`check:boundaries`), device-board — только от core. Это правильная дисциплина. Расхождение: план вёл в core/детекторы, а фактическая […]

— источник: `docs/seanses/team-evening-feedback-2026-07-07.md#reply-1`

### 2026-07-06 · голос · insight-telegram-work-reports

> внедрять: Да · этап: after-MVP · оценка: 5/10 — Архитектурно чисто. `modules/telegram` = тонкий outbound-адаптер: `TelegramClient` (Bot API, токен/chat_id из env) + `TelegramNotifier` (шаблоны сообщений) + подписка на существующий `modules/webhooks` (GitHub merge event) и один POST-endpoint для вечерней сводки. Никаких прямых […]

— источник: `docs/insights/insight-telegram-work-reports/REVIEW.md#vote`

### 2026-07-06 · позиция · partner-tutorials-design

> Стоп на терминах. «Туториал» — это лемма, у неё должно быть одно определение в контуре. Предлагаю: туториал = пошаговый сценарий одной задачи партнёра, живущий в `apps/comms-studio/` (или его `docs/`), выводящий артефакты только в `out/`. Он **не импортирует** ничего из […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/partner-tutorials-design-2026-07-06.md#reply-1`

### 2026-07-06 · позиция · team-evening-feedback

> Ozhegov **Оценка артефактов:** Документы дня ставили мне чёткую роль — стеречь границы `detectors/*` в задачах A/D/E. По факту работа ушла в другие пакеты, но границы там соблюдены не хуже. `MAIN_DAY_ISSUE` оказался нерелевантен фактическому diff — это минус согласованности, но […]

— источник: `docs/seanses/team-evening-feedback-2026-07-06.md#reply-1`

### 2026-07-05 · голос · insight-comms-contour-topology

> внедрять: Да, leaf + `check:boundaries` · этап: Сейчас · оценка: 9/10

— источник: `docs/insights/insight-comms-contour-topology/REVIEW.md#vote`

### 2026-07-05 · позиция · comms-contour-topology

> Изоляция внутри монорепо — это не вопрос тулинга, это вопрос дисциплины и явной граничной политики. У нас уже есть `yarn check:boundaries` для запрета входящих рёбер в новые пакеты; мы можем добавить явное правило: `apps/comms-studio` (или `docs/comms-contour`) — leaf-ноль, от […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/comms-contour-topology-2026-07-05.md#reply-1`

### 2026-07-05 · позиция · comms-contour-topology-opus

> Начну с определения, иначе спор расплывётся. «Контур communications» — это leaf-пакет графа: ноль исходящих рёбер к нему, много входящих рёбер от него (он читает канон). Инвариант «сток, не исток» на языке графа зависимостей — это `indegree(comms) = 0` для продуктовых пакетов. У […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/comms-contour-topology-opus-2026-07-05.md#reply-1`

### 2026-07-05 · позиция · day-focus-vdr-unblocked-scope

> И структурно zero-shot scaffold в брифе создаёт `@membrana/zero-shot-detector` — новый пакет в `packages/services/detectors/*`. Это M-задача с новым публичным API и graph-эффектом. По ARCHITECTURE §1e детектор зависит от `core` + `detector-base`. Scaffolding нового пакета **без […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/day-focus-vdr-unblocked-scope-2026-07-05.md#reply-1`

### 2026-07-05 · позиция · team-evening-feedback

> Ozhegov. Оценка артефактов: План был архитектурно грамотен (transport/time-sync контракты, leaf-zero инвариант), а `DAILY_CODE_REVIEW` верно отметил, что границы пакетов не тронуты. Но канон дня и то, что реально делалось (leaf-контур comms), жили в разных документах — это […]

— источник: `docs/seanses/team-evening-feedback-2026-07-05.md#reply-1`

### 2026-07-04 · позиция · pairing-lifecycle

> Упорядочу архитектуру. OQ1: контракт presence — предлагаю **новый тип сообщения** `presence.snapshot: { onlineDeviceIds: string[] }`, отправляемый **один раз** при `registerCabinet`, отдельно от stream `presence.nodeOnline/Offline`. Это чище, чем N событий одного типа, и […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/pairing-lifecycle-2026-07-04.md#reply-1`

### 2026-07-04 · позиция · presence-capture-board

> Логирование — хорошо, но это касается моей зоны: node-realtime-service.ts, authenticateNode, registerNode. Я в полной мере согласен логировать эти три события с лог-уровнем `info` по ним всегда, `error` при auth-fail. **Но ключевой вопрос OQ1:** нужно ли **асинхронно** […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/presence-capture-board-2026-07-04.md#reply-1`
