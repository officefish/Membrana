<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-29T10:22:45.557Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/tariff-grid-m3-tri-2026-07-29.md` |
| Порядок ролей | Математик → Верстальщик → Музыкант → Teamlead → Структурщик → Архитектор |
| Повестка | `docs/meeting/tariff-grid/M3_AGENDA.md` |

**Вопрос:**

Третий исход: право есть, условие не выполнено — модель, стык и доведение до потребителей

---

```text
# Консилиум: M3 — третий исход «право есть, условие не выполнено»

**Повестка:** Как тарифная сетка выражает третий исход — право по тарифу есть, но условие применения не выполнено — так, чтобы не соврать пользователю и не спрятать купленное. Модель: где живёт `preconditionId`, кто вычисляет факт выполнения, что возвращает `resolveEntitlement`, как состояние доходит до сервера / борда / витрины и чем отличается от `not_entitled` и `entitled`.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Математик → Верстальщик → Музыкант → Teamlead → Структурщик → Архитектор

---

[Математик]: Формализую без UI. Из M1: `resolveEntitlement(grid, sku, id) → { status, payload, unmetPreconditions[] }`, status ∈ {entitled, not_entitled}. Третий исход не обязан быть третьим enum-значением status: он уже выразим как `status = entitled ∧ unmetPreconditions ≠ ∅`. Предикат полного допуска: `fullyGranted ⇔ status = entitled ∧ unmetPreconditions = []`. Отвергнутое тарифом: `status = not_entitled` — precondition не рассматривается. Инвариант: при `not_entitled` массив unmet обязан быть пуст (иначе лжём о «купленном, но заблокированном»).

[Верстальщик]: С витрины потребителя бинарь `entitled | locked` — ложь для третьего исхода. Нужны три честных состояния карточки/бейджа: доступно · доступно при условии (притемнено + жёлтое предупреждение) · недоступно по тарифу. Фальшивое «заблокировано» на купленном пеленге — декор без смысла и прячет покупку. Не рисую layout: требую в контракте данных различимые метки, иначе UI снова сожмёт в два цвета.

[Музыкант]: На слух это гейт на send, а не mute канала. Право по тарифу — шина открыта; условие сети — insert-гейт перед выходом на пеленг/позицию. Клиппинг доверия: если пользователь купил «Блокпост» и слышит «закрыто» как у free-тарифа — это обман микса. Сетка должна сказать «канал твой, но count-in сети не прошёл», а не вырезать дорожку ножницами.

[Teamlead]: Положение: M1 дал wire и `unmetPreconditions[]`, M2 запретил dual-write; сегодня третьего исхода в рантайме нет — бейджи сценариев бинарны, у узлов палитры прав нет. Матч M3 — закрыть модель исхода и стык, не строить T7-сеть. Связка: Математик — предикаты и инварианты resolve; Архитектор — форма status/DTO и граница «кто владеет фактом условия»; Структурщик — леммы API и homes; Музыкант — слух на эшелон (не прятать купленное); Верстальщик — честные три метки до потребителей. Не лезем в M4–M8.

[Структурщик]: Леммы, иначе синонимы. **Entitlement** — право в реестре (id + kind). **Gated value** — `kind: gated` + `enabled` + `preconditionId` (M1). **Precondition** — именованный предикат вне сетки; сетка хранит только id-ссылку, не тело вычисления. **PreconditionReport** — снимок `{ id, satisfied: boolean, reasonCode? }` от владельца факта. **Resolution** — результат pure `resolveEntitlement`. **Fully granted / entitled-unmet / not_entitled** — три исхода для потребителей; имена фиксируем, не «почти locked».

[Архитектор]: Конструкция: сетка — author прав и условий-как-ссылок; факт выполнения условия — **не** поле документа тарифа и не клиентская догадка. Home истины сетки — сервер (M1); home истины precondition «минимальная сеть» — контур сети (T7), с read-API/снимком, который resolve **принимает снаружи**. Цена альтернативы «сеть пишет в grid document» — Dual source, запрет M2 по духу. Рекомендация: `resolveEntitlement(grid, sku, id, preconditionContext)` — pure; context подаёт composition root / серверный фасад, не матрица.

