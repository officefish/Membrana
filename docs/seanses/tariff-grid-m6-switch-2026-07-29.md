<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-29T11:10:11.281Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/tariff-grid-m6-switch-2026-07-29.md` |
| Порядок ролей | Teamlead → Верстальщик → Структурщик → Архитектор → Музыкант → Математик |
| Повестка | `docs/meeting/tariff-grid/M6_AGENDA.md` |

**Вопрос:**

Смена тарифа и промокод: модель перехода, носитель, проход понижения по родам права

---

# Консилиум: M6 — смена тарифа и промокод

**Повестка:** Где в контуре сетки живёт смена тарифа и её носитель-промокод; модель перехода; кто меняет и чем подтверждается; объект «промокод»; правило прохода понижения по родам права (quota · catalog · instrument · gated · produce) без разрушения данных.

**Участники:** Teamlead (Tarasov), Верстальщик (Rodchenko), Структурщик (Ozhegov), Архитектор (Vesnin), Музыкант (Kuryokhin), Математик (Dynin).

**Порядок реплик:** Teamlead → Верстальщик → Структурщик → Архитектор → Музыкант → Математик

---

[Teamlead]: Положение: M1–M5 закрыты; в main есть `Membrane.tariffId` → `Tariff`, сид `free-v1`, `UserRole.admin` + `AdminGuard`, **нет** эндпоинта смены и **нет** промокода. Капитан: повышение через кабинет на сервере **или** промокод от админа. Матч комнаты — модель перехода, носитель промокода, проход понижения по пяти родам. Зубы и план врезки — чужие комнаты (M7/M8). Связка: Архитектор — форма; Структурщик — леммы и homes; Математик — предикаты apply/redeem; Верстальщик — честные статусы без экрана админа; Музыкант — retain на слух, без mute созданного.

[Верстальщик]: С витрины кабинета оператор видит текущий SKU и исход смены: `applied | rejected | promo_invalid | promo_spent`. Фальшивый «тариф сменился», пока сервер не подтвердил — декор. Экран админа выпуска промокодов **вне контура** (слово владельца): здесь только контракт меток, которые кабинет потом покажет. Понижение не должно выглядеть как «данные стёрты»: retain M5 читается как «созданное остаётся», не как empty state.

[Структурщик]: Леммы, иначе синонимы. **TariffTransition** — атомарный акт смены `membrane.tariffId` (ссылка на SKU), не снимок матрицы прав в мембране. **PromoCode** — отдельная сущность-носитель права *инициировать* переход на целевой SKU при погашении. **Issuer** — admin (роль, не entitlement). **Redemption** — одноразовое (v1) связывание кода с мембраной/актом. **Apply path** — server-only; dual-write матрицы запрещён M2: меняется ссылка, `resolveEntitlement` читает новую строку SKU. Home промокода — серверный модуль рядом с тарифом, не клиентский стор.

[Архитектор]: Конструкция: истина тарифа мембраны — **одна ссылка** `tariffId` на SKU сетки. Смена = запись нового `tariffId` + журнал акта (кто, чем, from→to, at). Не кэшируем entitlement-снимок в мембране: иначе сетка перестаёт быть sole author (M2). Два входа в один apply: (1) admin/cabinet command при `role=admin` **или** владелец мембраны в рамках разрешённого self-service upgrade; (2) redeem промокода → тот же apply. Промокод не «временные права», а **билет на переход** к целевому SKU (или к дельте SKU, если так зададим — рекомендую явный `targetTariffId`). Цена альтернативы «снимок прав»: расхождение с матрицей при правке сетки — отвергаю.

[Музыкант]: На слух смена тарифа — это смена пресета на пульте, не перезапись дорожек. M5 retain: produce потерян — клипы/сценарии не mute. Понижение quota (M4) — hard deny на *новый* occupy, read/delete живут; auto-evict запрещён — не вырезаем take с ленты, потому что limit стал меньше. Промокод — count-in на upgrade, не отдельный эффект «в обход сетки»: после redeem микс идёт через ту же матрицу SKU.

[Математик]: Формализую без UI. Состояние мембраны: `m.tariffId ∈ SKU`. Акт: `apply(m, t', actor, proof) → ok|err`, где `t'` — целевой SKU, `proof ∈ {AdminCommand, PromoRedemption, SelfServiceUpgrade?}`. Инвариант M2: ∀ entitlementId `resolve(m, id) = matrix[m.tariffId][id]` — нет локального override-слоя. Промокод p: `p = (code, targetTariffId, status, meta)`; `redeem(p, m)` допустим ⇔ `status=active ∧ not expired ∧ redemptions < max` (v1: max=1). После redeem: `status' = spent`, затем `apply(m, p.targetTariffId, …)`. Понижение: `rank(t') < rank(t)` не триггерит delete сущностей — только предикаты доступа на *последующих* операциях.

[Teamlead]: Фиксирую развилку self-service: капитан сказал «через кабинет на сервере» и «промокод». Не раздуваем третий канал «любой user сам кликает downgrade» без слова владельца. v1 каналы apply: **admin command** и **promo redeem**. Downgrade model — да (проход по родам), исполнитель понижения в v1 — admin (или будущий billing-agent вне контура), не анонимный self-serve. Возражения — сразу.

[Верстальщик]: Согласен: в кабинете user видит «текущий тариф» и поле/поток «ввести промокод»; кнопка «сменить на …» для user без proof — либо отсутствует, либо disabled с честной причиной `needs_admin_or_promo`. Админский кабинет — вне экрана этой комнаты, но API-статусы те же. Пустота промокодов: `promo: n/a` не показывать как ошибку тарифа.

[Структурщик]: Уточняю словарь proof. **AdminCommand** — `actor.role === admin` (ось AdminGuard, M1: не смешивать с entitlement). **PromoRedemption** — успешный redeem кода, привязанный к membraneId. Не вводим `Entitlement "canChangeTariff"` в матрицу v1 — иначе промокод и admin дублируют третью ось. Журнал: `TariffChangeLog` append-only (membraneId, from, to, proofType, proofRef, at, actorId).

[Архитектор]: Граница модуля: `TariffApplicationService.applyTransition` — единственная точка записи `tariffId`. Promo — `PromoCode` aggregate + `redeem` в том же server bounded context, что тариф; клиент только команда. Не класть target SKU в JWT/localStorage. Рекомендация формы: SKU reference only; log as provenance; promo as capability-token on transition, not as parallel entitlement matrix.

[Музыкант]: Повторный apply того же кода — must reject на слух: иначе «бесплатный sustain» из одного take. v1 one-shot. Если админ перевыпустит — новый code, новый id, не mute status старого spent. Понижение не должно «глушить» instrument, уже вшитый в сценарий: как M5 — retain, UI может честно сказать «не в тарифе, но в проекте есть».

[Математик]: Предикат направления: введём частичный порядок `upgrade(t→t') ⇔ rank(t') > rank(t)` (ranks — норма сетки, не факт кода; пока три тарифа — ординал 0..2). Промокод v1: **только upgrade или lateral на targetTariffId**, не «любой to». Понижение: `proof = AdminCommand` only в v1 (промокод не несёт downgrade, если target ниже current — err `promo_target_not_upgrade`). Это закрывает злоупотребление промо на сброс.

[Teamlead]: Принимаю: промо = билет на target SKU при условии target «не ниже» current (или строго upgrade — Математик, зафиксируй один). Admin может any direction. Дальше — проход понижения по родам. Квота первая: M4 уже сказал hard deny create, read/delete live, no auto-evict. Нужна явная строка на каждый род.

[Верстальщик]: На витрине после downgrade: quota occupied > limit — не «ошибка загрузки списка», а честный badge `over_quota` + запрет create; элементы списка читаемы. Catalog: сценарии/пункты, выпавшие из catalog-среза — видны как retain/read-only или hidden-by-projection? M2: рельс — проекция catalog; прошу у Архитектора/Структурщика: hide from *palette* ≠ delete instance.

[Структурщик]: **Catalog при понижении:** матрица режет *доступные к добавлению* id (palette/projection). Уже существующие привязки сценария → сущность **не** валидируются «против тарифа» (M5 запрет). Лемма: `palette(m) = catalogSlice(matrix[m.tariffId])`; `instance.retain` независимо. **Instrument:** право «пользоваться инструментом» на *новом* вызове = resolve; уже вшитые в сценарий шаги — retain execute-in-context или soft-block? M5 про produce; для instrument нужна норма: retain configuration, deny *new* arming если gated/instrument false.

[Архитектор]: Единое правило **loss policy** по родам при `t → t'` вниз (после смены ссылки, на *последующих* resolve):

