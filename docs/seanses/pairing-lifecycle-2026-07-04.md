# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-04T14:24:15.660Z |
| Команда | `yarn consilium` |
| Модель | claude-haiku-4-5-20251001 |
| Файл | `docs/seanses/pairing-lifecycle-2026-07-04.md` |
| Порядок ролей | Математик → Верстальщик → Структурщик → Teamlead → Музыкант |
| Повестка | `docs/PAIRING_LIFECYCLE_BRIEF.md` |

**Вопрос:**

Сплани спринт: presence-снапшот при подключении кабинета (узел висит offline после пейринга) + жизненный цикл сопряжения ключ/устройство. Реши P1-P5/OQ1-OQ7: снапшот присутствия (контракт core, in-memory vs heartbeat), очистка Device.pairedKeyId при отзыве, 'Удалить'=revoke+delete одной кнопкой на активном ключе (решение владельца), пересечение с capture tariff v2, тесты/smoke связки client-cabinet.

---

# Консилиум: presence-снапшот и жизненный цикл сопряжения

**Повестка:** Узел после пейринга ключом остаётся offline в кабинете, хотя связан и активен. Требуется реализовать presence-снапшот при подключении кабинета, корректную очистку `Device.pairedKeyId` при отзыве ключа и UX «Удалить» = revoke+delete одной кнопкой, включая активные ключи.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Математик → Верстальщик → Структурщик → Teamlead → Музыкант (циклически)

---

[Математик]: Вопрос о presence — это не вычисления, это инфраструктура и контракт синхронизации. Но ясно одно: если узел online в памяти сервера, а клиент не знает — нарушена консистентность. Наивный механизм «когда кабинет подключился» требует чёткого снапшота в момент регистрации. Вопрос OQ2 про heartbeat — если rely на in-memory `nodeSockets`, то рестарт сервера потеряет presence. Это боль.

[Верстальщик]: С точки зрения UI, сейчас состояние узла — это чистая guess по наличию событий. Пользователь видит лоадер вечный, потому что события не пришли до открытия вкладки. Нужен визуальный путь: если снапшот отдал узел как online, то сразу показываем статус, даже если live-событие задерживается. Кнопка «Удалить» ключа — текущая логика двухшаговая (revoke в кабинете, потом delete отдельно). Давайте очистим до одной кнопки с прогрессом в диалоге: «Удаление отзовёт сеанс узла и удалит ключ» — честно и просто.

[Структурщик]: Упорядочу архитектуру. OQ1: контракт presence — предлагаю **новый тип сообщения** `presence.snapshot: { onlineDeviceIds: string[] }`, отправляемый **один раз** при `registerCabinet`, отдельно от stream `presence.nodeOnline/Offline`. Это чище, чем N событий одного типа, и идемпотентно: клиент seeding стор один раз. OQ2: источник истины — **in-memory `nodeSockets`** остаётся основным (быстро, по ТЗ); но `Device.lastSeenAt` обновляем на heartbeat узла (каждые 30–60 сек), чтобы после рестарта сервера кабинет читал REST и видел узлы, которые только что были active. Heartbeat — лёгкий пинг от узла каждые 2 мин, обновляет `lastSeenAt`; не заменяет presence-stream. При рестарте в `registerCabinet` читаем узлы с `lastSeenAt > now - 5м` как потенциально online; live-уточнение по WS придёт в течение пары минут.

[Teamlead]: Структурщик прав — двухслойная presence (in-memory + lastSeenAt для восстановления) избегает полной потери состояния. Но это усложнение. Стандартное решение в SPA — Redis presence или Postgres listen; у нас есть in-memory, достаточно для MVP. OQ3 про `pairedKeyId` при revoke: логично **не чистить** `pairedKeyId` сразу, а добавить флаг `Device.pairingStatus: 'paired' | 'revoked' | 'unpaired'`. Тогда `getPairStatus` честно отвечает «последний сопряжённый ключ был ID-X, но он отозван; переподключитесь с новым». Это важно для диагностики оператора. Отвязку ключ→device обрабатываем как смену статуса, не удаление данных.

[Музыкант]: Ловлю пересечение с tariff v2 и захватом. Если узел под захватом сервера, ключ отзывают — то сессия узла рвётся (уже правильно в коде), и узел не может продолжать передавать audio. Автоматически `boardLeaseBridge` должен видеть разрыв `PairedNodeCredentials` и отпустить capture (TTL-сценарий). Это уже в коде благодаря `notifySessionInvalidated`. Но надо тестом проверить race-condition: ключ отозвали → узел получил invalidate → lease ещё активна, но данные не идут. При next heartbeat / capture-check кабинет видит, что сессия дохла, и освобождает. Тесты должны покрыть этот путь.

[Математик]: Возвращаюсь к простоте. OQ2 решение (lastSeenAt + heartbeat) — звучит правильно, но добавляет логику. Предлагаю минимум: in-memory presence + **снапшот при подключении** (P1). Heartbeat — отодвигаем на следующий спринт, если окажется проблема после рестартов. Сейчас — просто гарантируем, что кабинет всегда получает список узлов, которые **в этой сессии** server увидел как online.