[Математик]: Уточняю сигнатуру. `PreconditionContext = Map<preconditionId, boolean> | (id → boolean)` — на входе resolve, без I/O. Алгоритм для gated: если sku не даёт entitlement → `not_entitled`, unmet=`[]`; если даёт и `enabled=false` → `not_entitled` (выключено матрицей); если даёт и enabled и preconditionId задан и context[id]≠true → `entitled`, unmet=`[id]`; если context[id]=true или preconditionId отсутствует → `entitled`, unmet=`[]`. Отсутствие ключа в context трактуем как **unsatisfied** (deny-by-default на условии), не как throw — иначе витрина падает при неподключённом T7.

[Верстальщик]: Deny-by-default на условии согласую с витриной: нет снимка сети → жёлтое «нужна минимальная сеть», не silent hide и не красный «тариф не позволяет». Различие текстов обязательно: not_entitled — «не входит в тариф» / CTA апгрейд; entitled-unmet — «доступно после валидации и калибровки сети» / CTA к блоку сети, без предложения купить то, что уже куплено. Latency/confidence здесь ни при чём — только entitlement-слой.

[Музыкант]: Эшелон с мостика 29.07 на слух: (1) UI притемняет с жёлтым — монитор тише, не cut; (2) сценарии со старшими узлами не грузятся в борд и не клонируются — это уже hard-gate на рельсе, не «серый бейдж»; (3) серверные вызовы сверяются с матрицей. Третий исход не один UX на всех потребителей: витрина/палитра — soft; load/clone/start на борде и server command — fail-closed, если unmet содержит id, требуемый операцией.

[Teamlead]: Планка: одно resolution-ядро, три проекции поведения — иначе снова dual-write смысла. Не принимаю «на клиенте жёлтый, на сервере не проверяем» — это сдана тренировка. Вердикт по форме: soft vs hard — политика потребителя над одним и тем же Resolution, не разные compute. Владелец T7-факта вне комнаты; M3 фиксирует только стык и fail-closed при отсутствии context.

[Структурщик]: Публичный контракт (словарь):
1) `EntitlementResolution = { status: 'entitled' | 'not_entitled', payload?, unmetPreconditions: PreconditionId[] }` — без третьего status-enum (меньше ветвлений wire, M1 совместим).
2) Хелперы-леммы pure: `isFullyGranted(r)`, `isEntitledUnmet(r)`, `isNotEntitled(r)`.
3) `preconditionId` живёт только в ячейке матрицы kind=gated (и при необходимости в реестре как декларация известных id — optional catalog, не runtime truth).
4) Сервер: тот же resolve + тот же context; запрет импорта UI-политик в core.

[Архитектор]: Граница модулей: `@membrana/core` (или будущий tariff-пакет в core-слое) — типы grid, pure resolve, хелперы исходов. Серверный фасад (background-office / device-board server-first) — собирает PreconditionContext из сетевого порта, вызывает resolve, enforced на командах. Клиент — wire DTO сетки + context snapshot (read-model), pure resolve локально для витрины; **не** единственный гейт. Порт `NetworkReadinessPort.satisfied(preconditionId): boolean` — принадлежит блоку сети; до T7 — stub `false` + явный reason, не «придумать калибровку» в сетке.

[Математик]: Различие исходов счётно:
| исход | status | unmet | fullyGranted |
| entitled full | entitled | [] | true |
| третий | entitled | non-empty | false |
| not_entitled | not_entitled | [] | false |
Предикат hard-deny для операции op с requiredPreconditions R: `deny ⇔ not fullyGranted ∨ (R ∩ unmet ≠ ∅) ∨ status=not_entitled` — фактически deny если ¬fullyGranted, когда op требует полное право; для op, помеченных soft-display-only, достаточно status для копирайта. Пеленг/позиция на «Блокпосте» — hard: R ⊇ {minimal_network_ready} или как назовём id.