| Род | После понижения |
|-----|-----------------|
| quota | limit из новой строки; occupied не трогаем; create/occupy если occupied≥limit → hard deny; read/update-meta/delete ok; auto-evict запрет |
| catalog | palette = новый срез; instances и ссылки в сценариях retain; add-from-palette вне среза deny |
| instrument | resolve false → deny *новый* launch/arm; сохранённые конфигурации и вхождения в сценарии retain (не purge) |
| gated | entitled может стать false **или** entitled∧unmet; precondition ids не удаляем; UI — M3 |
| produce | M5: capability на create/expanding-mutate; loss → retain созданного, no existence-check vs tariff |

Снимок прав в мембране не пишем — только tariffId.

[Музыкант]: Gated на слух: понижение не «сбрасывает» выполненные preconditions пользователя (если они в профиле/мембране как факты). Сетка может потребовать *другие* preconditionId — unmet честно растёт. Не путать loss entitlement с wipe progress. Instrument в цепочке сценария — как insert-эффект: трек остаётся, новый send в обход тарифа — нет.

[Математик]: Формализую loss без UI. После `apply` с `rank(t')<rank(t)`: состояние доменных сущностей S **не** проходит `filter(e → allowedBy(t', e))` purge. Операции: для op∈Ops, `allow(op, m, e) = postcondition(resolve(m.tariffId), op, e)` где resolve чистый из M1. Over-quota: `occupied(m, cell) > limit(t', cell)` — допустимый invariant state; только `op=allocate` запрещён. Promo: `redeem` atomic: lock row → check → spend → apply → log; идемпотентность по `(code, membraneId)` — второй вызов err `already_redeemed`.

