# Консилиум: рефакторинг device-board (v0.4 — variables, Event-node, dataflow, fullscreen)

**Повестка:** как корректно ввести в `device-board` переменные, системный неудаляемый `Event`-узел, исполнение по данным (ссылки `Device`/`Microphone`) и fullscreen, не нарушив `ARCHITECTURE.md` и концепт §4.6 (без второго движка). Вход — [`docs/prompts/DEVICE_BOARD_REFACTOR_CONSILIUM_TOPIC.md`](../prompts/DEVICE_BOARD_REFACTOR_CONSILIUM_TOPIC.md).

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Teamlead → Структурщик → Математик → Музыкант → Верстальщик (циклически).

---

[Teamlead]: Рамка спринта: мы трогаем `@membrana/core` (ветви сценария, типы узлов, секция переменных), значит вся core-часть — ветка `vesnin`, LGTM на мне, сериализованные сценарии мигрируем по expand/contract. Красная линия из концепта §4.6 — **не вводим второй движок**: scenario runtime не должен превратиться в push-dataflow поверх сигнала. Всё, что предлагаем по пп.4–6, обязано укладываться в «exec ведёт, данные питают», иначе я блокирую.

[Структурщик]: Поддерживаю и сразу уточняю термин. Сегодня рантайм exec-only (`exec-subgraph.ts`), data-рёбра декоративны. Для ссылок `Device`/`Microphone` нам не нужен полноценный поток данных — нужна **ленивая резолюция входов**: когда exec доходит до узла, его data-входы вычисляются протягиванием назад по data-рёбрам до источника. Это не движок, это чистая функция `resolveInput(node, port) → value`. Предлагаю так и зафиксировать границу.

[Математик]: С точки зрения чистоты — это правильный путь. `resolveInput` детерминирована и без side-effect: вход — подграф + карта значений переменных, выход — значение порта. Тогда «валидность ссылки» — это не магия, а поле значения: `Ref = { kind: 'device'|'microphone', handle, valid: boolean }`. `OnDisconnect` кладёт в data-канал `null` → set в переменную делает `valid=false`. `isValid` — чистый предикат над `Ref`. Никакого недетерминизма.

[Музыкант]: По п.6 и п.9 жёстко: `getMicrophone` и любой список входов — **только через `audio-engine-service`** enumerate, второго AudioContext не будет. На полевом клиенте это локальный enumerate. Но в кабинете редактор не видит железо устройства — список микрофонов должен прийти **удалённо по node-realtime**. Это отдельный контракт «дай список аудиовходов», и я предлагаю его в этом спринте не раздувать.

[Верстальщик]: По п.1 — корневую причину видно в `device-board-shell.tsx`: центр `<main className="min-w-0 flex-1">` без `h-full`/`min-h-0`/flex-col, поэтому `div.h-full` канваса меряет высоту от контента, а не от вьюпорта. XYFlow тут ни при чём. Лечится раскладкой: `<main>` делаем `flex min-h-0 flex-col`, канвас — `flex-1`. И да, fullscreen стоит принять каноном — текущий концепт §8 («приоритет split, fullscreen опционально») надо переписать.

[Teamlead]: Принимаю границу Структурщика и Математика: **ленивая резолюция data-входов для ссылок, exec остаётся ведущим**. Это не нарушает §4.6 — мы не исполняем сигнал, мы вычисляем значения переменных сценария. Записываю как решение №1: да, ограниченный dataflow (reference-resolution), нет — полноценному движку.

[Структурщик]: Теперь ветви (п.2). Сейчас `SCENARIO_SYSTEM_BRANCHES = [initial, main, alarm, onStop, onDisconnect]`, причём `initial` в UI подписан «On start». Владелец хочет 4 **обработчика событий**: `onConnect/onStart/onStop/onDisconnect`. Я предлагаю развести понятия: 4 события-обработчика — отдельная группа, `main/alarm` — лупы, отдельно. `onStart` поглощает прежнюю роль `initial` (выбор mic, set Microphone). Миграция: `initial → onStart`, добавляем `onConnect`.