[Верстальщик]: Для борда/палитры узлов: третий исход → opacity/притемнение + `badge-warning` «нужна сеть», не `badge-ghost` как locked и не снятие с палитры. Locked по тарифу — ghost/locked + апгрейд. Сценарии: entitled-unmet на catalog-срезе M2 — **не** показывать как runnable в борде (не грузить/не клонировать) — это согласовано с эшелоном; на витрине каталога сценарий виден с жёлтым, чтобы не прятать купленное. Честная пустота: «сеть ещё не подключали» ≠ «тариф free».

[Музыкант]: Id условия для пеленга/позиции: один стабильный `preconditionId`, не два жаргона «валидация» и «калибровка» на wire resolve. Внутри T7 пусть будет конъюнкция валидации∧калибровки — но сетке и resolve отдают **один** булев fact «минимальная сеть готова». Иначе unmet[] раздуется, UI начнёт оркестровать DSP-сеть. Слышу владельца: без них детекция не валидна — это внутренность порта сети, не матрица SKU.

[Teamlead]: Принимаю один id на минимальную сеть для M3-стыка. Имя — словарное, латиница kebab/snake по дому проекта; финальный литерал зафиксирует Структурщик в ADR/типах, не в прозе. BLOCK любой попытке вписать в grid document «список откалиброванных deviceId» — это T7 и M8 не здесь. Связка на DoD: Математик — таблица инвариантов + тесты pure; Структурщик — типы и порт; Архитектор — граница пакетов; Верстальщик — спецификация трёх меток без кода экранов (код — после M8).

[Структурщик]: Литерал леммы: `preconditionId = "minimal_network_ready"` (каталог известных id — `PreconditionId` union или branded string + registry map для reasonCode/copy keys). `GatedEntitlementValue = { kind: 'gated', enabled: boolean, preconditionId: PreconditionId }`. Context key ровно этот id. Reason для UI/API: не из grid, а из `PreconditionDetailsPort` (optional): `{ id, satisfied, code: 'network_not_built' | 'validation_pending' | 'calibration_pending' | 'stub_unwired' }` — details не влияют на pure resolve, только на сообщение; resolve смотрит boolean.

[Архитектор]: Цена `details` отдельно от resolve — правильная: иначе pure ядро тянет i18n и T7. Форма доведения:
- Server command path: load context → resolve → if !isFullyGranted → 403/409 с body `{ resolution, preconditionDetails? }` (код уточнит office-контракт в M8).
- Board: не activate/load/clone сценарий, если resolution по required entitlements не fullyGranted.
- Витрина/кабинет: render по isEntitledUnmet / isNotEntitled.
Сетка не пушит события «условие изменилось»; сеть публикует snapshot/version; подписчики пересчитывают resolve. Рекомендация формы без ADR-блокера: добавить preconditionContext в контракт resolve — уточнение M1, не ломка.

[Математик]: Инвариант регрессии M1: старые вызовы без context. Политика: `resolveEntitlement(grid, sku, id, ctx = empty)` — empty ⇒ все preconditionId неудовлетворены. Поведение: gated с precondition уходит в entitled+unmet, не в not_entitled. Тесты: (1) free sku + пеленг → not_entitled; (2) blockpost sku + ctx false → entitled, unmet=[minimal_network_ready]; (3) blockpost + ctx true → fullyGranted; (4) not_entitled ⇒ unmet length 0; (5) instrument/quota без precondition — context игнорируется.

[Верстальщик]: Ключи копирайта (не тексты в ядре): `entitlement.unmet.minimal_network_ready`, `entitlement.denied.not_in_tariff`. Витрина мапит code details → одна строка reason; если details stub_unwired — «условие сети ещё не подключено» честно, без фейковой «калибровки 80%». a11y: не только цвет — текст + icon warning; `aria-live` не спамить на каждый кадр context — только смена stable resolution.

[Музыкант]: Стык с рельсом M2: `entitledTariffSkus` — проекция catalog «входит в тариф», не «fullyGranted сейчас». Иначе сценарий выпадет из списка sku при неготовой сети и прикинется «не куплено». Проекция рельса остаётся tariff-slicing; runtime-start сценария — отдельный gate по resolve+context. Dual-write не плодим: рельс не пишет unmet.

