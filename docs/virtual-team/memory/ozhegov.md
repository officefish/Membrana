# Журнал субъектного опыта — ozhegov (Структурщик)

> Проекция оперативной памяти (O) из архива подсознания — руками не редактировать.
> Источник истины: docs/virtual-team/memory/archive/ozhegov.jsonl (append-only). Состав задаёт политика C2
> (pinned вне бюджета — importance.json ПРОВОДИТСЯ в отбор; comparator ординалами,
> recency — последний ключ). Полная лента и вытесненное — в архиве, не потеряно.

Записей: 48 · бюджет 14391/14400 · статус ok
<!-- archive_from: docs/virtual-team/memory/archive/ozhegov.jsonl · transferred: 258 (причины в op-log) -->

### 2026-08-03 · позиция · one-shot-manifest-m0-order

> Начну с лемм, иначе разойдёмся в терминах. Четыре вопроса — это четыре переменные: (1) фреймы и держатели, (2) основание однородности, (3) предикат объёма, (4) форма назначения. Ребро A→B в DAG означает одно: ответ на A определяет переменную, без которой вопрос B не имеет […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/one-shot-manifest-m0-order-2026-08-03.md#reply-1`

### 2026-08-03 · позиция · one-shot-manifest-m1-frames

> Уточняю термины, иначе поедем на синонимах. **Фрейм процедуры** — именованная запись в манифесте с полями `id`, `owner`, семантикой артефакта, который кадр производит или принимает. **Шаг чек-листа** — безымянный пункт внутри фазы без держателя и без собственной записи в ленте. […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/one-shot-manifest-m1-frames-2026-08-03.md#reply-1`

### 2026-08-03 · позиция · one-shot-manifest-m2-assignment

> Уточню лемму «акт». Акт — это запись с адресом, не реплика в чате. Если назначение тимлида живёт только в диалоге — это дисциплина, не механизм. Нам нужна запись с тремя обязательными полями минимум: `assignedPersona` (кто назначен), `shotId` (на какой шот), `assignedBy` […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/one-shot-manifest-m2-assignment-2026-08-03.md#reply-1`

### 2026-08-03 · позиция · one-shot-manifest-m3-volume

> Уточняю лемму по записи прогона. M1 даёт три точки: старт `first-frame`, `owner-ratify`, закрытие `execute`. Запись прогона предиката S должна быть привязана к точке момента: первый прогон фиксируется в `first-frame` (прогноз), второй — в `execute` (факт). `owner-ratify` — […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/one-shot-manifest-m3-volume-2026-08-03.md#reply-1`

### 2026-08-03 · позиция · one-shot-manifest-m4-homogeneity

> Зафиксирую термины до начала. В повестке три кандидата, но только один существует в коде прямо сейчас — `pathFamily` из `scripts/lib/one-shot-s-predicate.mjs`. Граф зависимостей уровня путь-к-пути — факт отсутствия, не кандидат для выбора. Голос Фаррелла — вне гейта, в основания […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/one-shot-manifest-m4-homogeneity-2026-08-03.md#reply-1`

### 2026-08-02 · позиция · team-evening-feedback

> Ожегов. Оценка артефактов: `MAIN_DAY_ISSUE` содержит колонку «Посылки» с маркерами `file:` и `symbol:` — это правильная форма проверяемых утверждений, но применена только к двум пунктам из семи в «Сегодня делаем». Форма верная, охват — половинчатый. Итоги дня: […]

— источник: `docs/seanses/team-evening-feedback-2026-08-02.md#reply-1`

### 2026-08-01 · позиция · evening-review-predicate-m0-order

> Уточняю леммы, чтобы не плодить синонимы. Кандидат (3) — это не просто «порядок документов», это ещё и «судьба вердикта M4 от 18.07». Это двусоставная переменная. Вопрос (5) про опору аудита на память сессий — в нём заложено, что аудит уже существует как шаг и занимает известное […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/evening-review-predicate-m0-order-2026-08-01.md#reply-1`

### 2026-08-01 · позиция · evening-review-predicate-m1-subject

> Уточняю лемму единицы. «Разработка, прожитая тремя-четырьмя сессиями» — слово владельца, но для машинного опознания нужна однозначная статья. Предлагаю: единица суждения вечера — **активная карточка реестра** (`docs/tasks/registry.json`), затронутая в течение дня. Карточка — это […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/evening-review-predicate-m1-subject-2026-08-01.md#reply-1`

### 2026-08-01 · позиция · evening-review-predicate-m2-order-of-three

> Леммы, иначе путаница. **Строка Lifecycle M4** — одна именованная норма внутри вердикта M4: «вечерняя цепочка после `truth.mjs cool` и `code-review`». **Форма генератора M4** — отдельная часть вердикта: как формируется документ хроники (генератор, тернарный вердикт, двухфазный […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/evening-review-predicate-m2-order-of-three-2026-08-01.md#reply-1`

### 2026-08-01 · позиция · evening-review-predicate-m3-volume-measure

> Уточняю термины, иначе будем спорить о разных вещах. «Мерка объёма» — это функция card → ℕ, применённая к одной карточке: осмысленна. «Агрегат по дню» — это функция {card₁…cardₙ} → ℕ, потерявшая структуру множества: теряет информацию о распределении. «Реляционный предикат […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/evening-review-predicate-m3-volume-measure-2026-08-01.md#reply-1`

### 2026-08-01 · позиция · evening-review-predicate-m4-memoization

> Разведу термины, чтобы не ехать на синонимах. «Мемоизация в голове вечера» — это не тип операции, это временно́й слот: то, что происходит ДО `day-memo`. Орган `team-memory-report` (шаг 6) — читатель, не писатель; он не мемоизирует, он отчитывается о состоянии памяти. Орган […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/evening-review-predicate-m4-memoization-2026-08-01.md#reply-1`

### 2026-08-01 · позиция · evening-review-predicate-m4s-existing-organs

> Леммы. archive-night-hunt и archive-daily-day — имена шагов 2 и 3 по фактическому источнику evening-ritual-steps.json. Их функция из имён читается как архивирование ночных и дневных артефактов — не транскриптов сессий. sessions:scan и sessions:extract — отдельные скрипты с […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/evening-review-predicate-m4s-existing-organs-2026-08-01.md#reply-1`

### 2026-08-01 · позиция · evening-review-predicate-m4x-session-archive

> Леммы. **Голова вечера** — входной корпус для `day-memo`. **Тракт** — связанная цепочка вызовов, где выход одного органа становится входом следующего. **Тракта нет** — факт о связях между органами, не о существовании органов. Из трёх органов на вход `day-memo` сегодня может […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/evening-review-predicate-m4x-session-archive-2026-08-01.md#reply-1`

### 2026-08-01 · позиция · evening-review-predicate-m6-quality-gates

> Лемма про разделение ответственности. Три документа вечера имеют разную природу входа: `day-memo` суммирует день целиком (вход: `C_day`), `audit-evening` отражает ход цепочки (вход: артефакты прогона), `code-review` судит код (вход: коммиты и контракты). Один предикат покрытия […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/evening-review-predicate-m6-quality-gates-2026-08-01.md#reply-1`

### 2026-07-30 · позиция · sprint-honest-m2-contract

> Леммы, иначе синонимы. **Контракт спринта (SprintContract)** — именованный артефакт окна S: предмет + границы + предикат сделанного; не Issue, не task-prompt, не зона leadPersona. **Формулировщик** — роль/слот, который *создаёт* C до назначения accept. **Принятие** — […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/sprint-honest-m2-contract-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · sprint-honest-m3-contract-review

> Леммы, иначе синонимы. **ContractReview** — именованный акт: subject = performer projection (M1), object = Contract (M2), input = EvidenceDone, output = VerdictRecord. **VerdictRecord** — вещдок-запись, не chat-реплика. **diff[]** — список полей/пунктов контракта, где D ⊭ C. Не […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/sprint-honest-m3-contract-review-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · sprint-honest-m4-calls

> Леммы, иначе синонимы. **Вызов исполнителя (PerformerCall)** — именованный акт a∈A с субъектом p и sprintId S, инициированный по контракту окна. **Квитанция (Receipt)** — значение Result.ok: стабильный id + a + S + p + ts + (опц.) payloadHash. **Отказ (Refusal)** — Result ветки […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/sprint-honest-m4-calls-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · sprint-honest-m5-auditor

> Леммы, иначе синонимы. **Аудитор спринта** — не persona-советчик и не запись в реестре голосов консилиума; это **слот назначения** `AuditAssignment(S) → auditorId`, отдельный от `Assignments(S)` исполнения (M1) и от ведущего окна. **Ведущий (lead)** — кто вёл принятие/ритм окна […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/sprint-honest-m5-auditor-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · sprint-honest-m6-moderation

> Леммы, иначе синонимы. **Ведение (facilitation)** — оркестрация окна: очередь, гейты, журнал «спросили/ответили». **Надзор (supervision)** — предметно-процедурное суждение: достаточно ли следа, LGTM/BLOCK, «рот тот». **Исполнитель** — M1: assignment + participation evidence. […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/sprint-honest-m6-moderation-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · sprint-honest-m7-second-door

> Леммы, иначе синонимы. **Шов выбора (choice seam)** — точка фиксации режима *до* старта исполнения, не UI-тогл mid-flight. **Режим honest** — действует контракт M1–M6 (assigned ≠ participated, следы, аудитор). **Режим no_persona** — режим *без* персональной ответственности; не […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/sprint-honest-m7-second-door-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · sprint-honest-m8-memory

> Леммы, иначе снова синонимы. **Позиция** — словарная статья «что персона утверждала в комнате» (уже есть). **Акт** — именованное обязательство контракта в спринте (не diff и не «работал»). **Результат** — закрытый исход акта относительно DoD/приёмки. **След** — адресуемый […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/sprint-honest-m8-memory-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · sprint-honest-m9-cards

> Леммы. **leadPersona** — словарная статья *назначения/плана* (assignment intent), home: `docs/tasks/registry.json` карточка. **Исполнитель (M1)** — не leadPersona; отдельный предикат по evidence. **Гейт непустоты** — сейчас проверяет синтаксис плана, не факт. Синоним […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/sprint-honest-m9-cards-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · workshop-wires-m0-order

> Леммы «ждёт» только контрактные: без ответа A у B нет области определения. Имена — как в повестке, без новых ярлыков. Фундамент области — (1). (8) — словарная статья «дом теста»: только после (1). (2) — признаки обнаружения и неймспейс в справочнике: после (1). (3) — […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/workshop-wires-m0-order-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · workshop-wires-m1-home-namespace

> Леммы, иначе синонимы. **Дом (home)** — каталог с `workshop.manifest.json` по паттерну HOME_WORKSHOP; умеет verbs, worksOn, опц. kit. **Неймспейс (namespace)** — не мастерская: нет обязанности verbs/kit; это именованная область членства скриптов. **Держатель дома** — leadPersona […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/workshop-wires-m1-home-namespace-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · workshop-wires-m2-atlas-discovery

> Леммы, иначе снова синонимы. **Контейнер (дом)** — каталог-носитель документации/артефактов с опознаваемой границей. **Мастерская** — контейнер с `workshop.manifest.json` (контракт скриптов). **Неймспейс** — запись `docs/namespaces/REGISTRY.json` (M1): holder + membership; не […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/workshop-wires-m2-atlas-discovery-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · workshop-wires-m3-scripts-instrument

> Леммы, иначе синонимы. **Дом** `scripts/` — контейнер с README (+ AGENT_PROMPT как локальный канон). **Мастерская** — дом ∧ `workshop.manifest.json`. **Набор** в обратном поиске — пока закрываем как *kit* (MANIFEST roots/pins); namespace и home — отдельные слои belongs, не […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/workshop-wires-m3-scripts-instrument-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · workshop-wires-m4-invariant-tooth

> Леммы, иначе синонимы. **Инвариант принадлежности** — машинный предикат над выходом `orphans`, не лозунг. **Носитель** — home зуба (хук/job/ритуал), не «слой ощущений». **Baseline** — версионированный снимок `{ orphans[], counted, denominator, frozenAt }` на момент включения. […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/workshop-wires-m4-invariant-tooth-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · workshop-wires-m5-kit-frame

> Леммы, иначе снова синонимы. **Фрейм процедуры** — элемент полосы `frames` манифеста: `{id, holder, pins?}` + тег рода. **Кит** — `kits/<id>/MANIFEST.json`, отдельный артефакт с собственным leadPersona. **Фрейм кита** (кандидат) — не сам кит, а объявление процедуры: «сессии на […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/workshop-wires-m5-kit-frame-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · workshop-wires-m6-session-hook

> Леммы, иначе синонимы. **Пол (Floor)** — генерируемый снимок старта, не рукописная глава AGENTS.md. **Мастерская** — home с манифестом (12 сегодня), не любой из ≤45 D_home. **Выдача** — проекция из источников истины; ручная строка в Floor запрещена (вещдок 11/253). **Источник:** […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/workshop-wires-m6-session-hook-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · workshop-wires-m7-norm-in-docs

> Леммы, иначе синонимы. **Норма-порядок** — предписание последовательности действий (не запрет грепа навсегда). **Грабля** в `AGENTS.md` — рукописная статья «врёт или кусает», не полный устав. **Регламент** — `docs/prompts/*` / skill, процедура на класс задач. **Пол** (§6) — […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/workshop-wires-m7-norm-in-docs-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · workshop-wires-m8-tests-parking

> Леммы, иначе снова синонимы. **Предмет теста** — файл-инструмент, на который указывает stem по закрытому списку локусов. **Спутник** — `*.test.mjs`, чьё членство *выводится* из членства предмета. **Дом тестов** как отдельная лемма home — не вводим: в дереве нет `docs/tests`, а […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/workshop-wires-m8-tests-parking-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · workshop-wires-m9-wholesale-retail

> Леммы, иначе синонимы. **Пол (floor)** — проекция discovery: список мастерских × входной глагол × min-callable × doc-ref; home — генератор из проекции (§6). **Провод (wire)** — адресуемая стыковка *конкретного* инструмента/контейнера к callable-пути и контракту вызова. […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/workshop-wires-m9-wholesale-retail-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · task-archive-cold-store-m0-order

> Леммы «ждёт» только контрактные: без ответа A у B нет области определения. Имена — как в повестке, без новых ярлыков. **Q1 SoT** — лемма «канон архива». **Q2 checkpoint** — нотариальный слепок. **Q3 evidence** — состав archival record. **Q4 recovery** — проверка/восстановление. […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/task-archive-cold-store-m0-order-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · task-archive-cold-store-m1-source-of-truth

> Леммы, иначе синонимы. **Cold archive record** — иммутабельная запись закрытой задачи после архивации, home = collection в `background-office`/MongoDB. **Checkpoint** — проверяемый слепок/hash-носитель в git, не словарь полной истории. **Registry** — горячий/рабочий индекс […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/task-archive-cold-store-m1-source-of-truth-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · task-archive-cold-store-m2-evidence-contract

> Начинаю со словаря, иначе снова синонимы. **Cold-record** — каноническая append-only запись закрытия задачи в home MongoDB office, не строка registry и не markdown в git. **Closure evidence** — набор адресуемых доказательств, что задача закрыта, а не «помечена done». **Hint** — […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/task-archive-cold-store-m2-evidence-contract-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · task-archive-cold-store-m3-repo-checkpoint

> Леммы, иначе синонимы. **Cold archive** — append-only collection в `background-office` Mongo (M1). **Cold-record** — документ M2 (`task_closure` + sufficient proof). **Repo checkpoint** — файл-слепок инвариантов архива, не SoT и не export-dump. **Identity proof** — […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/task-archive-cold-store-m3-repo-checkpoint-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · task-archive-cold-store-m4-write-path-idempotency

> Леммы, иначе снова синонимы. **Cold-record writer** — единственный server-side путь в `background-office`, пишущий append-only Mongo-коллекцию канона (M1). **Checkpoint writer** — путь, который *только читает* Mongo SoT и материализует `ColdArchiveCheckpoint` (M3); он не […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/task-archive-cold-store-m4-write-path-idempotency-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · task-archive-cold-store-m5-recovery-audit

> Леммы, иначе синонимы. **Audit check** — чистая сверка carrier↔SoT, не write-path. **Export material** — полный канонический дамп records + манифест identity (count/hash) + метаданные checkpoint; dirty working tree не material. **Emergency SoT** — явно объявленный режим, не […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/task-archive-cold-store-m5-recovery-audit-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · task-archive-cold-store-m6-migration-path

> Леммы, иначе синонимы. **Legacy archive card** — markdown в `docs/tasks/archive/*.md`, носитель handoff-текста, не proof. **Hot registry** — `docs/tasks/registry.json`, рабочий индекс, derived относительно cold. **Canonical cold-record candidate** — payload, прошедший evidence […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/task-archive-cold-store-m6-migration-path-2026-07-30.md#reply-1`

### 2026-07-30 · позиция · task-archive-cold-store-m7-lifecycle-integration

> Леммы, иначе синонимы. **Insight revision** — словарная статья решения в `INSIGHT.md` / decision log инсайта: SoT, checkpoint, evidence contract, write path, recovery, migration policy. **Task work** — карточки исполнения (Notary, Mongo schema, export/checkpoint job, migration […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/task-archive-cold-store-m7-lifecycle-integration-2026-07-30.md#reply-1`

### 2026-07-29 · позиция · network-container-form

> Начинаю со словаря, иначе снова синонимы. **Контейнер network** — не туннель и не VPN-пакет, а home артефактов сетевого окружения и диагностики исходящих вызовов (LLM/API/git). **Орган** — именованный файл/команда с одной словарной ролью. **Исход (outcome)** — закрытый enum […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/network-container-form-2026-07-29.md#reply-1`

### 2026-07-29 · позиция · night-triage-insight-harvest

> Леммы, иначе снова синонимы. **Триаж** — проход сканера, не поставка. **Инсайт-карточка** — словарная статья с входом/выходом/ценой. **Черновик PR** — транспорт, не статус смысла. В четырёх ночах вижу смешение лемм. **Альтернатива:** один PR-ритуал закрытия пачки: файл-реестр […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/night-triage-insight-harvest-2026-07-29.md#reply-1`

### 2026-07-29 · позиция · sprint-honest-m0-order

> Леммы «ждёт» только контрактные: без ответа A у B нет области определения. Имена — как в повестке, без новых ярлыков. Фундамент области — (1): «назначенный ≠ участвовавший». Без этого «принял» в (2), «ревью исполнителем» в (3), «вызовы исполнителя» в (4), «аудитор≠исполнитель» в […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/sprint-honest-m0-order-2026-07-29.md#reply-1`

### 2026-07-29 · позиция · sprint-honest-m1-performer

> Леммы, иначе синонимы. **Назначение (assignment)** — запись связи sprintId → personaId (или agent-slot) до/на старте окна. **Участие (participation)** — наличие адресуемого следа исполнения, привязанного к тому же sprintId. **Исполнитель спринта** — не роль и не leadPersona […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/sprint-honest-m1-performer-2026-07-29.md#reply-1`

### 2026-07-29 · позиция · tariff-grid-m0-order

> Леммы «зависит» не смешиваем. **Контрактная** — без вердикта a у b нет области определения. **Фактурная** — b ждёт файл/PR в main. В M0 только контрактные. Имена — словарные статьи брифа, без жирных ID внутри вердикта-порядка: форма сетки; три исхода; отношение к рельсу […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/tariff-grid-m0-order-2026-07-29.md#reply-1`

### 2026-07-29 · позиция · tariff-grid-m1-form

> Леммы, иначе синонимы. **Тарифная сетка** — декларативный носитель entitlements, не UI-таблица и не разрозненные поля `User`/`Membrane`. **Entitlement** — одна словарная статья: id + kind + payload + (опц.) preconditionRef. **Источник истины** — серверный артефакт (конфиг/модуль […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/tariff-grid-m1-form-2026-07-29.md#reply-1`

### 2026-07-29 · позиция · tariff-grid-m2-rail

> Леммы, иначе синонимы. **Рельс** — замкнутый путь носителей: Prisma-поле → node-realtime → wire DTO → `device-board-module-config.entitledTariffSkus` → `ClientUserCaseCatalogService` → gate бейджей. **Сетка** — `TariffGridDocument` (registry + matrix), home на сервере. […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/tariff-grid-m2-rail-2026-07-29.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m2b-control-plane

> Владелец хочет **переключать канал с панели** — кандидат 1 (только git/PR) делает админа = merge, это не тумблер. Кандидат 3 (только .env) делает панель read-only по маршруту — прямо бьёт BRIEF. Остаются 2 (office SoT) и 4 (гибрид). _(реплик в сеансе: 5)_

— источник: `docs/seanses/llm-procedure-channels-m2b-control-plane-2026-07-23-2026-07-23.md#reply-1`