[Teamlead]: Промокод — поля объекта v1, коротко: code (secret), targetTariffId, maxRedemptions=1, redeemedCount, expiresAt?, createdByAdminId, status active|spent|revoked. Revoke — admin, до redeem. Не путать revoke spent. Кто гасит — end-user (владелец мембраны) в кабинете, не обязательно admin. Издание — только admin. Согласны?

[Верстальщик]: Да. В UI redeem: одна форма, статусы `invalid | expired | spent | applied(to=SKU)`. Не показываем target чужого кода до успешной проверки — иначе перебор SKU. После applied — тот же refresh entitlements, что после admin change; без второго «мира прав».

[Структурщик]: Home: `PromoCode` table/module + service methods `issue`, `revoke`, `redeem`. Публичный API клиента — commands через office/API facade, не прямой доступ к таблице. Membrane остаётся с единственным `tariffId`. Log — отдельная append-only коллекция или event. Имя леммы погашения: `redeemPromoCode`, не `applyPromoAsEntitlements`.

[Архитектор]: Канал admin change: тот же `applyTransition(membraneId, targetTariffId, proof=AdminCommand)`. Не два разных write path в БД. Идемпотентность apply: if `m.tariffId == t'` → ok no-op или err `already_on_target` — выбираю **no-op success** с log skip, чтобы UI не падал. Промо при target==current: spend или reject? **Reject** `already_on_target` **без** spend — иначе сжигаем код впустую. Математик подтвердит.

[Музыкант]: Reject without spend — правильно: иначе one-shot take сгорает в тишину. Lateral move (тот же rank, другой SKU) — редкость; если сетка когда-то даст два SKU одного rank, admin any; promo только если targetTariffId явный и политика issue это допустила. v1 можно сказать: promo allows target if rank(target) ≥ rank(current).

[Математик]: Предикат promo target: `eligible(p, m) ⇔ p.status=active ∧ ¬expired(p) ∧ p.redeemedCount < p.maxRedemptions ∧ rank(p.targetTariffId) ≥ rank(m.tariffId) ∧ p.targetTariffId ≠ m.tariffId`. Последний дизъюнкт — strict change; combined with ≥ даёт upgrade-only if ranks total order and ids unique per rank. Если два SKU одного rank — ≥ и ≠ допускает lateral; ok. Spend только после successful apply в одной транзакции.

[Teamlead]: Self-service upgrade без промо — **отложено** (нет биллинга в контуре). v1: admin + promo. Сид free-v1 → 512 МБ по решению владельца — посылка/вход на содержимое SKU, не модель перехода; в DoD M6 только «сид квоты приводится», без открытия набора. Дальше — кто «владелец мембраны» для redeem: user, связанный с membrane?

