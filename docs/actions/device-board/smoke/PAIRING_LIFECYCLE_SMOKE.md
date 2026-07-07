# Smoke — presence и жизненный цикл сопряжения (PL1–PL4)

> Спринт [`PAIRING_LIFECYCLE_SPRINT_PROMPT.md`](../../../prompts/PAIRING_LIFECYCLE_SPRINT_PROMPT.md) · консилиум [`pairing-lifecycle-2026-07-04.md`](../../../seanses/pairing-lifecycle-2026-07-04.md) · контракт presence: [`STUDIO_HOST_BRIDGE_CONTRACT.md`](../../../STUDIO_HOST_BRIDGE_CONTRACT.md) §Presence

Проверяет фикс offline-бага и жизненный цикл «узел ↔ ключ ↔ устройство». Связка client↔cabinet тестируется **без полевого оборудования** (браузер-клиент + кабинет + сервер локально/docker); пункты, требующие реального железа/микрофона, помечены **deferred**.

## Предусловия

- `background-cabinet` + `background-media` подняты (docker-compose или локально); прод-миграция `pairingStatus` применена (`yarn prisma:migrate` — в окне деплоя) или локальный `prisma migrate dev`.
- Клиент (`yarn workspace @membrana/client dev`) и кабинет (`yarn workspace @membrana/cabinet dev`) запущены; admin залогинен в кабинете.

## Программные пункты (этот спринт)

### PL1 — presence-снапшот (offline-баг)

- [ ] **Порядок «узел раньше кабинета»**: связать клиент ключом (пейринг) → **затем** открыть/обновить страницу «Узлы» в кабинете. Узел сразу **online** (не «сопряжён · offline»). До PL1 — висел offline.
- [ ] **Реконнект кабинета**: при открытой странице «Узлы» перезагрузить вкладку кабинета / сымитировать разрыв WS → узел не «мигает» в offline, снапшот восстанавливает online.
- [ ] Unit: `yarn workspace @membrana/core test presence-snapshot` (парсер) + `node-realtime.service.test` (снапшот при `registerCabinet`, фильтр по membrane).

### PL2 — pairingStatus

- [ ] После отзыва ключа `getPairStatus` возвращает `pairingStatus: 'revoked'`, `pairedKeyId` сохранён (диагностика).
- [ ] Ре-пейринг тем же/новым ключом → `pairingStatus: 'paired'`.

### PL3 — «Удалить» = revoke + delete

- [ ] На **активном** ключе в разделе «Ключи» есть кнопка **«Удалить»** (не только «Отозвать»); клик → подтверждение с именем ключа и предупреждением о разрыве сеанса → ключ исчезает.
- [ ] Клиент, сопряжённый этим ключом, **сразу** получает разрыв сопряжения (диалог «сопряжение недействительно»), устройство в кабинете → offline/не сопряжено.
- [ ] `Device` после удаления: `pairedKeyId=null`, `pairingStatus='unpaired'`.

### PL4 — авто-release захвата

- [ ] Захватить устройство из кабинета (Узлы → Захватить) → отозвать/удалить ключ этого узла → захват **сразу** отпускается (кластер возвращается к «Захватить»), не ждём TTL 5 мин.
- [ ] Транзиентный разрыв WS узла (без отзыва ключа) захват **не** трогает — держится TTL.
- [ ] Unit: `device-capture.service.test` (forceReleaseByNode + идемпотентность) + `membrane-revoke.service.test` (вызов из revoke/delete).

## Ручные пункты — deferred (реальное оборудование, ~конец июля)

- [ ] Полный E2E на полевом узле (микрофон): пейринг → захват → отзыв ключа под захватом → отсутствие артефактов, узел корректно уходит в автономию.
- [ ] Слуховая проверка: при force-release играющий сценарий не обрывается рывком (release ≠ stop, канон §3).

## Разбор

- `pairingStatus` prod-миграция — в окне деплоя кабинета (вместе с ожидающим `NodeDeviceCapture` db-push).
- Флейк `@membrana/rag-service` (`retrieveContext R1 archive`) в `verify` — известная нестабильность (`cg1-flaky-rag-service`), к presence/pairing не относится.
