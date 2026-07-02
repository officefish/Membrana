# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-02T09:10:45.477Z |
| Команда | `yarn consilium` |
| Модель | claude-haiku-4-5-20251001 |
| Файл | `docs/seanses/device-board-capture-tariff-v2-2026-07-02.md` |
| Порядок ролей | Музыкант → Математик → Teamlead → Структурщик → Верстальщик |
| Повестка | `docs/DEVICE_BOARD_CAPTURE_TARIFF_BRIEF.md` |

**Вопрос:**

Переопредели модель server-first под тариф с явным захватом устройства (см. topic-file): явный двухшаговый захват вместо неявного run=capture; сервер умеет только выбрать+play+stop существующий сценарий; мягкий режим (клиент start/stop, без edit/pause) и жёсткий (полностью ведомый); вытеснение клиентского run при захвате (стоп + активный alert); enforcement тарифа server-side в gateway. Реши OQ1–OQ10 (включая emergency stop и offline auto-release при жёстком захвате), дай три оси v2 и DoD.

---

# Консилиум: Device-board capture tariff v2 — явный захват устройства

**Повестка:** Переопределение модели server-first под тариф с явным двухшаговым захватом устройства вместо неявного run=capture. Сервер получает право только на выбор и запуск существующих сценариев. Мягкий режим (клиент сохраняет start/stop) vs жёсткий (полностью ведомый, view-only). Вытеснение клиентского run при захвате с активным alert. Enforcement тарифа в gateway (whitelist команд), не в UI. Emergency stop и offline auto-release при потере соединения.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Математик → Teamlead → Структурщик → Верстальщик

---

[Музыкант]: Начнём с практической стороны: когда я захватываю устройство (жёсткий режим), клиент теряет соединение, а звук в девайсе уже играет — что происходит? Я слышу, как музыка крутится, но не могу её остановить даже питанием переключателя? Это выглядит как заклинивание. Нужен **локальный emergency stop**, который всегда доступен клиенту, даже в жёстком режиме, иначе девайс становится кирпичом.

[Математик]: Согласен с риском. Это SCADA-паттерн: безопасность критична. Предлагаю разделить: **жёсткий захват** блокирует `setScenario` и `run` через WS, но **локальный hardwire-stop** (кнопка на девайсе или ёмкостной сенсор) должен **всегда** прерывать звук, независимо от режима. На ПО уровне: в `audio-engine` оставляем инвариант — `stop()` выполняется сразу, без проверки `authority`. Статус захвата — только флаг `isRemoteControlled`, не блокировка функции.

[Teamlead]: Правильная логика. Жёсткий режим — это **ограничение WS-команд** (gateway whitelist), не физический lock на движках. Инвариант: **`stop()` никогда не требует разрешения**. Это уходит в `DEVICE_BOARD_SERVER_FIRST.md` v2.0 явным текстом. Музыкант, мотай на ушах: **emergency stop = всегда доступен**, даже при `authority=cabinet` и `followerMode=hard`. Это условие OQ10 (а). Матвей, переходим к захвату: двухшаговая модель. Нужна новая сущность?

[Структурщик]: Да, новая сущность: **`deviceCapture`** (отдельно от `editLease`). Три оси у нас сейчас есть: edit-lease, authority, followerMode. Добавляем четвёртую: **capture-state = { holder, mode, sessionId, expiresAt, acquiredAt }**. `holder` может быть `null` (отпущено) или `'cabinet'` (вот тут я впервые прошу: `field` — это клиент? Или `field` — это физический девайс, а `cabinet` — облако?). Уточним терминологию по (OQ9).

[Верстальщик]: Терминология — критична для UI. Сейчас в коде `authority` может быть `'cabinet'` или `'field'`. Я читаю это как: кабинет (облако) vs поле (локальный клиент). Так? Если так, то индикатор: на борде и на NodesPage баджик с текстом. Мягкий режим `soft` → badge `badge-info` «Захват: мягкий», жёсткий `hard` → badge `badge-warning` «Захват: жёсткий». Плюс `aria-live="polite"` на смену захвата — алерт для screen-reader'ов. Но дизайн `DESIGN.md` нужно обновить.

[Музыкант]: Подожди, я про режимы. Мягкий режим: клиент может запускать и останавливать **свои** сценарии, или он вообще заблокирован? OQ4 говорит: при мягком захвате клиент может запускать и останавливать. Но что если одновременно? Сервер отправляет `selectScenario('melody.db')` + `run`, клиент в этот же момент жмёт play на своём редакторе? Два сценария крутятся? Одно вытесняет другое?

