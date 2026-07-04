# Бриф для консилиума — Presence-снапшот и жизненный цикл сопряжения по ключу

| Поле | Значение |
|------|----------|
| **Статус** | Бриф (вход в консилиум), не протокол |
| **Повод** | Тестирование связки client↔server (owner, 2026-07-04): узел после пейринга ключом остаётся **offline** в кабинете, хотя связан и активен. Плюс два требования владельца по жизненному циклу ключа/сопряжения |
| **Связано** | `db-sf-*` (device-board-server-first) · MP7b node-realtime · [`STUDIO_HOST_BRIDGE_CONTRACT.md`](./STUDIO_HOST_BRIDGE_CONTRACT.md) §1 DeviceHandle |
| **Предлагаемый slug** | `pairing-lifecycle` |

---

## Повестка

Привести presence и жизненный цикл сопряжения «узел ↔ ключ ↔ устройство» в согласованное, реального-времени состояние. Три связанных концерна, обнаруженных при тестировании.

---

## Факты репозитория (проверено 2026-07-04)

### Концерн 1 — Presence (offline-баг)

| Факт | Источник |
|------|----------|
| Online в кабинете = `runtime.isDeviceLive(deviceId)` = членство deviceId в `onlineDeviceIds` | `apps/cabinet/.../NodesPage.tsx:260`, `useCabinetNodeRuntime.ts:123` |
| `onlineDeviceIds` стартует **пустым**, наполняется только событиями `presence.nodeOnline`, **обнуляется** при `disconnected`/`connecting` | `useCabinetNodeRuntime.ts:51,61-63,70-76` |
| Сервер шлёт `nodeOnline` только в момент подключения узла и только **уже подключённым** кабинетам (`fanOutToCabinet`) | `node-realtime.service.ts:33-47` |
| `registerCabinet` при подключении кабинета **не отдаёт снапшот** уже-онлайн узлов | `node-realtime.service.ts:49-56` |
| REST списка узлов отдаёт `lastSeenAt`, **без флага online** | `membrane.service.ts:serializeNode` |

**Итог:** нет снапшота присутствия при подключении/реконнекте кабинета → узел, связавшийся до открытия/обновления страницы кабинета, висит offline.

### Концерн 2 — Требование A: узел пишет, каким ключом и с каким устройством сопряжён

| Факт | Источник |
|------|----------|
| Сервер при пейринге сохраняет `Device.pairedKeyId`, `mediaDeviceId`, `lastPairSessionToken` | `pair.service.ts:70,81,98` |
| Клиент персистит `pairedKeyId` + `deviceId` в `PairedNodeCredentials` | `pairingCredentials.ts:16`, `nodeConnectionMode.ts:13` |

**Итог:** по сути **уже реализовано**; вопрос консилиуму — нужна ли поверхность (показать в кабинете, каким ключом сопряжено устройство) и/или гарантии/тесты.

### Концерн 3 — Требование B: удаление ключа → мгновенная отвязка (ключ + устройство)

| Факт | Источник |
|------|----------|
| `revokeAccessKey` (активный ключ): удаляет сессию узла + `notifySessionInvalidated('revoked')` → узел по WS чистит сопряжение + диалог | `membrane.service.ts:217-242` → `nodeRealtimeHubBridge.ts:28` → `handlePairingInvalid` |
| **`Device.pairedKeyId` НЕ чистится** при revoke/delete | `membrane.service.ts:204-245, 271-287` |
| `deleteAccessKey` на **активном** ключе → 409 `Cannot delete active access key` | `membrane.service.ts:280-281` |
| UX: активный ключ → кнопка **«Отозвать»**; **«Удалить»** только для неактивного | `KeysPage.tsx:263-281` |
| Истёкший (не отозванный) ключ: узел узнаёт только через polling `getPairStatus` — real-time notify не шлётся | `pair.service.ts:117-168` |

**Итог:** revoke уже рвёт связь на узле в реальном времени, но (а) `pairedKeyId` на устройстве висит, (б) сценарий «удалить» двухшаговый.

---

## Решение владельца (вход, не обсуждается)

