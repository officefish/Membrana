<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-29T11:18:01.616Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/tariff-grid-m8-integration-2026-07-29.md` |
| Порядок ролей | Верстальщик → Архитектор → Математик → Структурщик → Музыкант → Teamlead |
| Повестка | `docs/meeting/tariff-grid/M8_AGENDA.md` |

**Вопрос:**

План интеграции тарифной сетки: порядок врезки, DoD и зубы каждого шага, точка перехода на единственный источник истины

---

# Консилиум: M8 — план интеграции тарифной сетки

**Повестка:** Каков план врезки тарифной сетки в работающие контуры — сервер как источник истины, кабинет как место смены тарифа, клиент как витрина притемнения, борд как гейт загрузки — и что обязано быть готово ДО первого включения? Единственный вердикт M8 — упорядоченный план интеграции: шаги врезки с зависимостями, для каждого шага DoD и зуб из реестра M7; точка, начиная с которой сетка становится единственным источником истины; явный список того, что планом НЕ покрывается.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Верстальщик → Архитектор → Математик → Структурщик → Музыкант → Teamlead

---

[Верстальщик]: С витрины потребителя (кабинет, борд, клиент) план обязан читаться без легенды: что видит оператор до cutover, что — после, где soft-притемнение, где hard-блок. Не рисую layout дашборда набора — он вне контура. Требую в каждом шаге врезки честный UI-контракт: empty/loading/denied с `toothId` на отказ, не «серая кнопка без причины». Каталог сценариев сегодня фильтрует показ, но загрузку не режет — на витрине это дыра: бейдж `locked` есть, а load проходит. План должен закрыть эту ложь до cutover, иначе витрина врёт.

[Архитектор]: Конструкция ясна из M1–M7 и не пересматривается. Home сетки — сервер; клиент — wire DTO + pure `resolveEntitlement`; sole author — сетка; dual-write запрещён. Форма плана — направленный граф шагов врезки, не смета. Точка SoT: момент, когда writer проекции `entitledTariffSkus` один, server-side, и любой client-path читает только wire/резолв, не локальный снимок прав. До cutover легитимны legacy-поля `Tariff.*` как носители факта; после — они либо проекции из матрицы, либо удалены из write-path. Затронутые модули: office (tariff/membrane/transition), wire node-realtime, device-board load/clone gate, cabinet applyTransition UI, client resolveEntitlement. Рекомендация: план из слоёв foundation → projection → gates → transition → cutover; админ-набор и network-container — вне графа.

[Математик]: Формализую без UI. Пусть G — `TariffGridDocument` (M1). SKU s, entitlement id e → `EntitlementValue`. Проекция P_catalog(G, s) = entitledTariffSkus. Инвариант M2: `wire.entitledTariffSkus ≡ P_catalog(G, membrane.tariffSku)`. Cutover-предикат C: (1) ∀ write entitlement-path читает G, не legacy scalar как SoT; (2) writer проекции единственный; (3) `matrix_complete(G)` = true; (4) зубы M7 на reject_op/red_ci активны на CI и runtime. До C legacy `userStorageQuotaBytes` и сиды — факты носителя, не вердикт. Шаги S1..Sk частично упорядочены: Si → Sj ⇔ область определения Sj содержит артефакт, который задаёт Si. Не смешивать «готово в коде» и «включено в runtime».

[Структурщик]: Леммы, иначе синонимы-слои. **Grid-home** — серверный документ G + loader. **Wire DTO** — исходящий контракт прав без снимка в мембране. **Projection writer** — единственный server-side путь, пишущий `entitledTariffSkus` из G. **Gate locus** — точка reject_op (load/clone/start, reserve write, produce create). **Transition path** — `applyTransition` + `TariffChangeLog`. **Cutover** — переключение SoT, не «ещё один флаг в UI». Сегодня: `Tariff` несёт скаляры и `entitledTariffSkus` без G; эндпоинта смены нет; у узлов палитры прав нет; каталог-гейт не режет load. План обязан назвать homes каждого шага и запрет dual-write явно в DoD.

[Музыкант]: На слух это врезка новой шины прав в уже звучащий микс, не перезапись партитуры. Сначала master-tape (G на сервере) и meters (зубы), потом send на wire, потом гейты на load/clone как hard mute, витрина — soft pad (притемнение), cabinet — fader смены тарифа. Если cutover раньше зубов — клиппинг доверия: «отказало без toothId». Дыра «бейдж locked, load проходит» — это фантомный канал: индикатор есть, гейт молчит. Buffer/hot/cold quota — отдельные дорожки (M4), не схлопывать на слух в один лимит. Produce — capability на create, retain при потере (M5) — не вырезать take ножницами.

[Teamlead]: Положение: терминальная комната; M1–M7 — вход, обратный ранг запрещён. Планка матча — упорядоченный план с DoD и toothId на шаг, точка SoT, список вне плана. Связка: Архитектор — форма слоёв и cutover; Структурщик — homes/API; Математик — предикаты готовности и инварианты; Музыкант — hard/soft и слух на дыры гейтов; Верстальщик — честная витрина denied/soft. Не лезем в содержание набора, админ-дашборд набора, #1425 network. Вердикт комнаты — план; исполнение — отдельные task-ветки после LGTM плана. Дальше — нарезаем шаги, не спорим о M1–M7.

[Верстальщик]: Шаг витрины не должен идти раньше wire+resolve: иначе рисуем притемнение от локальной лжи. DoD UI-шага: для `not_entitled` — притемнение + текст причины; для `entitled ∧ unmetPreconditions ≠ []` — soft warning, не hide (M3); hard-пути (load) не маскировать disabled без `aria` и сообщения. Бейджи `bundled/community/entitled/locked` остаются носителями проекции каталога, но подпись отказа обязана нести machine reason / toothId в dev-доступном слое (data-attr или trace), чтобы E2E не ловил «просто серое». Админ-UI набора не рисуем. Cabinet: смена тарифа — одна форма applyTransition, статусы success/reject честные, без оптимистичного снимка прав в мембране.

[Архитектор]: Нарезаю слои (цена — зависимость, не дни). **S0 Prep:** сид и скаляры привести к решениям владельца (512 МБ «Датчик» vs 1 ГБ free-v1) как data-fix до сетки — иначе матрица узаконит регресс; зуб `report_finding` на расхождение имени и носителя. **S1 Grid foundation:** home G, registry+matrix, loader, `matrix_complete` → red_ci. **S2 resolve + wire:** pure resolveEntitlement; DTO; stub readiness `stub_unwired`. **S3 Projection writer:** sole author `entitledTariffSkus`; dual-write запрет тест. **S4 Quota write-path:** reserve/commit/release + class; cold cell. **S5 Produce gates** на create/expanding-mutate. **S6 Board hard gates** load/clone/start. **S7 Soft vitrine** client. **S8 Transition** applyTransition+log+promo skeleton. **S9 Cutover SoT.** S7 после S2; S6 после S2/S3; S9 после S1–S8 зубов. Вне: admin set editor, network route, detector rights content.

[Математик]: Предикат готовности шага Si: `ready(Si) ⇔ DoD(Si) ∧ tooth_green(Si)`. Частичный порядок: S1→S2→S3; S1→S4; S2→S5; S2∧S3→S6; S2→S7; S1∧S3→S8; (S1..S8)→S9. S0∥S1 допустим (data vs schema), но S9 требует согласованности сида с G. Инвариант dual-write: не существует trace, где client или второй server writer мутирует `entitledTariffSkus` в обход P_catalog. Предикат cutover C = ∧_{t∈T_M7} armed(t) ∧ sole_writer ∧ ¬membrane_rights_snapshot ∧ matrix_complete. Зуб `client≠SoT`: любой клиентский hard-allow при server deny — fail test. Зуб `projection_sync`: property test wire ≡ P_catalog. Число шагов фиксирую как каркас; дробление PR — на Тарасова, не на форму.

[Структурщик]: Homes по шагам. S1: `background-office` domain tariff-grid (document types + load/validate), export только через public module API; пакет не протекает в client src. S2: pure fn в разделяемом контрактном месте — либо office-shared DTO+resolver в границах, допустимых ARCHITECTURE (client consumable types без Nest), либо `@membrana/core` / тонкий contracts-пакет; **не** тащить Nest в client. S3: writer в composition root office при сборке wire (`node-realtime-wire` path) — один модуль-лемма `projectEntitledTariffSkus`. S4: write-path storage API обязан параметр memory class. S6: gate в device-board server-first load/clone, не в UI. S8: `applyTransition` service + `TariffChangeLog` append-only store. Нарушение: UI → напрямую legacy Tariff scalars как SoT после S9 = `нарушена слабая связанность` + зуб client≠SoT.

[Музыкант]: S6 на слух критичен: сейчас гейт каталога = EQ на мониторах, а main out (load) открыт. Hard fail-closed на load/clone/start — это mute на master bus до send. Старший узел на load (зуб M7) — не забыть в DoD S6: не только SKU каталога, но и instrument/gated preconditions. S4: три квоты как три VU — hot, cold, buffer; silent degrade = запрещённый компрессор. S5 produce: retain = tape не стираем при потере права; только record-arm (create) red. S7 soft: pad, не gate. Промокод в S8 — one-shot switch up, atomic; без UI маркетинга, только path. Если S9 раньше S6 — пользователь услышит «тариф есть», а дыра load останется: матч проигран.

[Teamlead]: Средний круг — сверяем полноту шагов против M7 зубов, без расползания. Каждый зуб M7 обязан сесть на locus шага: `matrix_complete`→S1; `projection_sync`→S3; `entitlement_denied`→S5/S6/S2 consumers; `quota_exceeded`+класс памяти→S4; produce на create→S5; старший узел load/clone→S6; unknown id→S1/S2; client≠SoT→S9+CI; запрет снимка прав→S8/S9; единый path смены→S8; existence-API и silent-evict→S4/S5 запреты в DoD. Нет шага «детекторы» — прав на палитру узлов нет; это выразимо сеткой, но отдельная работа (вне плана). Нет шага network #1425. S0 — обязателен: иначе SoT узаконит 1 ГБ vs 512 МБ. Принимаю каркас S0..S9; дальше зубы и DoD по каждому.

[Верстальщик]: Для S7 DoD витрины фиксирую потребительский контракт: resolve → view-model {state: entitled|not_entitled|entitled_unmet, payload, warnings[]}; not_entitled — opacity/contrast притемнение + warning, фокус и screen reader объявляют «недоступно: причина»; entitled_unmet — полный вид + banner precondition (stub_unwired честно текстом «сеть не готовá», не «ошибка тарифа»). Запрет: hide узлов каталога как единственный сигнал (M3 soft). Cabinet S8: до перехода показать target SKU и направление; reject — alert с toothId-кодом для поддержки; success — перезагрузка wire, не патч локального snapshot. Честная пустота промокода: поля нет = not in product surface этого плана (если skeleton API — UI optional hidden).

[Архитектор]: Уточняю S2 границы пакетов. Клиентский pure `resolveEntitlement(gridSlice|wire, id) → Decision` не ходит в сеть. Wire несёт: tariffSku, projection fields (в т.ч. entitledTariffSkus), квоты limits (не occupied — occupied отдельным status channel), matrix slice или precomputed decisions — **выбор формы wire**: минимальная цена cutover — server считает decisions для известных id + limits; полный G на клиента не обязателен в v1, если sole author на сервере и client не становится SoT. Но pure resolve нужен client-side для soft UI на полученных values. Запрет: client сам пишет entitledTariffSkus. S9: feature flag `tariffGridSoT=true` только после green зубов; rollback = flag off + legacy read path, но **не** dual-write в on-состоянии. ADR не нужен, если план+ M1 держат форму; при появлении второго writer — BLOCK.

[Математик]: DoD-предикаты (счётные). S1: `∀ sku ∈ SKU ∀ e ∈ Registry ∃ cell` ∧ parse(G) ok ∧ unknown_id(e) ⇒ reject. S3: ∀ membrane m: wire(m).entitledTariffSkus = P_catalog(G, sku(m)). S4: ∀ write w: class(w)∈{hot,cold,buffer} ∧ (occupied+req ≤ limit ∨ reject quota_exceeded); ¬auto_evict. S5: create/expand ⇒ produce.enabled ∨ reject; exists(resource) не вызывает tariff check. S6: load/clone/start ⇒ all hard entitlements pass ∨ reject_op; catalog show filter ⊄ allow load. S8: Δ membrane = {tariffId} only; |writers transition| = 1; promo: check→apply→spend→log atomic. S9: ¬∃ path: legacy_scalar overrides G; ¬rights_snapshot in membrane. Зуб silent: effect ∈ {reject_op, red_ci, report_finding} ∧ toothId ≠ ∅.

[Структурщик]: Словарь wire v1 (леммы): `TariffWireView` = { tariffSku, entitledTariffSkus, entitlements: Record<id, EntitlementValue>, quotas: {hot, cold, buffer: {limit, unit}}, preconditions: StatusMap }. Occupied — не в этом DTO, а `QuotaOccupancyView` с read API. Мембрана: только `tariffId`/`tariffSku` ref, без матрицы. S3 writer читает G+sku → заполняет entitledTariffSkus и entitlements slice. Legacy fields на `Tariff` entity до S9: read adapters map → cells; write legacy API — deprecated, red_ci если вызван после flag. Интеграционные тесты homes: office wire builder; device-board gate module; client hook `useEntitlement(id)` → resolve only. Палитра узлов без entitlement id — out of scope; не плодить fake ids «на будущее» в registry без продукта.

[Музыкант]: S4 cold: «холодной квоты нет» — факт сегодня; шаг обязан ввести cell и limit в G/legacy map, иначе M4 нарушен на врезке. Buffer — третья дорожка, не alias hot. На write-path reserve слышен: отказ quota_exceeded с toothId, read/delete играют дальше. S6: clone = copy create path — produce+catalog hard; не забыть. S0 сид 512 МБ — это подстройка fader до записи мастер-тейпа G, report_finding если оставить 1 ГБ. Детекторы и instrument rights на палитре — «выразимо», но без id в registry нечего гейтить: не включать пустой gated в cutover. stub_unwired на precondition — честный click-track до #1425, не притворяться minimal_network_ready.

[Teamlead]: Фиксирую ответственность связок (не смета): S0 data — Структурщик+Математик (сид/инвариант числа); S1 — Архитектор форма, Структурщик home, Математик matrix_complete; S2 — Математик pure+предикаты, Структурщик packaging, Верстальщик потребляет; S3 — Структурщик writer locus, Математик property test; S4 — Структурщик API write-path, Математик; S5/S6 — Структурщик+Музыкант hard loci; S7 — Верстальщик; S8 — Структурщик transition, Верстальщик cabinet minimal; S9 — Teamlead приёмка cutover по зубному отчёту. BLOCK если PR смешивает S9 с содержанием набора или admin dashboard. Дальше — явное «что не покрываем» и точка SoT одной фразой.

[Верстальщик]: Точка SoT с витрины: до S9 бейджи и лимиты могут идти из legacy wire map; после S9 любой экран, показывающий право, обязан опираться на EntitlementDecision из wire/resolve, а подпись «квота» — на limits из G-проекции; occupied — с occupancy API. Если после S9 останется экран, читающий hardcoded 1 ГБ — это фальшь, баг витрины, red. S7 не включает админ-матрицу. Минимальный cabinet S8: admin select target + confirm; redeem promo code field — только если S8 API promo готов, иначе честный absence, не disabled decoy.

[Архитектор]: Точка перехода (норма плана): **Cutover T** = merge+deploy, где (a) runtime flag/SoT mode = grid, (b) projection writer only from G, (c) transition только applyTransition, (d) hard gates S6 on, (e) CI teeth green. До T: разрешён read legacy Tariffs as adaptive source for wire builder **через один anti-corruption adapter**, который уже реализует тот же shape, что G-проекция — чтобы S7/S6 отлаживались без двойной семантики. После T: adapter читает только G; legacy columns read-only или drop later (drop — не блок T). Запрет обратного ранга: T не открывает пересмотр M2 dual-write. Цена раннего T без S6 — продуктовая дыра load; потому T строго после S6.

[Математик]: Anti-corruption adapter A: Tariffs_legacy → TariffWireView. До T: wire = A(legacy) при ¬grid_mode; wire = P(G) при grid_mode. Инвариант подготовки: schema(A(legacy)) = schema(P(G)). Тест золотых фикстур: один и тот же WireView type. После T: grid_mode⇒¬A_legacy_write. S0: limit(free/sensor)=512MiB в legacy и в будущей cell quota — число совпадает, иначе report_finding. Полнота registry: |cells| = |SKU|·|E|. Не вводим probabilistic gates. existence API: предикат forbid = ¬∃ endpoint that lists resources filtered by produce.entitled as existence check.

[Структурщик]: Явный out-of-plan список (леммы «не в M8»): (1) содержание матрицы — какие id в каких SKU; (2) admin dashboard editor набора; (3) office outgoing network container / minimal_network_ready real port (#1425) — только stub; (4) права палитры узлов/детекторов (нет id, нет UI контракта); (5) серия 11 продуктовых работ шторма — кроме тех, что = S0..S9; (6) миграции пользователей (пользователей нет); (7) auto-evict политики; (8) TDOA/multi-node; (9) billing provider / платежи; (10) dual-app. План называет порядок **носителя и врезки**, не продуктовый backlog прав. Если task лезет в (1)–(2) под видом S1 — возврат: scope creep.

[Музыкант]: Ещё вне плана на слух: тонкая настройка latency/DSP от тарифа; edge/MCU квоты; «красивые» upsell-экраны. В плане — честный deny и soft pad. S6 DoD добавить: E2E «locked scenario не грузится и не клонируется» — слово владельца; сейчас дыра. S3 DoD: смена tariffId (даже ручной в DB до S8) → wire projection обновляется без client cache as SoT. Cache client — TTL/invalidate после transition, но revalidate с сервера, не snaphot прав. Иначе на слух «старый тариф играет».

[Teamlead]: Сводка шагов для стола — короткий digест, потом приёмка. S0 сид/512; S1 G+matrix_complete; S2 resolve+wire type+stub; S3 sole projection writer; S4 quotas write-path+cold; S5 produce gates+retain; S6 board hard load/clone/start; S7 soft vitrine; S8 applyTransition+log+(promo atomic); S9 cutover SoT. Зубы расписаны. Вне плана — список Структурщика. Пользователей нет — без миграций. Оценок в днях нет. Требую от комнаты явные «Принимаю» по плану и DoD-таблицу без колонизации M1–M7 переоткрытием. Красные линии: dual-write, snapshot прав, silent, existence-API, load без гейта, T до S6.

[Верстальщик]: Принимаю план S0–S9 с UI-DoD на S7/S8 и запретом фальшивых бейджей. Витрина не SoT. После T — только decision из wire/resolve. Пустота admin-набора и промо-UI без API — честная.

[Архитектор]: Принимаю. Форма: adapter до T, sole G после T; homes server; client pure resolve; T после S6 и зубов. Содержание набора и #1425 вне контура. Обратный ранг M1–M7 не допущен.

[Математик]: Принимаю. Предикаты ready/C/cutover и инварианты projection_sync, matrix_complete, quota class, forbid existence/silent — в DoD шагов. Счётные зубы, без UI.

[Структурщик]: Принимаю. Леммы homes/writer/gate/transition/out-of-plan зафиксированы. Dual-write и snaphot — нарушения словаря, не «технический долг».

[Музыкант]: Принимаю. Hard bus на S6 до cutover; soft pad S7; retain produce; три квоты; stub_unwired честный. Дыра load/clone закрывается в S6, не «потом».

[Teamlead]: LGTM плана. Матч M8 — вердикт-план, не код. Исполнение — task-ветки по S0–S9 со связками выше; cutover T — отдельная приёмка по зубному отчёту. BLOCK на любой PR, что делает client SoT, dual-write, или тащит admin-набор/#1425 в этот план. Протокол ниже — закон комнаты.

---

## Список посылок

| # | Посылка | Тип |
|---|---------|-----|
| P1 | Вердикт M1: `TariffGridDocument` = registry + матрица SKU×id → EntitlementValue; home — сервер; client — wire + pure resolve; deny-by-default; полнота ∀SKU ∀id | норма |
| P2 | Вердикт M2: сетка — sole author; `entitledTariffSkus` — проекция catalog-среза; dual-write запрещён; writer проекции один, server-side | норма |
| P3 | Вердикт M3: третьего enum нет; `gated`+preconditionId; stub_unwired до readiness port; витрина soft, борд/сервер hard fail-closed | норма |
| P4 | Вердикт M4: hot/cold/buffer — раздельные quota cells; limit в матрице, occupied на сервере; reserve→commit\|release; hard deny; auto-evict и silent degrade запрещены | норма |
| P5 | Вердикт M5: produce на create/expanding-mutate; retain при потере права; existence-check против тарифа запрещён | норма |
| P6 | Вердикт M6: меняется только Membrane.tariffId; snaphot прав в мембране запрещён; applyTransition + TariffChangeLog; admin любое направление, promo только вверх; promo atomic | норма |
| P7 | Вердикт M7: закрытый реестр зубов (matrix_complete, projection_sync, entitlement_denied, quota_exceeded, class на write, produce на create, старший узел load/clone, unknown id, client≠SoT, запрет снимка, единый path смены, forbid existence-API и silent-evict); effects reject_op/red_ci/report_finding + toothId; silent запрещён | норма |
| P8 | Слово владельца 29.07: предмет — каркас тарифа; содержание набора и админ-дашборд набора — вне контура; #1425 network — вне плана; пользователи отсутствуют → без миграций | норма |
| P9 | Обратный ранг запрещён: M8 не переопределяет M1–M7 | норма |
| P10 | Сервер сегодня: Tariff несёт userStorageQuotaBytes (сид 1 ГБ), bufferQuotaBytes, datasetCatalogId, entitledTariffSkus, maxNodesPerMembrane=1, maxUserWorkspaces=3; холодной квоты нет; Membrane.tariffId есть; эндпоинта смены тарифа нет; промокодов нет; AdminGuard есть | факт |
| P11 | Провод прав сценариев замкнут: node-realtime → wire → device-board-module-config → ClientUserCaseCatalogService → бейджи bundled/community/entitled/locked | факт |
| P12 | У узлов палитры entitlement-прав нет (`{pluginId,label,inputs,outputs}`) | факт |
| P13 | Гейт каталога фильтрует показ, но load сценария в борд не режет (дыра vs «не загружаются и не клонируются») | факт |
| P14 | Расхождение: сид free-v1 = 1 ГБ vs решение владельца 512 МБ для «Датчик»/free — намеренный регресс носителя до приведения | факт |
| P15 | ARCHITECTURE/SERVICES: границы office/client/packages; client не пишет Web Auth SoT; публичные API через index; device-board server-first канон для гейтов поля | норма |

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Единый план врезки | **Да:** упорядоченные шаги **S0→S9** (частичный порядок ниже), без оценок в человеко-днях |
| Точка SoT (cutover **T**) | **T** = grid mode on в runtime **после** ready(S0..S8) ∧ teeth green: sole writer P(G), hard gates S6 on, transition только applyTransition, client≠SoT, ¬membrane rights snapshot. До T — один anti-corruption adapter A(legacy)→TariffWireView того же schema, что P(G); dual-write в on-режиме запрещён |
| Что до T живёт как есть | Legacy скаляры Tariff + текущий catalog badge path, **но** новые hard/soft потребители уже читают TariffWireView; write transition API может отсутствовать до S8 |
| Содержание набора / admin editor / #1425 / палитра узлов / 11 работ шторма / миграции / billing | **Вне плана M8** (явный список) |

### Граф шагов (порядок врезки)

```text
S0 Prep limits (сид 512 MiB / согласование чисел)
S1 Grid foundation (G, registry, matrix, matrix_complete)
    ├→ S2 Resolve + Wire DTO + stub_unwired
    │     ├→ S5 Produce gates (create/expand)
    │     ├→ S7 Soft vitrine (client)
    │     └→ S6 Board hard gates (load/clone/start)  [также ждёт S3]
    ├→ S3 Projection sole writer (entitledTariffSkus ≡ P_catalog)
    │     └→ S6, S8
    ├→ S4 Quota write-path (hot/cold/buffer, reserve/commit/release)
    └→ S8 applyTransition + TariffChangeLog (+ promo atomic skeleton)