[Математик]: Правило разрешения конфликта: **последний `run` побеждает**. Если клиент запустил сценарий A, потом сервер отправляет `selectScenario('B')` + `run`, то B стартует и A автоматически стопится (через `stop()` перед `run`). При обратном порядке: клиент start B, потом сервер start A — A побеждает, B стоп. Это логично и детерминировано. Однако: при жёстком режиме (**OQ4 уточняет: `authority` остаётся `cabinet` при мягком захвате**) клиент **не может** запускать вообще; сервер полный контроль. Итак: мягкий = конкуренция с приоритетом last-write-win; жёсткий = only-server-can-run.

[Teamlead]: Стоп. OQ4 спрашивает, остаётся ли `authority=cabinet` при мягком захвате. Ответ: **да**. `authority` — это глобальное состояние: либо `cabinet`, либо `field` (клиент, поле). Когда захват мягкий, `authority=cabinet`, но операции **ограничены**. Когда жёсткий, `authority=cabinet` и операции **ещё более** ограничены. Сегда: `capture-state.mode` (soft/hard) + `authority` (cabinet/field) = два измерения контроля. Без захвата: `capture-state.holder=null`, `authority=field` (клиент полностью автономен).

[Структурщик]: Значит, три оси v2:
1. **`editLease`** → `{ holder: 'cabinet'|'field'|null, ... }` (как было в v1)
2. **`capture`** → `{ holder: 'cabinet'|null, mode: 'soft'|'hard'|null, sessionId, expiresAt }` (новое)
3. **`authority`** → `'cabinet'|'field'` (осталась)

Без захвата: `capture.holder=null`, поле автономно, может редактировать и запускать свои сценарии. После захвата мягко: `capture.holder='cabinet'`, `capture.mode='soft'`, клиент может start/stop, но не редактировать. После жёсткого: `capture.mode='hard'`, клиент — view-only. Правильно?

[Верстальщик]: Хм, но тогда непонятно: если клиент автономен (`capture.holder=null`, `authority=field`), может ли он редактировать сценарий? Или `editLease` отдельная ось? Я вижу: `editLease.holder='field'` — клиент захватил право на редактирование, может edit. `editLease.holder=null` — никто не редактирует, но можно запускать. `editLease.holder='cabinet'` — ~~кабинет редактирует~~ (это следующий тариф, OQ1). Получается, в v2 `editLease` **не используется** вообще?

[Музыкант]: Точно! OQ1 спрашивает: удалять v1-код (edit-lease + pause + setMode) или прятать за флаг тарифа? Если мы **не реализуем** edit-lease в v2, то можем либо удалить из кода, либо оставить (но API не выставляем, тесты не пишем). На уровне wire и gateway — полностью заблокировать. На уровне коммита — оставить как commented-out или в отдельной ветке. Но это решение для Teamlead (OQ1).

[Математик]: А паузу? В v1 была pause/resume. OQ4 говорит, что в тарифе v2 паузы нет. Значит, только stop и play? Нет промежуточного pause-состояния звука? Музыкант, для твоего DSP-потока — есть ли разница между pause и stop? Или паузу просто эмулируем через stop-replay?

[Музыкант]: Паузу в контексте девайса с микроконтроллером сложно держать состоянием. Память, питание, синхронизация времени — всё завязано. Практичнее: **stop = full reset** (очистить буферы, синхронизацию), и при повторном `run` — новая инициализация. Пауза требует сохранения состояния на диск, это следующий тариф (когда редактирование). В v2 — **только stop/play**, пауза = stop.

[Teamlead]: Хорошо, v2 не имеет pause-функции. Удаляем `pause`, `resume`, `setMode` из wire для этого тарифа. Структурщик, это уходит в gateway whitelist (OQ8)?

[Структурщик]: Да. Wire (канал `runtime`): whitelist команд по тарифу `tariff.maxCapabilitySet`:
- `v2-capture-soft`: `['selectScenario', 'run', 'stop']`
- `v2-capture-hard`: `['stop']` (только emergency stop)
- (будущий v3-paused: `['selectScenario', 'run', 'stop', 'pause', 'resume', 'setMode']`)

Gateway в `background-office` проверяет: входящая команда в whitelist? Да → forward на девайс; нет → reject с 403. UI может предложить кнопку, но её нажатие отклонится на сервере.