[Верстальщик]: Да: redeem от лица user-сессии, membrane ∈ scope user; admin может redeem/force-apply на чужую мембрану (support). Честный deny `membrane_forbidden`. Не рисую админ-таблицу кодов здесь.

[Структурщик]: Связь User–Membrane уже в контуре server-first; новых рёбер user↔promo не плодим сверх: PromoCode не «принадлежит» user до redeem; после redeem — proofRef в log. Опционально `redeemedByUserId`. Циклов пакетов: логика в background-office (или tariff module), client — HTTP. Не тащить matrix resolve на клиент как source of truth.

[Архитектор]: Итоговая форма перехода: **(1)** объект изменения — `Membrane.tariffId`; **(2)** author прав — матрица SKU (M1/M2); **(3)** proof — AdminCommand | PromoRedemption; **(4)** PromoCode — носитель targetTariffId + lifecycle issue/redeem/revoke; **(5)** downgrade loss policy — таблица по родам выше, без purge. ADR-уровень: да, короткой записью в канон tariff-grid, не размазывать по UI.

[Музыкант]: Проверка на слух retain: после FREE←PRO downgrade сценарий с produce-сущностями играет; новый produce — stop. Catalog palette уже; старые шаги слышны. Quota over — не удаляем сэмплы. Если что-то «пропало из списка» без soft-label — это баг проекции, не фича тарифа.

[Математик]: Инвариант «без разрушения»: `∀e ∈ S_before: e ∈ S_after` для apply downgrade (no delete cascade). Допускается изменение *вычисляемых* view (palette, allow flags). Тест-предикат: snapshot entity ids pre/post transition equal. Для quota: `occupied_after = occupied_before`. Для promo: atomicity `¬(spent ∧ ¬applied)`.

[Teamlead]: Закрываем споры. Вердикт — единый. M7 зубы не трогаем; M8 врезку не расписываем сверх homes/API имён. Посылки — отдельной секцией. DoD — только M6.

[Верстальщик]: Принимаю. Контракт статусов смены и промо для будущего кабинета зафиксирован; layout не проектирую.

[Структурщик]: Принимаю. Леммы TariffTransition, PromoCode, proof, loss policy по родам — в словарь сетки; dual-write матрицы нет.

[Архитектор]: Принимаю. Форма: reference SKU + log + promo as transition token; loss policy без снимка прав в мембране.

[Музыкант]: Принимаю. Retain на понижении — как M4/M5, без mute дорожек.

[Математик]: Принимаю. Предикаты apply/redeem/eligible/no-purge — для зубов M7 как вход, не реализуем здесь.

[Teamlead]: LGTM по модели комнаты. Матч M6 сыгран на устройстве перехода, не на экране админа.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Что меняется при смене тарифа | Только **`Membrane.tariffId`** (ссылка на SKU). Матрица M1 — sole author прав (M2). **Снимок entitlements в мембране запрещён.** |
| Провенанс смены | Append-only **TariffChangeLog**: membraneId, from, to, proofType, proofRef, actorId, at. |
| Единая точка записи | Server `applyTransition(membraneId, targetTariffId, proof)` — единственный write `tariffId`. |
| Кто вправе менять (v1) | **(1)** `AdminCommand` при `UserRole.admin` (ось AdminGuard ≠ entitlement); **(2)** **PromoRedemption** после успешного redeem. Self-service upgrade/downgrade без промо/биллинга — **вне v1**. |
| Направление | Admin — **любое** (up/down/lateral). Promo — `rank(target) ≥ rank(current)` ∧ `target ≠ current`; иначе reject **без** spend. |
| Объект PromoCode | `code`, `targetTariffId`, `maxRedemptions=1`, `redeemedCount`, `expiresAt?`, `createdByAdminId`, `status: active\|spent\|revoked`. |
| Lifecycle промо | **Issue/revoke** — admin; **redeem** — user в scope мембраны (admin — support на чужую). Atomic: check → apply → spend → log. Повтор — `already_redeemed`. Revoke только active. Target==current → reject, не burn. |
| Чем промокод **не** является | Не параллельная матрица прав, не временный override resolve, не UI-админка (экран вне контура). |
| Понижение: quota | Limit из нового SKU; occupied не изменяется; over-quota state допустим; hard deny allocate/create; read/delete ok; **auto-evict запрещён** (M4). |
| Понижение: catalog | Palette/projection = новый catalog-срез; **instances и ссылки в сценариях retain**; add вне среза deny; existence-check «против тарифа» запрещён. |
| Понижение: instrument | resolve false → deny **новый** launch/arm; сохранённые конфигурации и вхождения retain (не purge). |
| Понижение: gated | Новая строка matrix+preconditions (M3); progress/precondition facts не wipe; UI честно entitled/unmet. |
| Понижение: produce | **M5 retain**: созданное живёт и вшито; create/expanding-mutate deny при loss. |
| Инвариант «без разрушения» | Apply downgrade **не** каскадирует delete доменных сущностей; меняются view/allow на последующих op. |
| Сид квоты free | Привести `userStorageQuotaBytes` free-v1 к **512 МБ** (слово владельца / T5); содержание набора иначе — вне контура. |
| Не в M6 | Зубы (M7), план интеграции/порядок врезки (M8), billing, admin UX, server network container, миграции существующих users. |

