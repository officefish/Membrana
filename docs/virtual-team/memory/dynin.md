# Журнал субъектного опыта — dynin (Математик)

> Проекция оперативной памяти (O) из архива подсознания — руками не редактировать.
> Источник истины: docs/virtual-team/memory/archive/dynin.jsonl (append-only). Состав задаёт политика C2
> (pinned вне бюджета — importance.json ПРОВОДИТСЯ в отбор; comparator ординалами,
> recency — последний ключ). Полная лента и вытесненное — в архиве, не потеряно.

Записей: 50 · бюджет 14383/14400 · статус ok
<!-- archive_from: docs/virtual-team/memory/archive/dynin.jsonl · transferred: 196 (причины в op-log) -->

### 2026-07-28 · позиция · memory-subconscious-m0-order

> Предикат ребра фиксирую как в bridge/leveling M0: ребро A→B ⇔ область определения вопроса B содержит переменную, которую задаёт ответ A. Не runtime-порядок скриптов и не «удобно обсуждать рядом». Кандидаты V={C1..C6}: C1 подсознание (структура/переток), C2 приоритизация […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/memory-subconscious-m0-order-2026-07-28.md#reply-1`

### 2026-07-28 · позиция · memory-subconscious-m1-subconscious

> Формализую без UI. Пусть O — множество записей оперативной проекции, |serialize(O)| ≤ B (бюджет ~5K токенов — факт регрессии). A — append-only множество архивных записей. Переток τ: o ↦ a сохраняет `id`/`provenance` и даёт `fullRef` на полное тело. Предикат «ничто не умирает»: […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/memory-subconscious-m1-subconscious-2026-07-28.md#reply-1`

### 2026-07-28 · позиция · memory-subconscious-m2-priority

> Формализую без UI. Пусть кандидаты K — множество записей с meta. Бюджет: `|serialize(O)| ≤ B`. Человек-флаг: `imp(p) ∈ importance.json` по ключу provenance. Предикат pinned: `pinned(k) ⇔ imp(prov(k)) = pinned ∨ class(k) ∈ NonEvictable`. Инвариант: pinned ⊈ бюджетного конкурса — […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/memory-subconscious-m2-priority-2026-07-28.md#reply-1`

### 2026-07-28 · позиция · memory-subconscious-m3-surfacing

> Формализую без UI. Пусть архив A_p персоны p — адресуемая лента (C1). Запрос q → embedding e(q). Наивный top-K(sim(e(q), e(a))) даёт ~45% ложных привязок (research #1366) — MMR обязателен. MMR: итеративно argmax [λ·sim(a,q) − (1−λ)·max_{b∈S} sim(a,b)]. Serendipity: 1–2 записи из […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/memory-subconscious-m3-surfacing-2026-07-28.md#reply-1`

### 2026-07-28 · позиция · memory-subconscious-m4-cycle

> Формализую без UI. Пусть сутки D имеют два обязательных такта: E (evening-compress), M (morning-warmup), и множество вызовов всплытия Σ = {σ_agenda, σ_morning?, σ_gesture}. Предикат состоявшегося вечера: `done(E) ⇔ ∃ receipt_E ∧ transfer_ran ∧ rebuild_report ∈ […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/memory-subconscious-m4-cycle-2026-07-28.md#reply-1`

### 2026-07-28 · позиция · memory-subconscious-m5-metrics

> Формализую предмет без UI. C5 — не новый контур, а измерительная обвязка над C1–C4. Вход: события с носителей (архив, operational, cloud, receipts). Выход: (1) append-only лог операций, (2) счётные агрегаты v1, (3) предикат сигнала sunk_unsurfaced, (4) наполнение третьей строки […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/memory-subconscious-m5-metrics-2026-07-28.md#reply-1`

### 2026-07-28 · позиция · memory-subconscious-m6-extractor

> Формализую selectOperational без UI: `selectOperational(candidates, importance, budget) → {retained, transferred, report}`. Инварианты: Σtokens(retained) ≤ budget; pinned ⊆ retained ∨ fail-closed error; transfer сопровождается importanceSnapshot. Предикат erase: отсутствует в […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/memory-subconscious-m6-extractor-2026-07-28.md#reply-1`

### 2026-07-27 · позиция · bridge-command-post-m0-order

> Предикат ребра фиксирую как в leveling/channels M0: ребро A→B ⇔ область определения вопроса B содержит переменную, которую задаёт ответ A. Не runtime-порядок скриптов и не «удобно обсуждать рядом». Обозначу кандидатов V={C1..C6}: C1 состав/носители, C2 фреймы ядра, C3 […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/bridge-command-post-m0-order-2026-07-27.md#reply-1`

### 2026-07-27 · позиция · bridge-command-post-m1-cast

> Формализую присутствие без UI. Род участника — закрытое множество из cast-carrier: `lead | voice | memory` (память долгов). Предикат резолва носителя: `resolvable(id) ⇔ id ∈ registry ∧ promptOrEngineExists(id) ∧ channelOrCall(id) ≠ ∅`. Для комнаты мостика нужен *отдельный* […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/bridge-command-post-m1-cast-2026-07-27.md#reply-1`

### 2026-07-27 · позиция · bridge-command-post-m2-frames

> Формализую без UI. Пусть сессия S имеет фазу `φ ∈ {idle, open, free, close, sealed}`. Trigger: `idle → open` только по явному слову капитана (не presence). Gate — булев предикат `g(ctx) → pass|wait|stop`, детерминированный по ctx, без «постараться». Homes — инъекция типа […] _(реплик в сеансе: 9)_

— источник: `docs/seanses/bridge-command-post-m2-frames-2026-07-27.md#reply-1`

### 2026-07-27 · позиция · bridge-command-post-m3-truth-contract

> Формализую треугольник без UI. Пусть T — озвученная мысль (цитата+адрес), P1,P2 — два доказательства пользы для продукта. Допуск к кандидату в кристалл: `triangle(T,P1,P2) = defined(T) ∧ benefit(P1) ∧ benefit(P2) ∧ distinct(P1,P2)`. Это необходимое условие формы, не достаточное […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/bridge-command-post-m3-truth-contract-2026-07-27.md#reply-1`

### 2026-07-27 · позиция · bridge-command-post-m4-improvisation-cases

> Формализую объект. Кейс = пара `(body, meta)`, meta — конечный набор меток с закрытыми доменами. Статика: после commit meta и body иммутабельны (append-only история версий — отдельный id, не mute in place). Предикат несущего: `bearing(case) ∈ {bearing, museum, candidate}` — […] _(реплик в сеансе: 8)_

— источник: `docs/seanses/bridge-command-post-m4-improvisation-cases-2026-07-27.md#reply-1`

### 2026-07-27 · позиция · bridge-command-post-m5-console

> Формализую предмет. Пульт — это пара каналов с разными контрактами: `exec_feed` (поток шагов цепочки) и `lead_chat` (дискретные доклады о событиях). Предикат «субагент запущен» обязан быть проверяем до первого шага цепочки: `carrier = subagent | inline | refused`. Инлайн перед […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/bridge-command-post-m5-console-2026-07-27.md#reply-1`

### 2026-07-27 · позиция · bridge-command-post-m6-debts-observations

> Чистая модель долга. Пусть \(D\) — множество активных долгов. События детерминированы: `birth(payload) → d∈D`, `repeat(d) → count++` при предикате повтора (#1208), `repay(d, evidence) → d∉D`. Одно \(d\) в один момент — ровно один status из закрытого enum. Наблюдение \(o\) **не** […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/bridge-command-post-m6-debts-observations-2026-07-27.md#reply-1`

### 2026-07-27 · позиция · day-memo-evening

> С составом согласен, но добавлю численную конкретику. «Что запомнилось» должно содержать метрики: сколько вещдоков добавлено, сколько кристаллов отчеканено, сколько долгов погашено/появилось, delta индекса. Без цифр «запомнилось» — публицистика. Также нужна секция […] _(реплик в сеансе: 3)_

— источник: `docs/seanses/day-memo-evening-2026-07-27.md#reply-1`

### 2026-07-27 · позиция · team-evening-feedback

> Оценка артефактов: MAIN_DAY_ISSUE ссылается на main-day-assertions.json как источник магистрали — это хороший прецедент машинной верификации. DAILY_CODE_REVIEW математически честен: diff не затрагивает чистые функции — замечаний нет. Итоги дня: консилиум-2 (#1333) — порог 30 […]

— источник: `docs/seanses/team-evening-feedback-2026-07-27.md#reply-1`

### 2026-07-26 · позиция · team-evening-feedback

> Оценка артефактов: математического контента нет — день целиком процедурный/тулинговый. MAIN_DAY_ISSUE корректен в части «легальное нет» (прецедент #1219 учтён). Итоги дня: чистых функций не писалось. Секретный гейт получил версионность — применимо к хэшам, но не моя зона. […]

— источник: `docs/seanses/team-evening-feedback-2026-07-26.md#reply-1`

### 2026-07-24 · позиция · membrana-leveling-m0-order

> Формализую предикат ребра. Ребро A→B существует тогда и только тогда, когда: область определения вопроса B содержит переменную, которую задаёт вопрос A. Проверяю: **L** — порог левелинга — это функция `level(file) ∈ {0,1,2,…}`. Чтобы сравнить уровень с порогом, нужно знать, к […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/membrana-leveling-m0-order-2026-07-24.md#reply-1`

### 2026-07-24 · позиция · membrana-leveling-m0-order-grok

> Зависимость здесь — отношение «вердикт A обязан существовать до осмысленного вердикта B», не runtime-порядок скриптов. Фундамент ищу там, где без определения остальные контракты не имеют области определения. Кандидат на носитель области — K1: четыре метки состояния path. _(реплик в сеансе: 5)_

— источник: `docs/seanses/membrana-leveling-m0-order-grok-2026-07-24.md#reply-1`

### 2026-07-24 · позиция · membrana-leveling-m1-disposition

> Чистая функция — мой контур. Сигнатура: `disposition(path, ctx) → {live|ready|unfinished|trash}`, где `ctx` — снимок наблюдаемых входов, без UI и без побочных эффектов. Порядок проверок обязан быть тотальным и детерминированным: одно path → ровно одно состояние. Приоритет […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/membrana-leveling-m1-disposition-2026-07-24.md#reply-1`

### 2026-07-24 · позиция · membrana-leveling-m2-gate

> Формализую без UI. Пусть \(S = \{(p_i, d_i)\}\) — конечный снимок. Индикаторы: \(T = \{p \mid d=\mathrm{trash}\}\), \(U = \{p \mid d=\mathrm{unfinished}\}\), \(R = \{p \mid d=\mathrm{ready}\}\), \(L = \{p \mid d=\mathrm{live}\}\). Остановка: \(\exists p\in T:\ p\ \text{не […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/membrana-leveling-m2-gate-2026-07-24.md#reply-1`

### 2026-07-24 · позиция · membrana-leveling-m3-manifest

> Контракт детерминирован: f(gate_output) → report. Без скрытого состояния, без повторного disposition. Факт = то, что воспроизводится из артефакта гейта байт-в-байт при повторной вёрстке. Любая фраза «кажется, надо решить владельцу» — либо вынесена в явную зону суждения, либо […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/membrana-leveling-m3-manifest-2026-07-24.md#reply-1`

### 2026-07-24 · позиция · membrana-leveling-m4-rails

> Гранулы — это контракт данных, не UI. По K1: `disposition` — вход гейта, не выход этой комнаты. Далее по цепочке без переопределения: `ready` питает main-fill; `isLeveled` / `legit` и манифест-отчёт — выходы workspace-level и доставки (K2). Численно проверяемо одно: каждый фрейм […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/membrana-leveling-m4-rails-2026-07-24.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m0-order

> Обозначу V={1..9} как в повестке. Предикат фундамента: убери a — остаётся ли область ответов остальных определённой? Убери 4: у 1 (control plane) нет ключей реестра, у 2 (телеметрия) нет поля procedure, у 3 (панель) нечего переключать, у 5 (fallback) неясна единица отказа. 4 […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/llm-procedure-channels-m0-order-2026-07-23-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m1-procedure-contract

> Формализую. Нужна инъекция `id: ProcedureId → Record`. Стабильность: ∀ события e с procedure=id история суммируется без rename-миграций. Если id:=yarnName, то rename — это смена ключа агрегации → разрыв ряда. Реестр с неизменяемым id и опциональным `yarnScript` сохраняет ряд. […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/llm-procedure-channels-m1-procedure-contract-2026-07-23-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m2a-scope

> Критерий «в scope v1»: процедура p ∈ scope ⇔ p ∈ registry ∧ p.meters ∧ routingEnabled(p). Для v1 routingEnabled = {code-review, consilium}. Каркас (transport, registry load, emit meter) — общий. Добавление id = PR в registry + флаг — O(1), без редизайна SoT. _(реплик в сеансе: 4)_

— источник: `docs/seanses/llm-procedure-channels-m2a-scope-2026-07-23-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m2b-control-plane

> Merge-правило: `effective(p) = overlay[p] ?? default[p] ?? builtinFail`. Overlay отсутствует → default. Локальный `.env` **не** задаёт channel (чтобы три worktree не разъехались молча). Секреты: `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` в env; выбор provider/model для p — в […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/llm-procedure-channels-m2b-control-plane-2026-07-23-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m3a-llm-proxy-seam

> Разделяю `Secrets` и `ProviderCatalog`. Secrets ∈ env files. Catalog ритуала ⊆ lib, стабильный subset (anthropic, openrouter; freemodel — optional flag). Experimental catalog может быть ⊇; ритуал не import path `scripts/experimental/**`. _(реплик в сеансе: 4)_

— источник: `docs/seanses/llm-procedure-channels-m3a-llm-proxy-seam-2026-07-23-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m3b-telemetry

> Событие v1: `{id, ts, procedureId, provider, model, source, tokensIn, tokensOut, latencyMs, ok, errorClass?}`. `promptHash` — optional later, не блокер v1. Агрегат дня = GROUP BY procedureId, provider на store. Emit: после HTTP ответа transport (success или fail). _(реплик в сеансе: 4)_

— источник: `docs/seanses/llm-procedure-channels-m3b-telemetry-2026-07-23-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m3c-fallback

> Форма: `effective.chain: ProviderId[]` непустой; try i=0..n-1; emit event per attempt; успех → break; все fail → exit≠0. Single provider = chain длины 1 (совместимо с C1). _(реплик в сеансе: 4)_

— источник: `docs/seanses/llm-procedure-channels-m3c-fallback-2026-07-23-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m4a-agent-usage

> Клиент: `emitUsage(event) → POST /v1/llm-usage/events` timeout короткий (например 2s); catch → stderr warn; не throw. Идемпотентность: клиентский `eventId` uuid на попытку — сервер dedupe. _(реплик в сеансе: 4)_

— источник: `docs/seanses/llm-procedure-channels-m4a-agent-usage-2026-07-23-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m4b-panel

> API поверхности (office): уже C1 putOverlay/getEffective + T1 day aggregate + events. Панель — тонкий клиент. Страница: (1) day summary cards; (2) table procedures in routing scope; (3) chain editor; (4) badge source на effective. _(реплик в сеансе: 4)_

— источник: `docs/seanses/llm-procedure-channels-m4b-panel-2026-07-23-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m5-sprint-ready

> Фазы эпика (кандидат 2 уточнённый): - **A** lib: `llm-procedures.json`, defaults, provider catalog, `resolveChannel`, transport+chain+emit stubs. - **B** wire: `code-review.mjs` + `consilium.mjs` на resolve/chain/emit. - **C** office: overlay + usage ingest/aggregate API. - […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/llm-procedure-channels-m5-sprint-ready-2026-07-23-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · request-container-api-k1-cabinet

> Формализую, иначе граница останется вкусовой. Кабинет `C = (P, L, T)`, где: **P** — множество разрешённых процедур (замкнутый перечень); **L** — множество лимитов (запросов/день, токенов/запрос, каналов); **T** — текущее состояние счёта (израсходовано). Предикат проверки: […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/request-container-api-k1-cabinet-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · request-container-api-m0-order

> Формализую зависимости. Обозначу вершины: K1 (кабинет), M2 (мастерская), A3 (актор), E4 (экономика), B5 (вдохи). Ищу рёбра в виде «ответ на B требует уже принятого ответа на A». Из штормовых посылок (Т1–Т7) вычитываю: **M2 → K1** (мастерская работает глаголами, полномочия выдаёт […] _(реплик в сеансе: 2)_

— источник: `docs/seanses/request-container-api-m0-order-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · request-container-api-m2-workshop

> Начну с чистого входа: у нас есть дом — контейнер заявок в `docs/audit/llm-calls`, фактура даёт ему семью `audit-family` из атласа. Фаррелл работает **глаголами** мастерской, каждый из которых — операция над содержимым дома. Текущее состояние: `audit` (осмотреть) и `decompose` […] _(реплик в сеансе: 2)_

— источник: `docs/seanses/request-container-api-m2-workshop-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · tasks-workshop-m0-order

> Проверю на циклы и связанность. Кандидаты 7 (README vs registry) и 10 (ошибочная приписка #915) — **разовые долги**, они не порождают контрактов для остальных кандидатов. Парадигма: долг чинится **после** того, как новый инструмент работает, иначе предсказуемо накопится дёрт. […] _(реплик в сеансе: 2)_

— источник: `docs/seanses/tasks-workshop-m0-order-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · tasks-workshop-m1-adress

> Формализую вердикт, иначе режим останется вкусовым. Пусть `W_primary = docs/tasks` (регистрация, истина, `worksOn: docs/tasks/registry.json`), `W_audit = docs/audit/tasks` (разборка, производная, `worksOn: docs/audit/tasks/registry/`). Инвариант: `|{m : m.worksOn = docs/tasks}| […] _(реплик в сеансе: 3)_

— источник: `docs/seanses/tasks-workshop-m1-adress-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · tasks-workshop-m2-set

> Начну с формализации, иначе граница поплывёт. Определю мастерскую как **множество команд, которые изменяют граф зависимостей или категоризацию** внутри `docs/tasks`. Обозначу каждую команду предикатом: `modifies_graph(cmd) → bool`. Обязательные (`audit`, `decompose`) — это […] _(реплик в сеансе: 2)_

— источник: `docs/seanses/tasks-workshop-m2-set-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · tasks-workshop-m3-axes

> Разделю оси по природе входа, иначе получим кашу из разных типов. Первая природа — **поля карточки**: `size`, `sprintKind`, `leadPersona`, `status`. Это готовые дискретные значения, раскладка по ним детерминирована и не требует ничего, кроме реестра. Вторая — **производные от […]

— источник: `docs/seanses/tasks-workshop-m3-axes-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · tasks-workshop-m4a-inspect

> Формализую, чтобы рекурсия не поехала. Паспорт карточки `C` — кортеж `(id, slug, status, owner, parentEpicId?, updatedAt, links[])`. Дочерние карточки возвращаются ТОЛЬКО если `parentEpicId` существует и сама карточка имеет статус live. База рекурсии: `depth ≤ 2` (карточка → […] _(реплик в сеансе: 3)_

— источник: `docs/seanses/tasks-workshop-m4a-inspect-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · tasks-workshop-m4b-validity

> Начну с чистоты, потому что от неё зависит всё остальное. У нас в проекте есть идиом, и он работает: `planPrShip`, `checkBaseFreshness`, `classifyHttpProbe` — чистая логика отделена от исполнения и покрыта тестом. Валидность обязана лечь в тот же ряд, и вот почему это не […]

— источник: `docs/seanses/tasks-workshop-m4b-validity-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · tasks-workshop-m4c-invariants

> Начну с формализации, иначе «инвариант» растворится в предчувствиях. Пусть **карточка** — это кортеж `(taskId, linearId, githubIssueNumber, status, dates)`. Есть три **соглашения о синхронизме**: (1) если `linearId ≠ null`, то должен существовать Linear-тикет с этим ID; (2) если […] _(реплик в сеансе: 3)_

— источник: `docs/seanses/tasks-workshop-m4c-invariants-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · tasks-workshop-m4d-readme

> Про дублирование добавлю предикат, чтобы это не осталось словами. Правило: у проверки один носитель — предикат групповой валидности; `task:sync-readme --check` допустим, но обязан быть **тонкой обёрткой** над ним, а не своей реализацией сравнения. Проверяется это просто: если […]

— источник: `docs/seanses/tasks-workshop-m4d-readme-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · tasks-workshop-m5a-pick

> Формализую разделение, чтобы не было подмены. Пусть `candidates: Card[]` — входные карточки. Функция возвращает `ranking: (card, score, reasoning) []`, где `score ∈ [0, 1]` (1 = идеальный one shot), а `reasoning` — именованный набор условий: `{ sizeCheck, serverImpactClue, […] _(реплик в сеансе: 3)_

— источник: `docs/seanses/tasks-workshop-m5a-pick-2026-07-23.md#reply-1`

### 2026-07-23 · позиция · tasks-workshop-m5b-chaining

> Формализую, иначе «цепочка» останется вкусовой. Пусть `shotHistory(path)` — это множество шотов по пути `path` за окно `W = 7 дней` (посылка о норме). Смежность: два пути считаю смежными, если их наибольший общий префикс (LCP) как кортежа папок имеет длину ≥ 2. Пример: […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/tasks-workshop-m5b-chaining-2026-07-23.md#reply-1`

### 2026-07-22 · позиция · home-workshop-m0-order

> Формализую, иначе «порядок» останется вкусовым. Множество кандидатов V, |V|=5. Строю частичный порядок по отношению «ответ на b предполагает уже принятый ответ на a». Проверяемый предикат фундамента: убери кандидат a — становится ли множество допустимых ответов на остальные […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/home-workshop-m0-order-2026-07-22.md#reply-1`

### 2026-07-22 · позиция · home-workshop-m1-contract

> Формализую, иначе «мастерская» останется вкусовой. Пусть три паттерна — три ортогональные оси в пространстве описания подграфа: `GC` — ось **пространства** (`where`), `PSV` — ось **времени/идентичности** (`when/which`), «Мастерская» — ось **операций** (`what-on`). […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/home-workshop-m1-contract-2026-07-22.md#reply-1`

### 2026-07-22 · позиция · home-workshop-m2-vocabulary

> Формализую, иначе «минимум трёх» останется вкусовым. Мастерская — это множество инструментов `T`, разбитое на три непересекающихся класса: `T = M ⊎ S ⊎ D`, где `M` (mandatory) — фиксированное `|M| = 3`, `S` (stack-like) — рекомендованное подмножество, `D` (domain) — открытое. […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/home-workshop-m2-vocabulary-2026-07-22.md#reply-1`

### 2026-07-23 · рутина · insight-one-shot-format

> внедрять: да, но не запускать без предиката · этап: неделя · оценка: 7/10

— источник: `docs/insights/insight-one-shot-format/REVIEW.md#vote`