[Верстальщик]: Это значит, что DESIGN.md обновляется: на борде `NodesPage` показываем статус захвата и в зависимости от `capture.mode` либо показываем кнопки play/stop (soft), либо прячем управление вообще (hard). Но кнопки — просто UI; настоящий контроль — в gateway. Я добавляю в `DESIGN.md` секцию про device capture indicator и follower buttons.

[Музыкант]: Окей, теперь вытеснение (OQ8, D8). Когда сервер захватывает устройство жёстко и клиент **в этот момент крутит свой сценарий** (он был в `authority=field`, played локально), сервер должен: (а) отправить `stop` девайсу (немедленный halt), (б) уведомить клиент о захвате. Уведомление: toast или modal? DESIGN.md говорит про alert.

[Верстальщик]: Modal с `alert alert-warning`: заголовок «Сервер захватил управление», подпись «Текущий сценарий остановлен. Устройство переходит в режим ведомого». Кнопка ОК. При закрытии модали — индикатор статуса обновляется (badge). `aria-modal="true"`, focus-trap. Не modal? Toast с `duration=0` (пока не закроет вручную) и кнопкой «ОК». Музыкант, что проще звуком? Ты кипят?

[Музыкант]: Тост лучше — не отвлекает от UI. Modal может испугать. Тост `alert-warning`, слева иконка (`⚠`), текст, кнопка close (`×`). И да, звук: если в этот момент играет что-то, **немедленный fade-out (200 ms) + stop**, не hard-cut. Это предусмотрено в audio-engine?

[Математик]: В `audio-engine` есть `fadeOut(duration)` перед `stop()`? Или это обвязка в `runtime`-канале сервера? Мне кажется, `runtime` должен в команде `stop` передать флаг `fadeOut=200`, и engine это обработает. Тогда звук мягко замолчит, юзер не испугается hard-cut. Это в контракт `command.stop` добавляем.

[Teamlead]: Контракт `command.stop`:
```ts
{ 
  action: 'stop',
  fadeOutMs?: number  // 0 = hard-cut (emergency), 200+ = graceful
}
```
При вытеснении: `fadeOutMs=200`. При emergency stop клиента: `fadeOutMs=0`. Явно, детерминировано. Это идёт в `ARCHITECTURE.md` (контракты audio-engine).

[Структурщик]: Хорошо, но как **сервер узнаёт, что клиент сейчас запустил сценарий и нужно его вытеснить**? Через WS-уведомление? Клиент отправляет `{ action: 'run', scenarioId }`, сервер слышит через `board` канал, и если `capture.holder='cabinet'` с `mode='hard'` — **вежливо** останавливает, или это должно произойти на клиенте?

[Математик]: На клиенте должна быть локальная проверка: **перед `run`** клиент проверяет `capture.holder` из store. Если `holder='cabinet'` и `mode='hard'` — не вызывает `run` вообще (кнопка плана заблокирована). Если клиент всё же попытается (скажем, API вызовет напрямую), сервер **перехватит и отправит `stop`** как упреждение. Но нормально это работает, если UI и store синхронизированы.

[Verстальщик]: Синхронизация захвата в store: когда сервер отправляет `{ action: 'capture', mode: 'soft', ... }` на WS-канале `board`, клиент обновляет Zustand-store `useMembranaStore.setState({ device: { ...old, capture: { holder: 'cabinet', mode: 'soft', ... } } })`. Компоненты с `useMembranaStore(s => s.device.capture)` переренлерятся. Кнопка play отключается условной `disabled={capture.mode === 'hard'}`. Правильно?

[Музыкант]: Да, но есть race condition: WS-сообщение `capture` приходит с задержкой (сетевой latency), клиент может нажать play **ДО** обновления store. Поэтому: (1) UI предварительно блокирует кнопку (`optimistic`), (2) даже если юзер как-то нажмёт, send запроса → сервер reject с 403. Двойная защита.

[Teamlead]: OQ5: Семантика `release` (развязка захвата). Когда сервер отправляет `{ action: 'release' }`, клиент возвращается в `authority=field`, `capture.holder=null`. Если в этот момент **сервер запустил сценарий и он всё ещё играет** — он **продолжает играть на клиенте до локального stop**. Иначе release = принудительный стоп, что странно (сервер отпустил, но сценарий рухнул). Уточним: при `release`, звук **продолжает играть**, если уже был запущен.