[Teamlead]: Согласен, но строго через expand/contract. Фаза expand: схема читает и старый `initial`, и новый `onStart`; парсер мапит `initial→onStart`; добавляем `onConnect`. Через релиз — contract: убираем чтение `initial`. Это критичный контракт `@membrana/core`, поэтому DBR0 на `vesnin` и без него остальные фазы не стартуют.

[Математик]: По переменным (п.3) важен scope. Микрофон ставится в `onStart`, а используется в `main/alarm` — значит переменные живут на уровне **документа сценария**, общие для всех ветвей, а не на ветвь. Модель: `variables: Variable[]`, где `Variable = { id, name, type: 'DeviceRef'|'MicrophoneRef', value: Ref|null }`. Узлы get/set читают/пишут по `id`. Это минимально и расширяемо.

[Структурщик]: Поддерживаю document-scope. В `SocketType` каталог добавляем ссылочные типы `DeviceRef`, `MicrophoneRef` — тогда `isValidConnection` сам не даст подключить `MicrophoneRef` туда, где ждут `DeviceRef`. Узлы-переменные — это get/set, которые перетаскиваются **из конструктора переменных** (левый сайдбар), а не из палитры. Палитра остаётся для операторских узлов.

[Верстальщик]: Тогда левый сайдбар (п.3): под секцией «Конструктор функций» добавляю секцию «Конструктор переменных» — список переменных с типом и индикатором `valid/invalid`, кнопка «+ переменная», drag get/set на канвас. По `DESIGN.md`: тип — цветной бейдж (как цветовой код сокетов §5.2), invalid — `badge-error`/приглушение. Inline-редактор имени, параметры — в сайдбаре, не на ноде.

[Музыкант]: Уточню по `GetMicrophone` (п.6, п.9): это, по сути, вызов метода `Device.getMicrophone` с выпадающим списком. На клиенте список = `audio-engine` enumerate (реальный). Я за то, чтобы в этом спринте полноценно сделать **клиентский путь**, а кабинетный remote-enumerate вынести в scoped-follow-up: либо берём последний известный список из presence-данных, либо dropdown disabled с подсказкой «список придёт от устройства».

[Teamlead]: Согласен. Решение №5: remote-enumerate для кабинета — **scoped follow-up**, не блокер спринта; основной таргет — полевой клиент через engine. Это снимает риск раздуть node-realtime контракт прямо сейчас.

[Структурщик]: По `Event`-узлу (п.4). Не плодим зоопарк XYFlow-типов: оставляем единый компонент `BoardFlowNode`, рендер — по `data.kind` (`event`/`get`/`set`/`print`/`is-valid`/`get-microphone`/…). Неудаляемость: на системном Event ставим `deletable:false` и в `applyNodeChanges` фильтруем `type:'remove'` для системных узлов. Event авто-инжектится в каждую ветвь-обработчик при hydrate, его id фиксирован — это уже почти есть через entry-константы.

[Математик]: Семантика Event как источника данных (п.4–5): для `onConnect/onStart/onStop` data-выход Event = `Ref{kind:'device', valid:true}`; для `onDisconnect` data-выход = `null`. В `onConnect` set в переменную `Device` делает её `valid=true` (слабая → постоянная), в `onDisconnect` set с `null` → `valid=false`. Downstream `isValid(Device)` читает это поле. Всё выражается чистыми функциями, тестируется без UI.

[Музыкант]: Тогда `Print` (п.9) принимает `DeviceRef|MicrophoneRef` и выводит человекочитаемое представление + статус `valid`. Важно: `Print` не лезет в Web Audio, он печатает значение ссылки/метаданные, реальный стрим — забота engine при последующих loop-узлах. Это держит границу аудио на месте.

[Верстальщик]: По gating Пуска (п.7) — нужен единый критерий. Сейчас client-board вообще не завязан на online, а cabinet `NodesPage` гасит кнопку по «сопряжён» (`deviceId`), а не по живой связи. Предлагаю: «связь жива» = **online-presence** (`node.online`/`node.offline`), и гасить **одинаково** в списке устройств и в борде. Disabled-кнопка с `title`/`aria` «нет связи с устройством».