[Teamlead]: Слышу Музыканта — верно, M2 не переписываем. Планка M3 закрыта по смыслу, если комната единогласно: (a) третий исход = entitled ∧ unmet≠∅; (b) preconditionId в gated-ячейке; (c) fact снаружи через context; (d) один id сети; (e) soft UI / hard board+server; (f) рельс не смешивать с readiness. Дальше — явные «Принимаю» и DoD только M3.

[Структурщик]: Home артефактов M3 (не код T7): типы/resolve — пакет канона сетки (как решит M1 home, без нового сервиса-оркестратора условий); `NetworkReadinessPort` — interface в core или device-board domain ports, implement stub; запрет `packages/services/*` ↔ прямой import grid UI. Словарь consumers: `TariffResolutionConsumer = showcase | board_palette | board_rail_runtime | server_command`. Политика soft/hard — таблица в каноне, не if в JSX вразброс.

[Архитектор]: Сводная конструкция: Matrix authoring → document на сервере → wire DTO → pure resolve(grid,sku,id,ctx) → Resolution → consumer policy. Условие «минимальная сеть» выражено ссылкой `minimal_network_ready` в gated entitlements пеленга и оценки позиции (и любых будущих, что владелец привяжет). Вычисление валидации/калибровки — **вне** сетки. Третий исход не прячет купленное на витрине и не пускает hard-операции. Форма достаточна; ADR короткий «Precondition context in resolve» — по желанию Teamlead в M8, не блокер вердикта.

[Математик]: Ещё инвариант: payload при entitled-unmet **сохраняется** (квоты, catalog slice, instrument meta) — UI может показать «что куплено», не обнуляя payload как при not_entitled. Иначе третий исход проглотит данные отображения. Численно: not_entitled.payload = undefined/null; entitled*.payload = value ячейки.

[Верстальщик]: Принимаю сохранение payload: карточка пеленга рисует имя/описание права притемнённо, не empty state «купите тариф». Empty state только для not_entitled. DoD витрины для M3 — спецификация состояний в каноне/протоколе, без обязательства сверстать кабинет в этом PR.

[Музыкант]: Принимаю. На слух hard-path без зелёного fullyGranted — стоп, не «поиграть тихо»; soft-path — притемнить. Не путать с клиппингом детекции: невалидная сеть — это не confidence 0.2 на индикаторе дрона, а entitlement-гейт до запуска старших узлов.

[Teamlead]: Вердикт комнаты: **да**, модель третьего исхода фиксируем как выше. Связка исполнения зубьев — не здесь (M7/M8). Принимаю. Кто ломает инвариант unmet⊂entitled only — BLOCK по имени.

[Структурщик]: Принимаю леммы и таблицу consumer policy. Нарушение «рельс = readiness» — `нарушена слабая связанность` смысла M2/M3.

[Архитектор]: Принимаю конструкцию и границу порта сети. Лишнего status-enum в wire не вводим без новой цены; хелперы — часть публичного API resolve-слоя.

[Математик]: Принимаю. Тесты pure — зуб модели; без них вердикт не исполнен в коде, но в M3-комнате достаточно спецификации предикатов.

[Верстальщик]: Принимаю три метки и запрет прятать купленное.

[Музыкант]: Принимаю soft/hard эшелон и один precondition id на минимальную сеть.

---

## Список посылок