**Definition of Done (M6):**

1. Зафиксирован канон (документ tariff-grid / ADR-фрагмент): transition = смена `tariffId`; запрет entitlement-snapshot на мембране; dual-write матрицы запрет.
2. Описан агрегат PromoCode (поля + status) и proof-типы AdminCommand | PromoRedemption.
3. Специфицирован `applyTransition` + atomic `redeem` (eligible-предикат, no burn on reject).
4. Таблица loss policy по пяти родам (quota/catalog/instrument/gated/produce) согласована с M4/M5 и явным no-purge.
5. TariffChangeLog — обязательный след акта.
6. Сид free-v1: квота storage **512 МБ** (правка содержимого SKU по входу владельца).
7. Нет обязательств UI-админки, M7-тестов-зубов и M8-плана врезки в этом DoD.

---

## Список посылок

| # | Посылка | Тип |
|---|---------|-----|
| 1 | M1: матрица SKU × entitlementId → EntitlementValue (quota · catalog · instrument · gated+preconditionId · produce); home истины — сервер; deny-by-default; pure `resolveEntitlement` | норма |
| 2 | M2: сетка — единственный author; рельс сценариев — проекция catalog-среза; dual-write запрещён | норма |
| 3 | M3: «право есть, условие не выполнено» = `entitled` ∧ `unmetPreconditions ≠ []` | норма |
| 4 | M4: hot/cold quota; limit из матрицы, occupied — сервер; hard deny create при исчерпании; read/delete живут; auto-evict запрещён | норма |
| 5 | M5: produce — capability на create/expanding-mutate; при loss — retain созданного; проверка существования против тарифа запрещена | норма |
| 6 | Решение владельца (мостик 29.07): переключение старшего тарифа через кабинет на сервере; также через промокод; промокод генерирует администратор; администратор в системе есть | норма |
| 7 | `UserRole { admin, user }`, `AdminGuard` (`role !== 'admin'` → отказ); сид повышает до admin — существуют в коде | факт |
| 8 | `Membrane` несёт `tariffId` с связью на `Tariff`; создание на `FREE_TARIFF_ID` (`free-v1`); **эндпоинта смены тарифа нет** | факт |
| 9 | Промокодов нет: ни модели, ни модуля | факт |
| 10 | AdminGuard и тарифные entitlements — разные оси (вердикт M1) | норма |
| 11 | Админский дашборд управления набором / промо — за пределами контура заседания; M6 — модель выпуска и погашения, не экран | норма |
| 12 | Содержание набора тарифов (что какой SKU даёт) — вне контура; предмет M6 — каркас перехода | норма |
| 13 | Пользователей/продовых данных для миграции нет; понижение — модель перехода, не migration branches | норма |
| 14 | Сид `free-v1`: `userStorageQuotaBytes = 1 ГБ` при решении владельца **512 МБ** для «Датчика» — намеренный регресс T5, сид подлежит приведению | факт + норма входа |
| 15 | M7 (зубы) и M8 (план интеграции) — не предмет этой комнаты | норма |
| 16 | Серверный network-маршрут / отдельный контейнер — снят с предмета заседания | норма |

---

*Реплик в диалоге: 37; каждый участник высказался не менее одного раза.*