[Верстальщик]: На UI я реагирую на два сигнала: (1) presence-событие в stream, (2) снапшот при load. Первый — real-time, второй — bootstrap. Не важно откуда пришла истина, важно что клиент правильно отрендерит. Логика: `seeding(snapshot) && subscribe(stream) → state`. На кнопке «Удалить» ключ: добавляю подтверждение, в котором видна информация ключа (имя, дата, статус). После клика — spinner на кнопке, затем либо успех (список обновляется), либо ошибка с retry. `aria-live` на сообщение о результате.

[Структурщик]: Уточню P2–P3. **P2 (очистка `pairedKeyId`)**: в момент revoke выполняем UPDATE `Device` SET `pairingStatus = 'revoked'`, НЕ трогаем `pairedKeyId` (для истории). **P3 (delete-active)**: `deleteAccessKey` проверяет, активен ли ключ; если да — сначала `revokeAccessKey` (notify узла), затем delete из DB. Узел получает `notifySessionInvalidated('revoked')`, чистит credentials, диалог показывает. На кабинете single button «Удалить»; backend обрабатывает как две операции.

[Teamlead]: OQ4 про FK и каскад: **`Device.pairedKeyId` → `NodeAccessKey`** остаётся как foreign key с **SET NULL** при удалении ключа. Но логически: если ключ удалён, то `pairedKeyId` NULL, что означает не сопряжено. Это тоже работает. Подтверждение на delete — **показываем имя узла + последний ключ + текст «это разорвёт соединение»**. Достаточно для осознанности оператора, но не overprotect.

[Музыкант]: OQ5 окончательно: узел под захватом, ключ отзывают. Узел получает invalidate, чистит credentials, при next heartbeat capture-lease-bridge видит, что credentials dead, и отпускает capture (через TTL или явный stop). **Вариант: узел при invalidate должен сам вызвать `releaseCapture()` по WS?** Это более явно и быстро. Нужна ли эта оптимизация?

[Математик]: На вопрос музыканта: если узел знает, что credentials разорвались, то логично **узел сам отпускает захват** в `handlePairingInvalid`. Это гарантирует, что захват не зависает, даже если кабинет запаздывает. Добавляем: `if (boardLease.isActive) boardLease.release(fadeOutMs: 500)` перед удалением credentials. Тест: (1) захват активен, (2) revoke ключа, (3) узел получает invalidate, (4) capture отпущен на узле + notify кабинету, (5) кабинет видит release.

[Верстальщик]: На UI это означает: при alert о вытеснении (или отзыве ключа) узел исчезает из списка active в Device Board. Плавно, без skip. Если же поле ещё видим (второе окно), то статус меняется с «Захвачено» на «Отпущено». Индикаторы по `resolveDeviceCaptureFlags()` обновятся автоматически; я буду слушать store.

[Структурщик]: Уточню контракты для core. Новые типы для presence:

```typescript
// в @membrana/core
interface PresenceSnapshot {
  type: 'snapshot';
  onlineDeviceIds: string[];
  timestampMs: number;
}

interface PairingStatus {
  paired | revoked | unpaired;
}

// Device в membrane-service
Device.pairingStatus: PairingStatus;
Device.pairedKeyId: string | null;
Device.lastSeenAt: Date; // обновляется на heartbeat узла
```

И контракт в `node-realtime.service`: `registerCabinet` → отправить `PresenceSnapshot` сразу в socket перед subscription на stream.

[Teamlead]: OQ7 про размер и фазы. Предлагаю спринт из **5 фаз**, 2–3 дня каждая:

| Фаза | Владелец | Задача | Размер |
|------|----------|--------|--------|
| P1 | Структурщик | Контракт presence.snapshot + `registerCabinet` отправляет снапшот | M |
| P2 | Структурщик | `Device.pairingStatus`, чистка в `revokeAccessKey` | S |
| P3 | Структурщик + Верстальщик | `deleteAccessKey` с auto-revoke; UI кнопка «Удалить» с диалогом | M |
| P4 | Музыкант | Auto-release capture при invalidate на узле; тест race | M |
| P5 | Структурщик + Верстальщик | Unit-тесты, контракт-тесты presence, smoke-runbook без оборудования | M |

Тестируемо программно всё кроме реального hardware-handshake. Ручной smoke — когда оборудование (конец июля). ТЗ у владельца — понял, что надо повторить узел+кабинет на одной машине (docker-compose или локально); контракт-тесты через WS-mock.

[Верстальщик]: OQ6 про UX. Кнопка «Удалить» в `KeysPage`:

```jsx
<button 
  onClick={() => openDeleteDialog(key)}
  disabled={key.isActive && !userConfirmed}
  className="btn btn-sm btn-error"
>
  Удалить
</button>

// Modal с текстом "Удаление отзовёт сеанс всех узлов, использующих этот ключ. Продолжить?"
// После submit: spinner, затем success-toast или error-alert
```