S0..S8 → S9 Cutover T (SoT = grid only)
```

### DoD и зубы по шагам

| Шаг | Содержание | DoD (кратко) | Зубы M7 (locus) |
|-----|------------|--------------|-----------------|
| **S0** | Привести сид/лимиты к решению владельца (512 MiB и согласованные скаляры); зафиксировать числа для будущих cells | Сид free/«Датчик» = согласованный limit; тест/отчёт на расхождение имени и носителя | `report_finding` (расхождение декларации и носителя) |
| **S1** | Home G на сервере: EntitlementRegistry + матрица; load/validate; unknown id | `matrix_complete`; parse fail → red_ci; public API office без протечки Nest в client | `matrix_complete`, `unknown id` |
| **S2** | Pure `resolveEntitlement`; TariffWireView; precondition stub → `stub_unwired`; deny-by-default | Decision = entitled\|not_entitled + payload + unmetPreconditions[]; контрактные unit-тесты без UI | `entitlement_denied` (unit locus), `unknown id` |
| **S3** | Единственный server writer проекции `entitledTariffSkus` (+ entitlements slice) из G | `wire.entitledTariffSkus ≡ P_catalog(G,sku)`; нет второго write-path; property/integration test | `projection_sync`; запрет dual-write |
| **S4** | Три quota cells; write-path объявляет class; reserve→commit\|release; cold введён; occupied server-side | Исчерпание → reject_op; read/delete живы; ¬auto-evict ¬silent degrade; class обязателен на write | `quota_exceeded`, class-на-write, forbid silent-evict |
| **S5** | produce на create/expanding-mutate; retain при потере | Create без produce → reject_op; существующее читается/удаляется; нет existence-API по тарифу | produce-на-create, forbid existence-API, `entitlement_denied` |
| **S6** | Hard gate load/clone/start на борде/сервере; старший узел; каталог show ≠ allow load | E2E/integration: locked не грузится и не клонируется; fail-closed + toothId | старший узел load/clone, `entitlement_denied`, hard fail-closed |
| **S7** | Client soft vitrine: притемнение + warning; entitled+unmet — soft banner | Нет hide-only; a11y reason; VM из resolve/wire, не SoT | client потребляет resolve; готовит `client≠SoT` |
| **S8** | `applyTransition(membraneId,target,proof)` + append-only TariffChangeLog; admin; promo atomic check→apply→spend→log (skeleton) | Меняется только tariffId; ¬snapshot прав; один path смены; reject с toothId | единый path смены, запрет снимка прав |
| **S9** | Cutover T: SoT=G; adapter legacy write off; CI teeth full | ∧ teeth armed; sole writer; hard gates on; client hard-allow ∧ server deny = fail; rollback = flag off без dual-write on | `client≠SoT`, все релевантные зубы runtime+CI |

### Anti-corruption до T

- Один adapter `A(legacy Tariff) → TariffWireView` с **тем же schema**, что `P(G)`.
- Включение grid_mode не добавляет второго writer.
- После T read path только G (legacy columns readonly/drop later — не блок T).

### Вне плана (M8 не покрывает)

1. Содержание набора прав (какие entitlement в каких SKU).  
2. Админский дашборд редактора матрицы/набора.  
3. Реальный readiness port / outgoing network office (#1425) — только `stub_unwired`.  
4. Entitlements палитры узлов и детекторов (нет носителя id в продукте).  
5. Остальные работы «серии 11», не сводимые к S0–S9.  
6. Миграции существующих пользователей.  
7. Billing/платежи, auto-evict политики, multi-node/TDOA, upsell-маркетинг UI.  

### Связки исполнения (после LGTM плана)

| Шаги | Связка |
|------|--------|
| S0–S1, S3, S8 | Структурщик + Архитектор (форма) + Математик (предикаты/зубы) |
| S2, S4, S5 | Математик + Структурщик |
| S6 | Структурщик + Музыкант (+ Математик тесты) |
| S7, cabinet S8 UI | Верстальщик после wire S2/S8 API |
| S9 | Teamlead приёмка по зубному отчёту |

---

## Definition of Done (M8 — комната плана)

- [ ] Протокол несёт **Список посылок**, граф S0–S9, DoD+зубы на шаг, точку **T**, список вне плана.  
- [ ] Ни один шаг не переопределяет M1–M7 (обратный ранг = fail).  
- [ ] Cutover T определён предикатом, а не «когда удобно».  
- [ ] Дыра load/clone названа и закрыта шагом **S6** до T.  
- [ ] Dual-write, snapshot прав, silent, existence-API — явные запреты в DoD.  
- [ ] Содержание набора, admin editor, #1425 — явно out-of-scope.  
- [ ] Все шесть ролей приняли план (см. финальный круг).  

**Вердикт Teamlead:** **LGTM** плана интеграции M8. Код не начинается подменой cutover; исполнение — отдельные задачи по S0–S9.

---

*Реплик в диалоге: 30; каждый участник высказался не менее одного раза.*
