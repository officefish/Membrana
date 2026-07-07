# Sprint prompt: Живость присутствия + view-only борд под захватом (PCB1–PCB6)

| Поле | Значение |
|------|----------|
| **Sprint** | `presence-capture-board` |
| **Консилиум** | [`presence-capture-board-2026-07-04.md`](../seanses/presence-capture-board-2026-07-04.md) · бриф: [`PRESENCE_CAPTURE_BOARD_BRIEF.md`](../PRESENCE_CAPTURE_BOARD_BRIEF.md) |
| **Связано** | `pairing-lifecycle` (PL1–PL5 merged, PL2b heartbeat отложен) · capture tariff v2 · MP7b node-realtime |
| **Повод** | Клиент на 1573 «связан»+перезапускается, кабинет держит offline (PL1-снапшот не закрыл); захват → view-only борд на устройстве |
| **Size** | L (2 фазы + отложенная 3) |

> **Поправки к протоколу (сверено с репо 2026-07-04):**
> - **A4:** `serializeNode` (`membrane.service.ts`) **уже отдаёт `lastSeenAt`** — API расширять НЕ нужно; кабинет (`NodesPage`) его **не потребляет** (берёт только presence `isDeviceLive`). Дело в consume + новых состояниях UI.
> - **Критично для A4:** консилиум ошибочно считает «`lastSeenAt` пишется при каждом `registerNode` — уже в коде». **НЕ так** — `registerNode` только in-memory (`nodeSockets`), в БД не пишет; `Device.lastSeenAt` обновляется лишь при пейринге. Чтобы «виден Ns назад» и bootstrap после рестарта сервера работали, добавить запись `Device.lastSeenAt` на `registerNode` (мини-часть PL2b; полный heartbeat остаётся отложенным).
> - **B1 force-open:** у клиента модули активируются через `MembranaRegistry`/agenda-стор, **не** `navigate('/device-board')` по URL — форс-открытие = смена активного модуля через стор.
> - **Диагностика первой:** persistent-offline корень (H1 auth-fail / H2 рестарт / H3 нет mediaDeviceId / H4 HMR) НЕ подтверждён — PCB1 (логи) вскрывает его до фиксов PCB2/PCB3.

## Цель

Достоверная живость присутствия (кабинет видит реальный online/offline узла, устойчиво к перезапускам клиента и рестарту сервера) + захват принудительно открывает device-board в view-only на устройстве.

## Фаза 1 (критично для тестера)

### PCB1 — WS-lifecycle логирование (диагностика A1)

- [ ] Сервер `node-realtime` + auth: логировать `node-ws-connect` / `node-ws-authenticate` (ok/fail+reason) / `node-ws-register` с timestamp; `error`-уровень при auth-fail (4401).
- [ ] Клиент `nodeRealtimeClient`: логировать connect/open/close(code)/reconnect.
- [ ] Прогнать на связке 1573↔кабинет, зафиксировать реальный корень (H1–H4) в артефакте/smoke.

### PCB2 — Баннер auth-fail на клиенте (A2)

- [ ] `nodeConnectionStore`: поле `authFailedAt` (или reason) из WS-close 4401 / sessionInvalidated.
- [ ] `NodeConnectionShell`: баннер «Сопряжение истекло — переподключитесь» с **дебаунсом 2–3с** (не спамить на HMR-разрывах) + кнопка «Пересопрячь».
- [ ] Отличать краткий разрыв (ретрай) от устойчивого auth-fail.

### PCB3 — Кабинет: достоверный индикатор + lastSeenAt на registerNode (A4)

- [ ] Сервер: `registerNode` (и `unregister`) обновляет `Device.lastSeenAt` в БД (мини-PL2b; полный heartbeat — отложен).
- [ ] Кабинет `NodesPage`/`useCabinetNodeRuntime`: потреблять `lastSeenAt` (уже в ответе API); состояния **online** (в presence) / **connecting** / **виден Ns назад** (lastSeenAt < 5 мин) / **offline**.
- [ ] Тесты: transition состояний.

### PCB4 — link-state эндпоинт (D1, часть 1)

- [ ] `GET /v1/nodes/:id/link-state` → `{ paired, live, lastSeenAt }` (по устройству). Тесты.

## Фаза 2 (UX + ops)

### PCB5 — Capture → force view-only board (B1)

- [ ] `boardLeaseBridge` на `board.capture`: форс-открытие device-board через agenda-стор (смена активного модуля, **не URL**) + флаг сессии `isViewOnlyFromCapture`.
- [ ] `device-board` модуль: при флаге → `readOnly=true` + `cabinet-view` сессия (блоки уже есть); на `board.release` — снять флаг.
- [ ] Если оператор уже в device-board — не навигируем, только применяем readOnly. Инвариант §3.3 (emergency stop доступен) не нарушать.

### PCB6 — health-ping эндпоинт (D1, часть 2)

- [ ] `POST /v1/nodes/:id/health-ping` → сервер шлёт echo узлу по WS, ждёт ответ (таймаут 3с) → `{ reachable, latencyMs }`; узел отвечает на ping. Тесты.
- [ ] (опц.) индикатор ping в кабинете (Музыкант) — если время.

## Отложено / бэклог

- **PCB-D2 multi-node (Фаза 3):** `getPairStatus`/`authenticateCabinet` сейчас `take:1` — переход на массив узлов per-membrane + UI кабинета со списком индикаторов. Отдельно.
- **Тех-долг (P4/P5, отдельная дорожка):** формальные closure-review PL2–PL5 (инфра-флейк review-runner, домен cg2); второй флейк `background-cabinet` vitest-воркер.

## DoD

- Корень persistent-offline вскрыт логами (PCB1) и устранён (PCB2/PCB3).
- **Критерий успеха:** клиент на 1573, linked, перезагрузки → кабинет корректно online/offline, без прыжков в offline на HMR (дебаунс).
- Баннер auth-fail; кабинет-индикатор с «виден Ns назад»; force-open view-only на захвате; link-state + health-ping эндпоинты с тестами.
- Ручной E2E на полевом железе — deferred (~конец июля); связка client↔cabinet в dev — программно.