[Структурщик]: Согласен. `release` — это **отпущение управления**, не стоп. Клиент вновь может редактировать (если `editLease.holder=null`). Уведомление клиенту: тост `alert-info` «Управление устройством отпущено». Это в контракт `board.release` добавляем.

[Музыкант]: Автоматический release по TTL (OQ10(б))? Если сервер отправил `capture { expiresAt: time }` и не обновляет heartbeat, девайс по истечении TTL **самостоятельно выходит из режима ведомого**? Или ждёт явной `release`? Практика: MQTT и IoT часто используют TTL. Рекомендация: **yes to TTL auto-release**, default 5 мин. Если WS потеряется, через 5 мин клиент снова автономен.

[Математик]: OQ10(б): auto-release по потере соединения? Или по TTL? Два сценария:
1. Сервер и клиент оба живы, но WS-соединение разорвано. Клиент **не знает**, жив ли сервер. По TTL (5 мин) клиент выходит из режима ведомого.
2. Сервер растерял сессию / перезагрузился. Новое WS-соединение, но `sessionId` мёртв. Клиент должен получить `{ action: 'release', reason: 'server-restart' }` или автоматически выйти?

Предложение: **TTL + graceful reconnect**. При разрыве WS клиент стартует таймер (5 мин). По окончании — `capture.holder=null`, режим отпущен. Если WS восстановилось раньше TTL — таймер сбрасывается. Если сервер был перезагружен, при reconnect отправляет `release` или подтверждает старый `sessionId`.

[Teamlead]: Хорошо. Это уходит в определение `captureSession`:
```ts
{
  holder: 'cabinet' | null,
  mode: 'soft' | 'hard' | null,
  sessionId: UUID,
  acquiredAt: ISO8601,
  expiresAt: ISO8601,  // TTL + 5 min, обновляется при heartbeat
}
```

Heartbeat сервера: каждые 2 мин отправляет `{ action: 'heartbeat', sessionId, expiresAt: now + 5min }`. Клиент: если не слышит heartbeat 5 мин → auto-release, `capture.holder=null`. Это критично для OQ10(б). Уходит в `background-office` логику и wire-контракт.

[Структурщик]: Логика в `background-office`:
```ts
async captureDevice(nodeId, mode) {
  const session = { 
    sessionId: uuid(), 
    acquiredAt: now(),
    expiresAt: now() + 5min 
  };
  await db.update(NodeDevice, { capture: session });
  ws.broadcast({ action: 'capture', ...session });
  startHeartbeat(nodeId, sessionId, 2min);
}

async releaseDevice(nodeId, sessionId) {
  await db.update(NodeDevice, { capture: null });
  ws.broadcast({ action: 'release', nodeId });
  stopHeartbeat(nodeId, sessionId);
}
```

И таймер на сервере: если heartbeat не подтверждён за TTL — mark as expired, next heartbeat откажет в renew, режим отпускается автоматически.

[Верстальщик]: На UI: индикатор `capture.holder` обновляется по WS. Есть ещё один кейс: если WS потеряна и нет heartbeat, но TTL истекает только через 5 мин — на этот момент UI должен показать `⏳ Соединение потеряно, управление будет отпущено в XX:XX`. Динамический countdownниже баджа? Или просто `badge-warning` без countdownа?

[Музыкант]: Countdowna не нужен, это паника юзеру. Просто `badge badge-warning` «Соединение потеряно». Если оно восстановилось раньше TTL — badge исчезает, всё ОК. Если TTL истек — автоматический `release`, UI обновляется в `field`-режим.

[Teamlead]: Окей. Теперь OQ2 (OQ3 уже решена): канал `board` переиспользуем или новый канал? Предложение: **переиспользуем `board`**, добавляем event type `capture` рядом с `edit-lease`. Логика в одном месте. Wire payload:
```ts
board.event:
  | { type: 'edit-lease', holder, ... }
  | { type: 'capture', holder, mode, sessionId, expiresAt, reason? }
  | { type: 'release', reason? }
```

Структурщик, согласен?

[Структурщик]: Да, логично. `board` — это сущность девайса, её состояние управления. `edit-lease` и `capture` — две оси одного состояния. Канал один, event-type дифференцирует.

