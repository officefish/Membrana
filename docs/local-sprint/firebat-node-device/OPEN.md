# Membrana Local Sprint OPEN: firebat-node-device

| Поле | Значение |
|------|----------|
| Sprint | `firebat-node-device` |
| Procedure | `membrana-local-sprint` |
| Registry card | `firebat-node-device` (L, магистраль 19.08 по owner-choice; Issue [#1998](https://github.com/officefish/Membrana/issues/1998)) |
| Prompt | [`FIREBAT_NODE_DEVICE_PROMPT.md`](../../prompts/FIREBAT_NODE_DEVICE_PROMPT.md) · точка входа сессии `SESSION_A_NODE_DEVICE_SPRINT_2026-08-19.md` |
| Cut plan | [`firebat-node-device.json`](../../sprint/cut/firebat-node-device.json) · ратифицирован владельцем 2026-08-19T12:12Z («ратифицирую») |
| Cutter context | Ожегов, `yarn ask ozhegov` 19.08, четыре захода → [`cut-firebat-node-device-20260819-ozhegov-run.md`](../../discussions/cut-firebat-node-device-20260819-ozhegov-run.md) |
| Lead | ozhegov |
| Support | vesnin · kuryokhin |
| Status | open · execute |

## Зачем

Узел Firebat 18.08 ожил: пишет 48 кГц в заводском режиме карты и отправляет сам — но
руками, по `yarn field:capture`, со служебным токеном медиа-сервиса в `.env` и без
возможности дать задание с сервера (узел за вторым роутером, вход снаружи закрыт). Слово
владельца: права узел получает **установкой нашего приложения**, SSH — для лаборатории.
Спринт делает узел устройством: исходящий канал к серверу, отдельный ключ, служба после
перезагрузки, рабочее усиление с запасом.

## Форма канала (Ожегов, контекст резчика)

**Опрос очереди заданий (poll) от узла к media.** Против WebSocket — near-realtime в этом
спринте не требуется (узел — сборщик записей для калибровки, «снять пробу» терпит
секунды), а сокеты требуют reconnect и состояние на сервере; против обратного туннеля —
это обслуживание, не данные. Приёмник — `background-media`: там устройства, коллекции и
приём WAV. Леммы: узел · устройство · исходящий канал · транспорт · наблюдение; ключ узла
≠ nodeId наблюдения. Исходы опроса — закрытый словарь `ok | stale_key | backoff`.

## Блоки

| Блок | Персона | Зона | Оценка | Статус |
|------|---------|------|-------:|--------|
| b1 ADR транспорта и дома (первым) | ozhegov | `docs/adr/ADR-0027` | 60 | исполнен · подпись Ожегова 19.08 |
| b2 ключ узла (ревизия 19.08: + таблица NodeKey и миграция) | ozhegov | `…/firebat-node/node-key.*` · `prisma/schema.prisma` · миграция | 260 | исполнен · подпись Ожегова 19.08 |
| b3 API опроса и очередь заданий | ozhegov | `…/firebat-node/{controller,task-queue,module,index}` | 260 | исполнен · подпись Ожегова 19.08 (очередь эфемерна — названо) |
| b4 poller узла | ozhegov | `scripts/firebat-poller.mjs` + тест | 300 | исполнен · подпись Ожегова 19.08 (комплект узла = 3 файла + .env — названо) |
| b5 установщик + служба | ozhegov | `scripts/firebat-service-install.ps1` · `apps/membrana-studio` (NSIS собран впервые) | 200 | исполнен · подпись Ожегова 19.08; остаток: комплект узла в NSIS — отдельная карточка |
| b6 усиление + спутник (∥) | kuryokhin | `docs/field/firebat-node.md` · `docs/LIVE_SERVICES.md` | 60 | документ исполнен · подпись Курёхина 19.08 (#2000); ручка GAIN — руки владельца |
| b7 приёмка (замыкает) | tarasov | `docs/field/firebat-node-acceptance-2026-08-19.md` | 40 | ждёт |

Порядок: b1 → b2 → b3 → b4 → b5; b6 параллельно; b7 последним. Каждый PR ≤ 400 строк.
Вне спринта: наблюдения в реальном времени (WS), парринг через device-board, мультиузел/TDOA,
пакет-основа узла, LoRa.

## Запрещено (из промпта)

Входящие порты на узле · Focusrite Control на узле · служебный токен в установщике ·
менять поведение #1950 (объявленное vs измеренное) в этом спринте.