После успеха — список обновляется, ключ исчезает. Если ключ был сопряжён с узлом, то узел перейдёт в статус «Не подключён» в device-board (автоматически через store).

[Структурщик]: Согласен. Уточню Definition of Done спринта.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| **OQ1: тип снапшота presence** | Новый контрактный тип `PresenceSnapshot` (`type: 'snapshot'`, `onlineDeviceIds[]`, `timestampMs`); отправляется один раз при `registerCabinet` перед stream подписки |
| **OQ2: источник истины presence** | In-memory `nodeSockets` (основной), + `Device.lastSeenAt` обновляется на heartbeat узла (2 мин цикл); после рестарта сервера читаем узлы с `lastSeenAt > now - 5м` из REST + live-уточнение по WS. Heartbeat реализуем в этом спринте (лёгкий пинг от узла) |
| **OQ3: очистка `pairedKeyId` при revoke** | НЕ удаляем `pairedKeyId`, добавляем `Device.pairingStatus: 'paired' \| 'revoked' \| 'unpaired'`; при revoke → меняем статус на 'revoked'; для диагностики оператора |
| **OQ4: усиленное подтверждение delete** | Диалог показывает имя ключа, дату создания, текст «Удаление отзовёт сеанс узлов и удалит ключ»; достаточно для осознанности |
| **OQ5: capture при invalidate ключа** | Узел при `handlePairingInvalid` проверяет `boardLease.isActive` и вызывает `boardLease.release(fadeOutMs: 500)` перед удалением credentials; гарантирует освобождение захвата |
| **OQ6: UX кнопки delete** | Единая кнопка «Удалить» в `KeysPage`; открывает модальное подтверждение; после submit — spinner на кнопке, затем success (список обновляется) или error-alert; `aria-live` на уведомление |
| **OQ7: размер спринта и тесты** | 5 фаз (P1–P5), 2–3 дня каждая; программно тестируемо: unit (presence snapshot seeding, pairingStatus transition, auto-release), контракт-тесты presence через WS-mock; ручной smoke (без оборудования) — последовательность revoke/delete с логом; при наличии hardware (конец июля) — полная E2E |

**Definition of Done:**

1. **Контракты** (`@membrana/core`):
   - Новый тип `PresenceSnapshot` с `onlineDeviceIds`, `timestampMs`
   - `PairingStatus` enum (`paired | revoked | unpaired`)
   - Экспорт из `core/index.ts`

2. **Сервер (background-office / membrane-service)**:
   - `registerCabinet` отправляет `PresenceSnapshot` в socket перед stream-подпиской
   - `Device` добавлены поля: `pairingStatus`, `lastSeenAt`
   - `revokeAccessKey` → UPDATE `Device.pairingStatus = 'revoked'`
   - `deleteAccessKey` → если `key.isActive`, то revoke (notify узлам) → delete (no 409)
   - Узел heartbeat: каждые 120с отправляет пинг (e.g. `heartbeat { nodeId, timestampMs }`), сервер обновляет `Device.lastSeenAt`
   - Тесты: unit на presence snapshot, revoke/delete transitions, heartbeat; контракт-тесты через WS-mock

3. **Клиент (apps/cabinet / NodesPage)**:
   - Seeding `onlineDeviceIds` из snapshot при регистрации кабинета
   - Сохранение присутствия при реконнекте (не очищается, дополняется stream-событиями)
   - Кнопка «Удалить» ключа → диалог (имя ключа, дата, текст про отзыв) → API call `deleteAccessKey`
   - После успеха → список ключей обновляется, связанный узел переходит в статус offline/не сопряжено
   - Toast / alert с `aria-live` на результат

4. **Узел (nodeConnectionMode.ts / client side)**:
   - `handlePairingInvalid`: если `boardLease.isActive`, вызвать `boardLease.release(fadeOutMs: 500)` перед `clearCredentials`
   - Логирование событий (для smoke-runbook)

5. **Тесты** (в каждой фазе):
   - Unit: presence snapshot seeding, pairingStatus transitions
   - Integration (WS-mock): presence stream с snapshot, revoke/delete lifecycle
   - Capture race-test: узел под захватом → revoke ключа → тест, что capture отпущен
   - Smoke-runbook: последовательность шагов для ручного тестирования (curl / UI без оборудования)

6. **Документация**:
   - Обновить `ARCHITECTURE.md` §Presence (снапшот + heartbeat)
   - Update [`STUDIO_HOST_BRIDGE_CONTRACT.md`](./STUDIO_HOST_BRIDGE_CONTRACT.md) с новым контрактом `Device` и `PresenceSnapshot`
   - Smoke-runbook в `docs/seanses/pairing-lifecycle-smoke.md`

---

*Реплик в диалоге: 22; каждый участник высказался не менее одного раза.*