[Verстальщик]: DESIGN.md обновляем:
- Секция Device Capture State: баджик и текстовое описание.
- Таблица состояний: `holder=null` (Отпущено, серый) → `holder='cabinet', mode='soft'` (Захват: мягкий, info) → `holder='cabinet', mode='hard'` (Захват: жёсткий, warning).
- Кнопка play/stop доступна только при `mode!='hard'`.
- Alert при вытеснении: `alert alert-warning` с текстом и иконкой.
- Когда TTL истекает и нет heartbeat: `badge badge-warning` «Соединение потеряно» временно.

Ладно, рассчитываю на одобрение.

[Музыкант]: Погодите, я про OQ6: выбор сценария. Сервер отправляет `{ action: 'selectScenario', scenarioId }`. Откуда сервер знает ID сценария? Он читает список пользовательских сценариев откуда — из registry на девайсе или из журнала кабинета? Если из кабинета, это требует синхронизации: клиент создаёт сценарий на девайсе → автоматически регистрируется в кабинете? Или сценарий создаётся только в кабинете и синхром на девайс?

[Математик]: Текущая архитектура (`ARCHITECTURE.md`): сценарий — это JSON в `device-board`. Клиент может создавать, редактировать, удалять **локально** (в `scenario.json` на девайсе). Кабинет (background-office) имеет доступ к **публичному** API девайса: может прочитать список существующих сценариев, но не может редактировать. Для OQ6: сервер при захвате читает список сценариев с девайса через `getScenarios()` и предлагает выбрать. Это read-only path, без создания/редактирования.

[Структурщик]: Согласен. В контрактах `device-runtime`:
```ts
getScenarios(): Promise<Scenario[]>;  // read-only, список
selectScenario(id: string): Promise<void>;
run(scenarioId: string): Promise<void>;  // запустить выбранный
```

Сервер (`background-office`) может вызвать `getScenarios()`, получить список (с ID, именем, меткой, приоритетом из JSON), UI кабинета показывает dropdown, оператор выбирает, сервер отправляет `selectScenario(id)` + `run(id)`.

[Teamlead]: Хорошо, OQ6 решена: read-only path для сценариев, список читается через API, без права на создание. Это идёт в `ARCHITECTURE.md` как требование для v2. OQ9: терминология. Текущие `soft`/`hard` — оставляем? Или переименовываем?

[Верстальщик]: На UI я использую слова на русском: «Захват: мягкий» / «Захват: жёсткий». На коде — англ `mode: 'soft' | 'hard'`. Это нормально, асимметрия есть. `followerMode` (если оставим для будущих версий) → переименовать в `captureMode` для ясности?

[Музыкант]: Нет переименований в v2, только удаления. `followerMode` в коде существует в v1, но в v2 его нет (заменён на `capture.mode`). Чтобы не путаться: в v2 **только** `capture` с `mode`, никакого `followerMode`. Старое имя — в архиве / комментарии.

[Teamlead]: ОК. OQ1 (окончательно): удалять или гейтить код v1 (edit-lease, pause, setMode)? Решение: **удалять из wire и gateway, оставить в коде как commented-out с комментарием `// Tariff v3: edit-lease, pause/resume, setMode`**. Код не компилируется сейчас, но гит-история сохраняется. На боранча `vesnin` (Teamlead) создаём task `db-tariff-v2-code-cleanup`, где перечисляем, что удалить/закомментировать. Структурщик, согласен?

[Структурщик]: Да. Список для cleanup (task `db-tariff-v2-code-cleanup`):
- `background-office`: gateway whitelist (удалить `pause`, `resume`, `setMode`).
- `device-runtime` wire: удалить events `pause`, `resume`, `setMode`.
- `audio-engine`: если есть метод `pause()`/`resume()` на публичном API → закомментировать с TODO.
- `apps/client` компоненты (NodesPage): кнопка pause → скрыть (commented-out).
- Тесты: mock tests для pause → skip с пометкой `tariff=v3`.

[Верстальщик]: И DESIGN.md обновляем: **Таблица Device Capture State** с трёмя состояниями, **Device Capture Indicator** — как выглядит баджик и где (NodesPage + board), **Alert on Pre-emption** — модальный alert при вытеснении.

[Музыкант]: Финальный чек: **emergency stop** (OQ10 подтверждение). Даже при жёстком захвате (`capture.mode='hard'`), клиент может в любой момент нажать **локальную кнопку stop** (hardware или UI-кнопка без WS), и звук останавливается. Это предусмотрено в `audio-engine`, right?

