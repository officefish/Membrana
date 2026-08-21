# Журнал субъектного опыта — ozhegov (Структурщик)

> Проекция оперативной памяти (O) из архива подсознания — руками не редактировать.
> Источник истины: docs/virtual-team/memory/archive/ozhegov.jsonl (append-only). Состав задаёт политика C2
> (pinned вне бюджета — importance.json ПРОВОДИТСЯ в отбор; comparator ординалами,
> recency — последний ключ). Полная лента и вытесненное — в архиве, не потеряно.

Записей: 50 · бюджет 14400/14400 · статус ok
<!-- archive_from: docs/virtual-team/memory/archive/ozhegov.jsonl · transferred: 316 (причины в op-log) -->

### 2026-08-21 · позиция · duty-node-detection-m1-slovar

> Леммы принимаю как словарные статьи, не как README-синонимы. Один термин — один смысл: `capture` / `session` / `duty` в коде; в русской прозе — съёмка / сеанс / дежурство. Синоним «наблюдение» как режим — нарушает норму словаря, его надо изъять из технического контура (код, ADR, […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/duty-node-detection-m1-slovar-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · duty-node-detection-m10-dalnost

> Начну с лемм, иначе разъедемся. «Физический слой» здесь — не пакет и не сервис: это ветрозащита, высота, ориентация, удаление от источников шума. «Предмет продукта» — то, без чего поставка узла считается неполной: комплект, документ, проверяемое требование. «Забота оператора» — […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/duty-node-detection-m10-dalnost-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · duty-node-detection-m2-cena-trevogi

> Лемма «тревога» ≠ лемма «детект». Детект — выход чистой функции/плагина. Тревога — маршрутизируемое событие с контрактом потребителя. Потребители кандидаты: (1) журнал дежурства, (2) человек/смена, (3) внешняя система, (4) никто. Словарь адресата должен быть закрытым enum в […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/duty-node-detection-m2-cena-trevogi-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · duty-node-detection-m3-razryadnost

> Лемма «полевой тракт» ≠ «любой захват в репозитории». Канон разрядности — контракт слоя захвата (sidecar/device path), не параметр UI и не опция математического ядра. Ядро принимает сэмплы; разрядность файла — свойство источника, его надо именовать однозначно в метаданных […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/duty-node-detection-m3-razryadnost-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · duty-node-detection-m4-forma

> Лемма носителя: публичный контур остаётся поллером ADR-0027 — исходящий канал, опрос очереди, исходы `ok · stale_key · backoff`. Дежурство не новый npm-пакет и не второй binary. Это **режимный слой** внутри того же процесса: флаг/состояние + обязанности, которые поллер […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/duty-node-detection-m4-forma-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · duty-node-detection-m5-granica

> Начну с лемм, иначе разъедемся. «Решение узла» и «вердикт сервера» — разные словарные статьи. Узел на дежурстве — поллер (M4): он тянет, копит, решает *маршрут материала*. Сервер — судья смысла: классификация, градация тревоги как доменный итог, запись в дом результатов. Посылка […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/duty-node-detection-m5-granica-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · duty-node-detection-m6-mera

> Леммы, чтобы словарь не поплыл. *Материал предъявления* — набор записей с явным паспортом (тракт, место, SNR или «тишина», наличие/отсутствие цели). *Мера* — чистая функция от размеченного материала к числу или кортежу чисел + оговоркам. *Публикуемое число* — то, что можно […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/duty-node-detection-m6-mera-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · duty-node-detection-m7-predikat

> Фиксирую лемму до спора. «Предикат события» — чистая функция решения на узле: вход — окно признаков + локальный профиль фона; выход — запись решения, не смысл. По M5 смысл не выносится. Имя контракта предлагаю `EventDecision`, не `Alarm` и не `Detection` — иначе смешаем с […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/duty-node-detection-m7-predikat-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · duty-node-detection-m8-pasport

> Т11 уже закрыл развилку носителя: фон и событие — одна сущность с признаком судьбы; паспорт формы и спутник происхождения — **один носитель, не два слоя**. Лемма имени: `RecordingPassport` — словарная статья, не «metadata + sidecar.md + node.md». Жить должен рядом с записью как […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/duty-node-detection-m8-pasport-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · duty-node-detection-m9-lifecycle

> Леммы, чтобы не разъехались слова. «Квота узла» — лимит локального кольцевого буфера duty-ленты, сторож — процесс на узле. «Квота сервера» — лимит принятого объёма на стороне приёма; сторож — сервер, ответ 413 без silently-delete. «Судьба» — признак из решения M7 […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/duty-node-detection-m9-lifecycle-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · journal-session-twenty-home

> Лемма M2: домом делает `IPluginHost`. Факт разведки 21.08 — модуля `journal` в office нет, хоста нет, сущности «запись журнала» нет. Манифест с `mountTarget: background-office/journal` будет отвергнут до рантайма ровно по M2. Монтировать в несуществующий дом — нарушить словарь, […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/journal-session-twenty-home-2026-08-21.md#reply-1`

### 2026-08-21 · позиция · team-evening-feedback

> C1/C4 по доступному следу: меры и executor сидят в handlers, монтаж report-wave — в media-доме. Зуб verify:image-workspace-deps после отказа выкатки — правильный носитель, не проза. Следить, чтобы `registerReportWave` не оказался мёртвым экспортом при следующих переносах (урок […]

— источник: `docs/seanses/team-evening-feedback-2026-08-21.md#reply-1`

### 2026-08-20 · позиция · team-evening-feedback

> **Оценка артефактов:** Стендап и MAIN_DAY_ISSUE хорошо синхронизированы; code-review корректно отметил, что пакетных изменений в развёрнутом diff нет. DAY_PLAN отражал реальные приоритеты. **Итоги дня:** Границы packages сегодня не задеты — вся работа в прикладном слое Studio и […]

— источник: `docs/seanses/team-evening-feedback-2026-08-20.md#reply-1`

### 2026-08-19 · позиция · team-evening-feedback

> ozhegov Оценка артефактов: DAILY_CODE_REVIEW проверяет бестиарий пошагово (B3/B4/B6/B8/B9) — это правильный формат; DAY_REPORT.md собрал 25 коммитов по областям с честной классификацией «переписывание — не ничего не делали». MAIN_DAY_ISSUE и DAILY_STANDUP расходятся, и это […]

— источник: `docs/seanses/team-evening-feedback-2026-08-19.md#reply-1`

### 2026-08-18 · позиция · team-evening-feedback

> Ozhegov. Оценка артефактов: DAILY_CODE_REVIEW корректно нашёл структурный риск — динамический `import('@membrana/plugin-contracts')` в `CollectionsPluginHostService.onModuleInit` через модульный синглтон `pluginContractsPromise`. Утренние документы не заметили этого — потолок […]

— источник: `docs/seanses/team-evening-feedback-2026-08-18.md#reply-1`

### 2026-08-17 · позиция · server-plugin-foundation-m0-order

> Согласен с коллегой по начальной точке. Формализую: вопрос 1 производит переменную «контракт плагина» — тип, форма манифеста, три рода. Вопрос 2 потребляет её: «что делает модуль домом» — это вопрос о том, что именно модуль обязан принять. Принять — значит знать тип того, что […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/server-plugin-foundation-m0-order-2026-08-17.md#reply-1`

### 2026-08-17 · позиция · server-plugin-foundation-m1-vocabulary

> Начну с лемм — иначе разъедемся в словах. Мы называем «словарём» не словник из README, а типовой манифест, который каждый плагин обязан экспортировать. Это TypeScript-интерфейс. Его дом не должен жить внутри `background-office` — потому что `background-media` тоже потребляет […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/server-plugin-foundation-m1-vocabulary-2026-08-17.md#reply-1`

### 2026-08-17 · позиция · server-plugin-foundation-m2-mount-homes

> Зафиксирую леммы. «Дом» в этом контексте — Nest-модуль в `packages/background-office` или `packages/background-media`, который объявляет публичный контракт приёма плагинов. Контракт дома — это не просто факт существования модуля; это набор экспортов: точка регистрации плагина, […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/server-plugin-foundation-m2-mount-homes-2026-08-17.md#reply-1`

### 2026-08-17 · позиция · server-plugin-foundation-m3-results-home

> Уточняю термины. `collectionId` — это идентификатор коллекции звуков из home `background-media/collections` (вердикт M2). Он внешний ключ, не вложенная структура. Запись результата живёт в доме результатов (Mongo офиса, отдельная коллекция), ссылается на коллекцию по id — не […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/server-plugin-foundation-m3-results-home-2026-08-17.md#reply-1`

### 2026-08-17 · позиция · server-plugin-foundation-m3r-address

> Фиксирую лемму. `RunAddress` — это адрес одного конкретного прогона в системе. По Т3.3 цепочка: `модуль → плагин → версия → коллекция → прогон`. Из этих звеньев `pluginId` даёт «плагин» (`org.kind.slug`), `version` — версию, `collectionId` — коллекцию, `runId` — прогон. Звено […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/server-plugin-foundation-m3r-address-2026-08-17.md#reply-1`

### 2026-08-17 · позиция · server-plugin-foundation-m4-triggers

> Уточняю терминологию, чтобы не расходились потом. «Канал» — это не поле манифеста, это контракт в `plugin-contracts`. Если `triggers` — закрытый словарь из `plugin-contracts`, то тип должен быть `PluginTrigger[]`, а не `string[]` — M1 оставил место именно для этого. Словарь […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/server-plugin-foundation-m4-triggers-2026-08-17.md#reply-1`

### 2026-08-17 · позиция · server-plugin-foundation-m5-showcase

> Уточняю лемму «полиморфно». `getRegisteredPlugins()` возвращает `ReadonlyArray<PluginManifest>`. Чтобы страница отличила `ShowcaseManifest` от базового, нужен дискриминант в типе — поле `kind`. Предлагаю: базовый `PluginManifest` несёт `kind: PluginKind`, где `PluginKind` — […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/server-plugin-foundation-m5-showcase-2026-08-17.md#reply-1`

### 2026-08-17 · позиция · server-plugin-foundation-m5r-showcase

> Начну с лемм, иначе расползёмся. «База» — PluginManifest с ровно пятью полями: id, version, kind, mountTarget, triggers. Это закрытый вопрос: посылка дана поимённо, не обсуждается. ShowcaseManifest — расширяющий тип. Значит единственный законный способ добавить поля — interface […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/server-plugin-foundation-m5r-showcase-2026-08-17.md#reply-1`

### 2026-08-17 · позиция · server-plugin-foundation-m6-first-wave

> Перед выбором первого плагина уточню лемму «первая волна». Волна — это множество плагинов, поставляемых одним PR-контуром к приёмке основы. Если мы говорим «все шесть сразу», это один контур с шестью точками сбоя. Если «mfcc первым, остальные пятью отдельными PR» — это не одна […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/server-plugin-foundation-m6-first-wave-2026-08-17.md#reply-1`

### 2026-08-17 · позиция · server-plugin-foundation-m6r-first-wave

> Лемма до спора: шесть детекторов — это пакеты `packages/services/*` рода `handler`, дом `background-media/collections`. Это закрыто Т3.5. `ShowcaseManifest` — отдельный вид, контракт M1/M5′ его предусмотрел, переоткрывать M1 не нужно (находка A6-6 правильная). Но включить […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/server-plugin-foundation-m6r-first-wave-2026-08-17.md#reply-1`

### 2026-08-17 · позиция · team-evening-feedback

> Ozhegov. Оценка артефактов: DAILY_STANDUP аккуратно называет параллельный приоритет — ревью PR #1951/#1953 до любых работ поверх калибровочного корпуса; MAIN_DAY_ISSUE называет то же самое в подкреплении. Согласованность между документами удовлетворительная, кроме несовпадения […]

— источник: `docs/seanses/team-evening-feedback-2026-08-17.md#reply-1`

### 2026-08-16 · позиция · team-evening-feedback

> Ожегов. Оценка артефактов: `DAILY_STANDUP` и `MAIN_DAY_ISSUE` называют одно и то же одним словом — «гейт `secret-parser-built`». Роутинг персон в стендапе построен из реестра, а не моделью — правильный источник. Итоги дня: append-only соблюдён везде — […]

— источник: `docs/seanses/team-evening-feedback-2026-08-16.md#reply-1`

### 2026-08-15 · позиция · team-evening-feedback

> Ожегов. Оценка артефактов: `DAILY_STANDUP` явно назвал магистраль, `MAIN_DAY_ISSUE` дал DoD в 7 пунктов — структура ясная; но по факту DoD не пройден ни в одном пункте (сканер не тронут, manifest не создан, гейт не помечен). Итоги дня: третий день подряд `ritual:day` оставляет […]

— источник: `docs/seanses/team-evening-feedback-2026-08-15.md#reply-1`

### 2026-08-14 · позиция · team-evening-feedback

> Ожегов. Оценка артефактов: DAILY_CODE_REVIEW точно назвал C1 (инъекция `fetchImpl`/`sleep`/`log` через параметры) и C4 (чистые функции `extractStep`/`ingestStep`/`runTract`) — оба соблюдены; MAIN_DAY_ISSUE верно перечислил DoD как проверяемые пункты, а не механику. Итоги дня: […]

— источник: `docs/seanses/team-evening-feedback-2026-08-14.md#reply-1`

### 2026-08-13 · позиция · network-container-m0-order

> Соглашусь с Весниным в главном, уточню в деталях. Вопрос 2 (enum состояний) зависит от 1, потому что enum описывает состояние записи — а что такое запись, отвечает 1. Но вопрос 2 сам является посылкой для вопросов 6 и 7: правило K1 и proxy-awareness оперируют состоянием […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/network-container-m0-order-2026-08-13.md#reply-1`

### 2026-08-13 · позиция · network-container-m1-home-record

> Начну с лемм, иначе разъедемся в словах. «Дом» — адрес плоскости артефактов контейнера, не runtime-сервис и не пакет в monorepo. «Единица звена» — одна append-запись контейнера, из которой строятся отчёты; не маршрут как объект политики и не правило firewall. Образец жанра в […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/network-container-m1-home-record-2026-08-13.md#reply-1`

### 2026-08-13 · позиция · network-container-m2-infra-border

> Уточню лемму «дубль». Дубль — это когда два дома несут поле об одном предмете с одним семантическим статусом. «Узел X имеет пропускную способность 1 Гбит» в `infra-policy` и то же поле в зонд-снимке — дубль. «Узел X наблюдался с трафиком 0.3 Гбит в момент T» в снимке — не дубль, […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/network-container-m2-infra-border-2026-08-13.md#reply-1`

### 2026-08-13 · позиция · network-container-m3-status-vocab

> Согласен с Дыниным по осям, уточняю по словарю. Если берём `net:diag` дословно, граница пакета чёткая: снимок ссылается на внешний словарь, и любое расширение `net:diag` автоматически меняет допустимые значения снимка — это скрытая связь. Если вводим свой словарь снимка, граница […] _(реплик в сеансе: 4)_

— источник: `docs/seanses/network-container-m3-status-vocab-2026-08-13.md#reply-1`

### 2026-08-13 · позиция · network-container-m4-owner-rhythm

> Предмет точнее: зонд-снимок живёт в `docs/audit/network` (M1), единица — снимок, глаголы `audit/decompose/inspect`. Это структурная операция над сервисным швом. Субъект проверки шва отложен из M2 именно в эту комнату. По природе предмета: владелец такта — тот, кто держит карту […] _(реплик в сеансе: 5)_

— источник: `docs/seanses/network-container-m4-owner-rhythm-2026-08-13.md#reply-1`

### 2026-08-13 · позиция · network-container-m5-storage

> Зафиксирую термины до начала спора. «Лента» — append-only jsonl, каждая строка — один снимок одного зонда в одну ночь, ключ `(probe_id, date)`. «Перезаписываемый снимок» — один файл или запись на зонд, каждую ночь затирается. «Двухслойно» — лента как источник истины плюс […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/network-container-m5-storage-2026-08-13.md#reply-1`

### 2026-08-13 · позиция · network-container-m6-k1-rules

> Лемма пути. M5 зафиксировал двухслойное хранение: лента + `registry/`, README — карта дома. Правило — не единица ленты → не `events.jsonl` и не снимок. Дом контейнера network — `docs/audit/network/`. Предлагаю носитель: `docs/audit/network/registry/egress-rules.json` (или […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/network-container-m6-k1-rules-2026-08-13.md#reply-1`

### 2026-08-13 · позиция · network-container-m7-machine-policy

> Уточню термины до кода. «Носитель» — это файл, у которого один владелец (M4 — Ожегов как кандидат-держатель), схема задокументирована, и он является единственным источником истины для зуба. Предлагаю: `packages/network-policy/policy.json` + экспортирующий `index.ts` — граница […] _(реплик в сеансе: 6)_

— источник: `docs/seanses/network-container-m7-machine-policy-2026-08-13.md#reply-1`

### 2026-08-13 · позиция · team-evening-feedback

> Ожегов. Оценка артефактов: DAILY_CODE_REVIEW честно отметил P2 в `makeIsIgnored` (непойманный throw при exit ≠ 0/1) и мультиверсионность schema@1+schema@2 в trail/2026-08-13.jsonl — оба наблюдения точные. MAIN_DAY_ISSUE корректно перечислил зависимости и риски по секрет-маске в […]

— источник: `docs/seanses/team-evening-feedback-2026-08-13.md#reply-1`

### 2026-08-12 · позиция · team-evening-feedback

> Ожегов Оценка артефактов: MAIN_DAY_ISSUE и стендап дали разные магистрали — это норма (гейт свежее), но `docs/tasks/README.md` был синхронизирован с реестром отдельным коммитом (`c7af8e74`) уже после закрытий соседа — типичный дрейф бухгалтерии, санитарная норма #1744 сработала […]

— источник: `docs/seanses/team-evening-feedback-2026-08-12.md#reply-1`

### 2026-08-10 · позиция · team-evening-feedback

> `tasks/registry.json` — шесть переходов состояний атомарны, `archiveNotes` содержательны (не B10-заглушки), README реестра синхронизирован. Оценка артефактов: `debt-ledger.jsonl` — append-only соблюдён, verb `repay`+`birth` корректны; регламенты и промпт вечернего фидбека […]

— источник: `docs/seanses/team-evening-feedback-2026-08-10.md#reply-1`

### 2026-08-08 · позиция · static-mmbrn-container-m7-migration-delivery

> Граница пакетов: source Affine (office VDS, `:3010`) не становится origin static. Destination — container `static.mmbrn.tech` + Panel authorizer + registry.jsonl. Strategic docs остаются Panel/Git; копировать их в static originals без M6 intent владельца — `нарушена слабая […] _(реплик в сеансе: 7)_

— источник: `docs/seanses/static-mmbrn-container-m7-migration-delivery-2026-08-08.md#reply-1`

### 2026-08-08 · позиция · team-evening-feedback

> Ожегов, слабая связанность и точность. Оценка артефактов: `DAILY_CODE_REVIEW` точно указал: `decideTransition` живёт только в собственном тесте — это класс «производитель есть, провод отсутствует», названо своим именем. Реестр за день корректно двинул 2 карточки в архив с […]

— источник: `docs/seanses/team-evening-feedback-2026-08-08.md#reply-1`

### 2026-08-07 · позиция · team-evening-feedback

> Ожегов. Оценка артефактов: `DAILY_CODE_REVIEW` называет конкретно: `splitDeliverable` / `planExecute` / `shipArgsFor` в `ritual-deliver-to-main.mjs`, константа `DELIVERABLE_STATUSES` — граница «доставке подлежит vs не лечится доставкой» зафиксирована; замечание про сырые строки […]

— источник: `docs/seanses/team-evening-feedback-2026-08-07.md#reply-1`

### 2026-08-06 · позиция · team-evening-feedback

> Три спринта закрылись в один день (`instruments-honest-verdict`, `review-honesty`, `scoreboard-spectral-ladder`) — это редкая плотность, и все три коснулись общей ткани: приборы, гейты, витрина. `worktrees:align` (#1740) добавил защитный контур: WIP-снимок грязных, merge вместо […]

— источник: `docs/seanses/team-evening-feedback-2026-08-06.md#reply-1`

### 2026-08-06 · позиция · static-mmbrn-container-m5-affine-role

> Закрытый словарь M3 сохраняется дословно: `discover`, `read-metadata`, `read-ref`, `read-bytes`, `download`, `write-metadata`, `upload-revision`, `manage-access`. Объекты только container, collection и lineage; annotation write не добавляется. _(реплик в сеансе: 6)_

— источник: `docs/seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md#reply-1`

### 2026-08-06 · позиция · static-mmbrn-container-m6-intake-delivery

> Operation surface является одной закрытой таблицей. Вне неё нет скрытых CLI-команд, server endpoints или операций из примечаний; у каждой строки ровно один M3 action и ровно один authority object. _(реплик в сеансе: 6)_

— источник: `docs/seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md#reply-1`

### 2026-08-05 · позиция · team-evening-feedback

> Три точки хранения факта архивации (registry.json → README → archive/*.md) обновлены атомарно одним коммитом #1732 — слабая связанность соблюдена, B2-риск файла-перекрёстка не сработал. Скрипты `execution-gate`, `llm-procedure-transport`, `llm-probe`, `prepush-typecheck-scope` […]

— источник: `docs/seanses/team-evening-feedback-2026-08-05.md#reply-1`

### 2026-08-04 · позиция · static-mmbrn-container-m3-access

> Stable principal — `userId` канонической записи пользователя Panel; credential только отображается в него. Для анонимного запроса используется sentinel `anon` с baseline ролью `public`. _(реплик в сеансе: 6)_

— источник: `docs/seanses/static-mmbrn-container-m3-access-2026-08-04.md#reply-1`

### 2026-08-04 · позиция · static-mmbrn-container-m4-storage

> Для storage records выбирается существующий M2 `location.kind=local`. Непустой `location.ref` имеет форму `static:{class}:{sha256_64hex}`; это адрес внутри storage backend, не URL и не `canonicalRef`. _(реплик в сеансе: 6)_

— источник: `docs/seanses/static-mmbrn-container-m4-storage-2026-08-04.md#reply-1`

### 2026-07-23 · позиция · llm-procedure-channels-m2b-control-plane

> Владелец хочет **переключать канал с панели** — кандидат 1 (только git/PR) делает админа = merge, это не тумблер. Кандидат 3 (только .env) делает панель read-only по маршруту — прямо бьёт BRIEF. Остаются 2 (office SoT) и 4 (гибрид). _(реплик в сеансе: 5)_

— источник: `docs/seanses/llm-procedure-channels-m2b-control-plane-2026-07-23-2026-07-23.md#reply-1`
