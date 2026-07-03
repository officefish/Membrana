# Smoke: device-board capture tariff v2 (явный захват)

Канон: [`DEVICE_BOARD_SERVER_FIRST.md`](../../../DEVICE_BOARD_SERVER_FIRST.md) v2.0 §11
Спринт: `db-capture-tariff-v2-2026-07-02` (CT8) · заменяет чеклист v1 (`DEVICE_BOARD_SERVER_FIRST_SMOKE.md` — архив модели)

---

## Где выполнять

| Уровень | Где | Когда |
|---------|-----|--------|
| **Unit / gateway mock** | Локально / CI | CT1–CT7 — `yarn turbo run lint typecheck test build` |
| **E2E capture v2** | **Только прод** | После деплоя cabinet (окно общее с зависшим prod-gate v1) + paired field client |

---

## Подготовка (prod)

1. Cabinet задеплоен (`yarn cabinet:smoke:prod` — базовый гейт).
2. Field-песочница: `yarn workspace @membrana/client dev` → http://localhost:5173 (`.env.development` смотрит на прод cabinet/media).
3. Сопряжение: кабинет → **Ключи** → создать → в песочнице «Связь с мембраной».
4. Два окна: кабинет (**Узлы** / **Device board**) + песочница. На карточке узла — badge **online**.

---

## Checklist (канон §11)

### Без захвата — ноль контроля

- [ ] Кабинет/Узлы: карточка показывает только **Захватить** + режим; Пуск/Стоп недоступны.
- [ ] Кабинет: Пуск/Стоп не работают и через WS (gateway drop + warn `device is not captured`).
- [ ] Field: полная автономия — редактирование, локальный Пуск/Стоп/Пауза работают.

### Захват мягкий

- [ ] Узлы: **Захватить** (режим «мягкий») → badge «Захвачено: мягкий» (кабинет), badge «Захват: мягкий» + **alert-toast** «Сервер захватил управление…» (field).
- [ ] Field: локальный сценарий, игравший до захвата, остановлен **с fade ~200 мс** (не резкий обрыв).
- [ ] Field: борд **read-only** (палитра/удаление off, pan/zoom on); пауза заблокирована; локальные **Пуск/Стоп работают**.
- [ ] Кабинет: **Пуск** → сценарий устройства играет; **Стоп** → плавная остановка.
- [ ] LWW: field Пуск во время серверного run → предыдущий останавливается, последний побеждает (и наоборот).

### Захват жёсткий

- [ ] Узлы: Захватить (режим «жёсткий») → badge warning на обеих сторонах.
- [ ] Field: Пуск заблокирован, редактирование заблокировано; **Стоп доступен всегда** (emergency, hard-cut).
- [ ] Кабинет: Пуск/Стоп работают как при мягком.

### Release / TTL

- [ ] Кабинет: Пуск → сценарий играет → **Отпустить** → сценарий **продолжает играть**; field-toast info «Сервер отпустил управление…», badge «Отпущено».
- [ ] Отключить сеть кабинет-сервера (или убить cabinet-сессию): field badge «Соединение потеряно»; через **5 мин** — auto-release, toast warning «истёк TTL», автономия восстановлена.
- [ ] Heartbeat: при живом захвате badge «Соединение потеряно» не появляется дольше пары секунд после reconnect.

### Тарифный whitelist (gateway)

- [ ] Ручной WS `runtime.command {action:'pause'}` при захвате → drop (лог warn `not in tariff v2 whitelist`), field не реагирует.
- [ ] REST `POST /v1/nodes/:id/scenario/edit-lease` → **404** (модуль отключён, CT7).

### Кабинетский борд

- [ ] Device board (кабинет): просмотр графа, save недоступен (view-only session).
- [ ] Захват + Пуск/Стоп работают из панели борда (не только из Узлов).

### Финал

- [ ] `yarn turbo run lint typecheck test build --continue` зелёный на ветке деплоя.

---

## §Studio (Electron) capture smoke — SC4

> Спринт [`STUDIO_CAPTURE_ADAPTATION_SPRINT_PROMPT.md`](../../../prompts/STUDIO_CAPTURE_ADAPTATION_SPRINT_PROMPT.md) · контракт [`STUDIO_HOST_BRIDGE_CONTRACT.md`](../../../STUDIO_HOST_BRIDGE_CONTRACT.md) §4.5 Capture

### Программные пункты (этот спринт)

- [ ] Unit TTL/heartbeat/focus-once: `yarn workspace @membrana/client test src/lib/boardLeaseBridge.test.ts` — зелёный (SC1: TTL-разряд ровно один раз, мёртвый heartbeat не воскрешает, focus per acquire).
- [ ] Capture-lifecycle в M1 shell-лог: renderer пишет `[capture] acquired/heartbeat/release`, main — `capture acquired — window focused` (SC1/SC4).
- [ ] Парсер: `yarn logs:parse:shell -- --file %APPDATA%/Membrana/logs/shell-<дата>.log --require-acquired 1 --require-release 1` — счётчики по режимам/причинам, exit 1 при недоборе.
- [ ] `backgroundThrottling: false` в `createWindow()` (grep main.ts).
- [ ] `clientVersion` в WS handshake (SC5, после реализации).

### Ручные пункты — **deferred ~2026-07-17 (оборудование)**

- [ ] Paired Studio + cabinet: полный цикл capture(soft/hard)/release/TTL; badges и alert-toast поверх фуллскрин-борда; окно поднимается в foreground при захвате.
- [ ] Реальный троттлинг: свернуть окно на 6+ мин под захватом без heartbeat → auto-release вовремя (OQ6, real timers).
- [ ] LWW при мягком захвате (Пуск с поля vs Пуск с кабинета).
- [ ] Слуховая проверка fade 200мс при вытеснении/стопе — без артефактов на стыке (Kuryokhin).
- [ ] Плагин «VDR-валидация» при захвате: live-окно и corpus runner работоспособны.
- [ ] Итоги внести в этот раздел (дата, оператор, PASS/замечания → STx при симптомах).

---

## Разбор инцидентов

- Gateway warn-логи: `runtime.command rejected` (whitelist / not captured) — ожидаемые при негативных проверках.
- `board.capture/heartbeat/release` по WS от клиентов отбрасываются — события server-originated (CT2).
- Захват «застрял» после рестарта сервера: heartbeat-sweep отпустит по TTL (≤5 мин) с reason `ttl-expired`.