[Математик]: Правильно. `audio-engine.stop()` — это **функция без проверки permissions**. Всегда доступна, всегда работает. На уровне `audio-engine` нет concepts like `isRemoteControlled` или `followerMode`. Эти флаги — только для UI (блокировка кнопок) и для wire-gateway (блокировка команд). Само ядро дышит свободно.

[Teamlead]: Итак, **три оси v2** (финальный вердикт):

| Ось | Значение | Назначение |
|-----|----------|-----------|
| **`capture`** | `{ holder: 'cabinet'\|null, mode: 'soft'\|'hard'\|null, sessionId, acquiredAt, expiresAt }` | Управление устройством сервером (новое) |
| **`authority`** | `'cabinet'\|'field'` | Чья последняя команда выполнялась (сохранено) |
| **`editLease`** | УДАЛЕНО в v2 (будущий v3) | — |

Состояния:
- **Автономия**: `capture.holder=null` → клиент управляет, может редактировать (когда v3), запускать/останавливать.
- **Захват мягкий**: `capture.holder='cabinet'`, `capture.mode='soft'` → клиент может start/stop, но не редактировать.
- **Захват жёсткий**: `capture.holder='cabinet'`, `capture.mode='hard'` → клиент view-only, только stop (emergency).

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| **OQ1**: Удалять или гейтить v1-код? | **Удалить из wire/gateway, закомментировать в коде** с пометкой `// Tariff v3`. Task `db-tariff-v2-code-cleanup` (Структурщик). |
| **OQ2**: Новый lease на оси runtime или новое событие `board.capture`? | **Event type `capture` на канале `board`** (переиспользуем). Одна логика, one source of truth. |
| **OQ3**: Жёсткий стоп или graceful fade при вытеснении? | **Graceful fade-out 200ms** перед стопом (команда `stop { fadeOutMs: 200 }`); emergency stop клиента = `fadeOutMs: 0` (hard-cut). |
| **OQ4**: При мягком захвате конкуренция run-команд, правило? | **Last-write-win**: последний `run` (с какой стороны) побеждает, другой сценарий стопится. Мягкий режим = возможна конкуренция. Жёсткий = только сервер может `run`. |
| **OQ5**: Семантика `release` и авто-release? | **`release` = отпущение управления**, звук продолжает играть если был запущен. **TTL auto-release**: heartbeat сервера каждые 2 мин, TTL 5 мин, при потере соединения клиент выходит из режима ведомого. |
| **OQ6**: Выбор сценария — откуда сервер читает список? | **Read-only `getScenarios()` API** на девайсе; сервер читает список, UI выбирает, сервер отправляет `selectScenario(id)`. Без права на создание/редактирование. |
| **OQ7**: Индикация захвата — layout и a11y? | **Badge на NodesPage и board**: `badge-info` для soft, `badge-warning` для hard. `aria-live="polite"` на смену. Alert при вытеснении: `alert alert-warning` с текстом и иконкой. DESIGN.md обновляем. |
| **OQ8**: Wire-контракт команд по тарифу? | **Gateway whitelist по `tariff.maxCapabilitySet`**: `v2-capture-soft=['selectScenario','run','stop']`, `v2-capture-hard=['stop']`. Enforcement server-side в `background-office`. |
| **OQ9**: Терминология — переименовать `followerMode` → `captureMode`? | **Нет переименований в v2**, только удаления. В v2: **только `capture.mode`** (`soft`\|`hard`), никакого `followerMode`. Старое имя — в архиве. |
| **OQ10(a)**: Emergency stop при жёстком захвате? | **`stop()` всегда доступен клиенту**, даже при `capture.mode='hard'`. Инвариант: no permissions check на уровне `audio-engine`. Это декларируем в ARCHITECTURE.md явно. |
| **OQ10(b)**: Auto-release при потере соединения? | **TTL + graceful reconnect**: heartbeat каждые 2 мин, TTL 5 мин. При разрыве WS клиент считает дни; если 5 мин без heartbeat → `capture.holder=null`. Восстановление соединения сбрасывает таймер. |

---

## Definition of Done

**Спринт `db-capture-tariff-v2` (фазы SF0–SF9 аналогия):**

### SF0: Gateway whitelist & wire contract
- [ ] `background-office/gateway.ts`: whitelist команд по `tariff.maxCapabilitySet`.
- [ ] Wire контракт `board.event`: `{ type: 'capture'|'release', ... }` + `command.stop { fadeOutMs }`.
- [ ] Tests: whitelist rejection при недопустимой команде (мягкий режим + pause → 403).