[Структурщик]: Поддерживаю online как критерий, но аккуратно с источником: на кабинете это `useCabinetNodeRuntime` presence, на клиенте — состояние `NodeRealtimeClient`/`nodeConnectionStore`. Заведём один селектор-обёртку `isDeviceLive(deviceId)` на каждой стороне, чтобы кнопки не расходились. «Сопряжён, но офлайн» → Пуск неактивна.

[Teamlead]: Фиксирую №7: gating по online-presence, единый селектор на сторону. И сразу про палитру (п.8): сводим правый сайдбар к `Print`/`isValid`/`GetMicrophone`. Старый большой `SCENARIO_NODE_PALETTE` (record-chunk, trends-fft и т.д.) — прячем за флагом на эту итерацию, чтобы не сломать существующие сценарии и не растить scope.

[Структурщик]: Согласен. Итого источники узлов разведены: **Event** — авто-инжект (системный, не в палитре); **get/set Device/Microphone** — из конструктора переменных; **Print/isValid/GetMicrophone** — из палитры. Это снимает путаницу «что где берётся».

[Математик]: Одно предупреждение по валидации: pre-run сейчас проверяет наличие entry-узла. Добавим правило — в обработчиках обязателен системный Event как entry, и data-цепочки `isValid`→`getMicrophone`→`set` должны быть типо-согласованы. Это чистая проверка над сериализованным подграфом, кладётся рядом с `validate-pre-run.ts`.

[Верстальщик]: По fullscreen ещё деталь: cabinet монтирует борд в `fixed inset-0 z-50`, клиент заменяет `Dashboard`. Чтобы раскладка не разъезжалась, shell должен сам владеть `h-screen`/`h-full` и не зависеть от внешнего контейнера. Палитра/инспектор в fullscreen — сворачиваемые боковые панели, канвас всегда занимает остаток по ширине и высоте.

[Teamlead]: Принимаю. Концепт §8 переписываю на «fullscreen — канон, split — опционально позже». Теперь фазировка (№9), чтобы спринт не расплылся.

[Структурщик]: Предлагаю порядок: **DBR0** — концепт v0.4 + core-контракты на `vesnin` (ветви `onConnect`/`onStart`, секция `variables`, `DeviceRef`/`MicrophoneRef` в `SocketType`, `data.kind`) + миграция expand/contract. **DBR1** — fullscreen layout + единый host-контракт. **DBR2** — переменные (модель + конструктор переменных + get/set). **DBR3** — Event-узел (неудаляемый, авто-инжект) + ленивая резолюция data-входов в рантайме. **DBR4** — палитра `Print`/`isValid`/`GetMicrophone` + `getMicrophone` через engine + set `Microphone`. **DBR5** — gating Пуска по online.

[Музыкант]: Согласен; добавлю в out-of-scope: продвинутый remote-enumerate UI на кабинете (scoped follow-up), любые попытки гонять реальный стрим в `Print`. Реальные loop-узлы (record/trends) — следующая итерация, сейчас они под флагом.

[Верстальщик]: Из UI-out-of-scope: multi-function manager (сейчас одна функция), multi-level subgraph, UI для `custom`-триггеров и `scheduled`. На эту итерацию — только 4 обработчика + лупы как есть.

[Teamlead]: Тогда формализуем. Все роли — подтвердите итог.

[Структурщик]: Принимаю.

[Математик]: Принимаю.

[Музыкант]: Принимаю.

[Верстальщик]: Принимаю.

[Teamlead]: Принято. Ниже — сводная таблица и DoD; это основа эпик-промпта `device-board-refactor-v04` и записи в `docs/tasks/registry.json`.

---

## Итоговое решение консилиума