| # | Посылка | Тип |
|---|---------|-----|
| 1 | M1: `TariffGridDocument` = реестр + матрица SKU × entitlementId → `EntitlementValue` (в т.ч. `gated{enabled, preconditionId}`); home истины сетки — сервер; клиент — wire DTO + pure `resolveEntitlement` → entitled/not_entitled + payload + `unmetPreconditions[]`; deny-by-default | норма |
| 2 | M2: сетка — единственный author прав; `entitledTariffSkus` рельса — проекция catalog-среза, не источник истины; dual-write запрещён | норма |
| 3 | Пеленг и оценка позиции дрона доступны на тарифе «Блокпост» при условии построенной минимальной сети; «построенная сеть» = устройства прошли валидацию и калибровку; без них детекция не валидна (слово владельца 29.07) | норма |
| 4 | Сеть — отдельный блок работ (T7): сетка обязана выразить условие, не строить вычисление валидации/калибровки | норма |
| 5 | Эшелонированная граница (мостик 29.07): UI притемняет с жёлтым предупреждением, не прячет; сценарии со старшими узлами не грузятся в борд и не клонируются; серверные вызовы дополнительно сверяются с матрицей и отклоняются | норма |
| 6 | Сегодня в продукте состояния «право есть, условие не выполнено» нет: бейджи сценариев по сути бинарны; у узлов палитры entitlement-слоя нет | факт |
| 7 | Форма M1 и отношение к рельсу M2 в этой комнате не пересматриваются; M4–M8 (две памяти, produce, смена тарифа, зубы, план врезки) вне границ M3 | норма |
| 8 | Пользователей нет — миграционные ветви не проектируются | норма |

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Есть ли третий исход как отдельная сущность UX/API? | **Да.** Машинно: `status = entitled` ∧ `unmetPreconditions.length > 0`. Отдельно от `not_entitled` и от fully granted (`entitled` ∧ `unmet = []`). Третий enum-status в wire **не** вводим. |
| Где живёт условие? | `preconditionId` в ячейке матрицы `kind: gated` (+ опциональный каталог известных id для copy/details). Тело вычисления — **не** в grid document. |
| Кто вычисляет факт? | Контур сети (T7) через порт readiness (напр. `NetworkReadinessPort` / snapshot → `PreconditionContext`). До T7 — stub: unsatisfied + честный code `stub_unwired`. Сетка fact не пишет. |
| Сигнатура resolve | `resolveEntitlement(grid, sku, id, ctx?)` pure; нет ключа в ctx ⇒ precondition unsatisfied (deny-by-default на условии). При `not_entitled` всегда `unmetPreconditions = []`. Payload при entitled-unmet **сохраняется**. |
| Литерал для сети | Один id: `minimal_network_ready` (= конъюнкция валидации∧калибровки **внутри** T7, наружу один boolean). |
| Доведение до потребителей | Один Resolution → политики: **showcase/cabinet/palette** — soft (притемнение + warning, не hide, не «купите снова»); **board load/clone/start** и **server commands** — hard fail-closed если не `isFullyGranted` для требуемых id. |
| Рельс сценариев (M2) | Остаётся tariff-проекцией catalog; **не** фильтрует по readiness/unmet. Runtime-start — отдельный gate. |
| Отличие копирайта | `not_entitled` → не в тарифе / upgrade; `entitled-unmet` → право есть, нужна минимальная сеть / CTA к сети. |
| Хелперы API | `isFullyGranted`, `isEntitledUnmet`, `isNotEntitled` — публичные pure. |
| Вердикт | **Принято** единогласно шестью ролями. |

**Definition of Done (только M3):**

1. В каноне/типах сетки зафиксированы: семантика третьего исхода; инварианты resolve (таблица Математика); литерал `minimal_network_ready`; optional `PreconditionContext` в контракте resolve.
2. Описан порт факта readiness (interface + stub-поведение) без реализации T7-валидации/калибровки.
3. Таблица consumer policy: showcase soft / board runtime hard / server_command hard; рельс ≠ readiness.
4. Pure-тесты (или спецификация red-tests) на 5 случаев Математика: free→not_entitled; blockpost+ctx false→unmet; ctx true→full; not_entitled⇒unmet∅; non-gated игнорирует ctx.
5. Спека трёх честных UI-меток и copy-keys без обязательства полной вёрстки кабинета (врезка — M8).
6. Нет колонизации M4–M8 в этом DoD; нет dual-write readiness в grid или в `entitledTariffSkus`.

---

*Реплик в диалоге: 33; каждый участник высказался не менее одного раза.*
```