**Требование B, UX:** «Удалить» = **отзыв + удаление** одной кнопкой, доступной в т.ч. на активном ключе: revoke (real-time сессия узла + очистка `Device.pairedKeyId`) → удаление ключа из списка. Соответствует ожиданию «удалю → сразу отвяжется».

---

## Гипотеза скоупа

| # | Фаза | Суть |
|---|------|------|
| P1 | Presence-снапшот | Сервер: `registerCabinet` отдаёт снапшот онлайн-узлов membrane (из `nodeSockets`). Клиент: seeding `onlineDeviceIds` из снапшота; не терять при реконнекте. Возможно новый тип `presence.snapshot` в контракте `@membrana/core` |
| P2 | Device-level unbind | `revokeAccessKey`/новый путь: чистить `Device.pairedKeyId` (полная отвязка на уровне устройства); идемпотентно |
| P3 | «Удалить» = revoke+delete | Сервер `deleteAccessKey`: на активном ключе — revoke (notify + unbind) затем delete, без 409. Кабинет `KeysPage`: одна кнопка «Удалить» с подтверждением; real-time сброс |
| P4 | Требование A surface | (опц.) показать в кабинете сопряжённый ключ устройства; тесты на персист pairedKeyId |
| P5 | Тесты/smoke | Unit (presence snapshot, unbind, delete-active), контракт-тесты, ручной smoke связки |

---

## Открытые вопросы ролям

- **OQ1 (Структурщик).** P1: снапшот — новый тип `presence.snapshot` со списком deviceIds, или N× `presence.nodeOnline` новому кабинетному сокету? Что чище для контракта core и идемпотентности клиента?
- **OQ2 (Структурщик/Teamlead).** P1: где источник истины присутствия — только in-memory `nodeSockets` (переживает ли рестарт сервера?), или дополнять `Device.lastSeenAt`/heartbeat? Нужен ли периодический heartbeat узла для «залипших» сессий?
- **OQ3 (Teamlead).** P2: `revoke` чистит `pairedKeyId` — это меняет семантику `getPairStatus` (сейчас по `pairedKeyId` определяется `inactiveReason`). Не сломаем ли диагностику «почему отвязан»? Может, хранить `pairedKeyId` + отдельный флаг `unpaired`?
- **OQ4 (Teamlead).** P3: удаление активного ключа = необратимая отвязка рабочего узла. Нужно ли усиленное подтверждение (имя узла/ключа в диалоге)? Что с FK `Device.pairedKeyId` → `NodeAccessKey` при delete (SetNull/каскад/ручная очистка)?
- **OQ5 (Музыкант/Структурщик).** Инвариант захвата (tariff v2): если узел под захватом сервера, а ключ отзывают — сессия рвётся; корректно ли отпускается capture (TTL) и не зависает ли ведомость? Пересечение с `boardLeaseBridge`.
- **OQ6 (Верстальщик).** P3 UX: единая «Удалить» с подтверждением поверх списка ключей; состояние «отозван/истёк» после действия; a11y.
- **OQ7 (Teamlead).** Размер/фазы, база ветки, порядок PR; что тестируемо программно, а что — ручной smoke связки (у оператора оборудование ~17.07, но связка client↔cabinet тестируется без полевого железа — подтвердить).

---

## Формат решения

- Таблица «Вопрос → Решение» по P1–P5 / OQ1–OQ7.
- Фазы спринта с владельцами/размерами; контрактные изменения core — явно.
- DoD спринта.

## Запуск

```bash
yarn consilium \
  --topic-file docs/PAIRING_LIFECYCLE_BRIEF.md \
  --save-as pairing-lifecycle \
  "Сплани спринт: presence-снапшот при подключении кабинета (узел висит offline после пейринга) \
   + жизненный цикл сопряжения ключ/устройство. Реши P1-P5/OQ1-OQ7: снапшот присутствия \
   (контракт core, in-memory vs heartbeat), очистка Device.pairedKeyId при отзыве, \
   'Удалить'=revoke+delete одной кнопкой на активном ключе (решение владельца), пересечение \
   с capture tariff v2, тесты/smoke связки client-cabinet."
```