| # | Вопрос | Решение | Владелец |
|---|--------|---------|----------|
| 1 | Dataflow-исполнение | **Да, ограниченно:** ленивая резолюция data-входов для ссылок (`resolveInput`, чистая фн); exec ведёт. **Нет** полноценному push-движку (§4.6) | Структурщик + Математик |
| 2 | `onStart` vs `initial` | 4 обработчика событий `onConnect/onStart/onStop/onDisconnect` — отдельная группа; `main/alarm` — лупы отдельно. `onStart` поглощает роль `initial` (миграция `initial→onStart`, добавить `onConnect`) | Teamlead + Структурщик |
| 3 | Модель переменных | Scope = **документ сценария**; `Variable={id,name,type,value:Ref\|null}`; типы `DeviceRef`/`MicrophoneRef` (расширяемо) в каталоге `SocketType`; узлы get/set из конструктора переменных | Структурщик + Математик |
| 4 | Event-узел / типы узлов | Единый XYFlow-тип, рендер по `data.kind`; системный Event **`deletable:false`** + guard в `applyNodeChanges`; авто-инжект как entry каждой ветви-обработчика | Структурщик + Верстальщик |
| 5 | Remote-enumerate (кабинет) | **Scoped follow-up:** основной таргет — полевой клиент через `audio-engine` enumerate; на кабинете dropdown из последнего известного списка либо disabled | Музыкант + Структурщик |
| 6 | Fullscreen каноном | **Да:** концепт §8 переписать; фикс высоты (`<main>` → `flex min-h-0 flex-col`, канвас `flex-1`); shell владеет `h-screen/h-full`; единый host для cabinet/client | Верстальщик + Структурщик + Teamlead |
| 7 | Критерий «связь жива» для Пуска | **Online-presence** (`node.online/offline`), не «сопряжён»; единый селектор `isDeviceLive` на сторону; гасить в списке устройств **и** в борде | Структурщик + Верстальщик |
| 8 | Палитра | Свести к `Print`/`isValid`/`GetMicrophone`; Event — системный (не в палитре); get/set Device/Microphone — из конструктора переменных; старая палитра под флагом | Верстальщик + Структурщик |
| 9 | Фазировка / out of scope | **Уточнено при оформлении эпик-промпта (2026-06-18): 7 фаз DBR0–DBR6** (Event-узел и dataflow-резолюция разведены в разные фазы — разные владельцы и ревьюируемость). DBR0 (core/`vesnin`+миграция) → DBR1 (fullscreen) → DBR2 (переменные) → DBR3 (Event-узел: неудаляемость+авто-инжект) → DBR4 (dataflow-резолюция `resolveInput`+validity) → DBR5 (узлы палитры+getMicrophone) → DBR6 (gating). DBR1 и DBR6 независимы → параллельно core-цепочке. OOS: remote-enumerate UI, real loop-узлы, multi-function manager, multi-level subgraph, UI custom/scheduled | Teamlead |

**Definition of Done (ведёт к коду):**
- [ ] `DEVICE_BOARD_CONCEPT.md` → v0.4: 4 обработчика, переменные, dataflow-резолюция, fullscreen канон.
- [ ] `@membrana/core` (ветка `vesnin`, LGTM Vesnin): `SCENARIO_SYSTEM_BRANCHES` → `onConnect/onStart/onStop/onDisconnect`; `ScenarioGraph.variables`; `SocketType` += `DeviceRef`/`MicrophoneRef`; `data.kind` узлов; expand/contract миграция (`initial→onStart`), импорт более новой `version` → отказ; тесты round-trip.
- [ ] Fullscreen: канвас дотягивается до низа в cabinet и client; единый host-контракт; a11y disabled-состояния.
- [ ] Переменные: конструктор в левом сайдбаре под функциями; get/set узлы; `valid/invalid` индикатор.
- [ ] Event-узел неудаляем (UI + сериализация), авто-инжект; `resolveInput` покрыт юнит-тестами (device-ref valid/invalid, null в onDisconnect, isValid-предикат).
- [ ] `getMicrophone` через `audio-engine` enumerate (без второго AudioContext); set в переменную `Microphone`.
- [ ] Пуск гаснет по online-presence в списке устройств и в борде.
- [ ] CI: lint/typecheck/test затронутых пакетов; pre-run валидация Event-as-entry + типы data-цепочек.
- [ ] Эпик-промпт `docs/prompts/DEVICE_BOARD_REFACTOR_V04_EPIC_PROMPT.md` + запись в `docs/tasks/registry.json` (**7 фаз DBR0–DBR6**, Event и dataflow-резолюция разведены).

---

*Реплик в диалоге: 28; каждый участник высказался не менее одного раза.*
