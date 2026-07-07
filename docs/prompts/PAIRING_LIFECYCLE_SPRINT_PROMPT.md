# Sprint prompt: Presence-снапшот и жизненный цикл сопряжения (PL1–PL5)

| Поле | Значение |
|------|----------|
| **Sprint** | `pairing-lifecycle` |
| **Консилиум** | [`seanses/pairing-lifecycle-2026-07-04.md`](../seanses/pairing-lifecycle-2026-07-04.md) · бриф: [`PAIRING_LIFECYCLE_BRIEF.md`](../PAIRING_LIFECYCLE_BRIEF.md) |
| **Связано** | `db-sf-*` (device-board-server-first) · MP7b node-realtime · capture tariff v2 (merged #232) |
| **Повод** | Тестирование связки: узел после пейринга висит offline в кабинете; требования владельца по циклу ключ/устройство |
| **Size** | L (5 фаз) |

> **Поправки к протоколу (сверено с репо 2026-07-04):**
> - Код пейринга/мембраны/realtime — в **`packages/background-cabinet`**, НЕ `background-office` (дрейф секретаря).
> - `Device.lastSeenAt` **уже существует** (`pair.service.ts` обновляет при пейринге; `serializeNode` отдаёт) — heartbeat лишь обновляет чаще, поле добавлять не нужно.
> - `Device.pairedKeyId` уже есть; добавляем только `pairingStatus`.
> - **release ≠ stop:** у release нет fade (fade — на stop, канон §3). `boardLease.release(fadeOutMs)` из реплики Музыканта некорректен — release не принимает fade.
> - **Узел после инвалидации сессии не может слать `board.release`** по WS: сокет рвётся при `handlePairingInvalid`, а node-originated board-события сервер и так дропает (CT2). Надёжный авто-release капчера — на серверном `unregister` сокета узла или по TTL. См. PL4 (узел проверки).
> - Heartbeat (PL2b) — Математик предлагал отложить; помечен как **отделяемая под-фаза**, режется первой при нехватке времени.

## Цель

Presence и жизненный цикл «узел ↔ ключ ↔ устройство» — согласованные и в реальном времени: кабинет всегда видит актуальный online; отзыв/удаление ключа мгновенно рвёт связь на ключе и на устройстве; захват tariff v2 корректно отпускается.

## Фазы

### PL1 — Presence-снапшот (M)

- [ ] Контракт `@membrana/core`: тип `PresenceSnapshot` (`type:'snapshot'`, `onlineDeviceIds: string[]`, `timestampMs: number`) + `NODE_REALTIME_EVENT_TYPES.presence.snapshot`; parse-функция; экспорт из `index.ts`.
- [ ] Сервер `node-realtime.service.ts`: `registerCabinet` сразу отправляет новому кабинетному сокету `PresenceSnapshot` с `onlineDeviceIds` из `nodeSockets` (фильтр по `membraneId`) до подписки на stream.
- [ ] Клиент `cabinetNodeRealtimeClient.ts` + `useCabinetNodeRuntime.ts`: обработать snapshot → seeding `onlineDeviceIds`; **не обнулять** набор при `connecting`/реконнекте (дополнять stream-событиями).
- [ ] Тесты: snapshot-fanout на сервере; клиентский seeding + сохранение при реконнекте.

### PL2 — Device pairingStatus (S)

- [ ] Prisma: `Device.pairingStatus: 'paired' | 'revoked' | 'unpaired'` (default 'paired'); миграция (prod db push — в окне деплоя).
- [ ] `revokeAccessKey`: UPDATE `Device.pairingStatus='revoked'` (НЕ трогаем `pairedKeyId` — история для `getPairStatus`).
- [ ] `getPairStatus`: учитывать `pairingStatus` в `inactiveReason`/диагностике.
- [ ] Тесты: revoke → status transition; getPairStatus отражает.

### PL2b — Heartbeat узла (S, **отделяемо / deferrable**)

- [ ] Узел: пинг каждые ~120с (`presence.heartbeat { deviceId, timestampMs }`); сервер обновляет `Device.lastSeenAt`.
- [ ] `registerCabinet`/REST: после рестарта сервера узлы с `lastSeenAt > now-5м` — потенциально online (bootstrap до live-уточнения).
- [ ] Режется первой при нехватке времени (Математик: in-memory + PL1-снапшота достаточно для MVP).

### PL3 — «Удалить» = revoke + delete (M)

- [ ] Сервер `deleteAccessKey`: если ключ активен — сначала `revokeAccessKey` (notify узлам + pairingStatus), затем delete; без 409. FK `Device.pairedKeyId → NodeAccessKey` = **SET NULL** при delete.
- [ ] Кабинет `KeysPage.tsx`: единая кнопка «Удалить» (в т.ч. на активном ключе) → модалка подтверждения (имя ключа, дата, текст «Удаление отзовёт сеанс узлов и удалит ключ») → spinner → success (список обновляется, узел → offline/не сопряжено) или error; `aria-live`.
- [ ] Тесты: delete-active = revoke+delete; узел получает invalidate.

### PL4 — Auto-release capture при инвалидации (M)

- [ ] **Узел проверки (см. поправки):** проверить, что при отзыве ключа под захватом капчер НЕ зависает. Реалистичный путь — серверный `unregister` сокета узла отпускает capture этого устройства (или TTL). Реплика Музыканта про `boardLease.release()` на узле нереализуема (сокет рвётся) — реализовать серверную сторону.
- [ ] Сервер: при `unregister` node-сокета — если устройство под захватом, инициировать release (broadcast кабинету) либо положиться на TTL; выбрать по результату проверки.
- [ ] Race-тест: захват активен → revoke ключа → capture отпущен + кабинет видит release (не висит ведомость).

### PL5 — Тесты, docs, smoke (M)

- [ ] Контракт-тесты presence через WS-mock (snapshot + stream).
- [ ] `ARCHITECTURE.md` §Presence; `STUDIO_HOST_BRIDGE_CONTRACT.md` — новый контракт Device/PresenceSnapshot.
- [ ] Smoke-runbook `docs/actions/.../PAIRING_LIFECYCLE_SMOKE.md`: программная последовательность (узел+кабинет локально/docker, WS-mock) + ручные пункты (реальное железо — deferred ~конец июля).

## Out of scope

- Redis/Postgres presence (in-memory достаточно для MVP — Teamlead).
- Полный E2E на реальном оборудовании (deferred).

## DoD

- PL1–PL5 (PL2b — если время) merged с LGTM per phase; scoped CI зелёный; контракт-тесты presence; smoke-runbook (ручное — deferred); прод-миграция `pairingStatus` — в окне деплоя.