### SF1: Capture lifecycle на сервере
- [ ] `background-office/NodeDeviceService.ts`: методы `capture(nodeId, mode)`, `release(nodeId)`, `heartbeat(sessionId)`.
- [ ] Heartbeat loop: каждые 2 мин обновляет `expiresAt`, WS-broadcast.
- [ ] TTL auto-release: таймер на сервере, mark expired, next heartbeat откажет.
- [ ] Tests: mock WS, verify heartbeat intervals, TTL expiry.

### SF2: Client-side capture state & store
- [ ] `useMembranaStore`: добавляем `device.capture: { holder, mode, sessionId, expiresAt }`.
- [ ] WS-listener на `board.event` type `'capture'|'release'` → обновляет store.
- [ ] TTL countdown на клиенте: при потере heartbeat, таймер 5 мин до auto-release.
- [ ] Tests: mock WS events, store updates correctly.

### SF3: UI blocking & indicators (NodesPage, board)
- [ ] Badge `device-capture-status`: `holder=null` (gray), `soft` (info), `hard` (warning).
- [ ] Кнопки play/stop disabled при `mode='hard'`.
- [ ] Alert при вытеснении: `alert alert-warning` с текстом, backdrop-затемнение.
- [ ] `aria-live="polite"` на индикатор, screen-reader объявляет смену.
- [ ] Tests: snapshot DESIGN.md badge states.

### SF4: Graceful fade-out при вытеснении
- [ ] `audio-engine.stop(fadeOutMs)`: if fadeOutMs > 0, экспоненциальное затухание громкости перед стопом.
- [ ] Runtime-логика: при захвате жёстком → `stop({ fadeOutMs: 200 })`.
- [ ] Emergency stop клиента → `stop({ fadeOutMs: 0 })`.
- [ ] Tests: verify fade duration, audio level ramps.

### SF5: Last-write-win для конкуренции run
- [ ] Когда `run(scenarioId)` приходит с обеих сторон одновременно — **последний побеждает**.
- [ ] Реализация: `RunCommand.timestamp`, сравниваем, loser → `stop()`.
- [ ] Логика в `device-runtime` или `audio-engine`?
- [ ] Tests: race conditions, verify winner scenario plays.

### SF6: Read-only `getScenarios()` API
- [ ] `device-runtime` контракт: `getScenarios(): Scenario[]`.
- [ ] Cabinet UI (scenario selector): `onChange -> background-office -> getScenarios() -> dropdown list`.
- [ ] No write-methods для сценариев from cabinet в этом тарифе.
- [ ] Tests: verify list is readable, select works.

### SF7: Code cleanup (v1 artifact removal)
- [ ] `background-office`: удалить `pause`, `resume`, `setMode` из wire.
- [ ] `audio-engine`: закомментировать public `pause()`, `resume()` методы.
- [ ] `apps/client` NodesPage: скрыть pause-кнопку (commented-out).
- [ ] Git commit message: note "Tariff v3 support removed for v2 clean gate."

### SF8: DESIGN.md & ARCHITECTURE.md update
- [ ] DESIGN.md: +Device Capture State section (three badges), +Alert on pre-emption.
- [ ] ARCHITECTURE.md: §1 update (three axes v2), emergency stop invariant, tariff v2 whitelist.
- [ ] WHITE_PAPER.md: update stage-gate description for v2 soft/hard modes.

### SF9: Smoke test end-to-end
- [ ] Scenario: клиент автономен → сервер мягко захватывает → клиент может play/stop.
- [ ] Scenario: мягкий → жёсткий (переключение) → клиент заблокирован.
- [ ] Scenario: жёсткий, WS разорвалась → через 5 мин auto-release → клиент вновь автономен.
- [ ] Scenario: клиент запускает + сервер тут же жёсткий захват → стоп + alert + ведомость.

**Smoke checklist:**
- [ ] Базовый capture/release, heartbeat не разбивает логику.
- [ ] Gateway whitelist срабатывает (запрос pause при soft → 403).
- [ ] UI баджик и Alert отображаются корректно, a11y работает.
- [ ] Fade-out звук не режет резко.
- [ ] Нет race conditions в store при быстрых событиях WS.

---

*Реплик в диалоге: 48; каждый участник высказался не менее одного раза (все пять ролей присутствуют, более одной реплики у большинства).*
