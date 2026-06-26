# Smoke: device-board server-first

Канон: [`DEVICE_BOARD_SERVER_FIRST.md`](../DEVICE_BOARD_SERVER_FIRST.md)  
Деплой + prod-only политика: [`docs/day-sprint/db-server-first-2026-06-26/DEPLOY.md`](../day-sprint/db-server-first-2026-06-26/DEPLOY.md)

---

## Где выполнять

| Уровень | Где | Когда |
|---------|-----|--------|
| **Unit / gateway mock** | Локально / CI | SF8 — `yarn turbo run lint typecheck test build` |
| **E2E server-first** | **Только прод** | После `yarn cabinet:deploy:image:prod` + paired field client |

Локально **не** поднимаем полный cabinet stack для этого чеклиста — только зелёный CI и деплой на `cabinet.membrana.space`.

---

## Подготовка (prod)

1. Cabinet задеплоен (`yarn cabinet:smoke:prod` — базовый гейт).
2. Field `apps/client` paired с узлом, MP7 WS online.
3. Браузер: кабинет → **Узлы** и **Device board**.

---

## Checklist

### Edit lease

- [ ] Cabinet: открыть Device board → acquire lease (network/WS `board.edit-lease`).
- [ ] Field: device-board **view-only** (palette off, no save).
- [ ] Cabinet: выход → release → field снова может редактировать (если нет strict capture).

### Capture soft

- [ ] Nodes: **Пуск** с default soft (селектор «Захват: мягкий»).
- [ ] Field: run cluster — pause/stop/mode **доступны**; local **Пуск** заблокирован.
- [ ] Nodes: **Пауза** → field `isPaused` (badge/phase).
- [ ] Nodes: **Продолжить** → run возобновлён.
- [ ] Nodes: **Стоп** → idle на обоих.

### Capture strict

- [ ] Nodes: Пуск с `followerMode=strict` (селектор «строгий»).
- [ ] Field: **нет** run/pause/stop/mode; pan/zoom работает.

### Last track

- [ ] Сценарий с journal track → после run на карточке узла **Прослушать последний трек** воспроизводит audio.

---

## Разбор инцидентов

- Field не view-only → WS `board.edit-lease`, lease TTL, REST `POST .../edit-lease`.
- Pause не синхронизируется → `runtime.state.isPaused`, gateway fan-out.
- Нет трека → journal append на field, cabinet journal REST + WS `journal.append`.
- Миграция lease → `NodeScenarioEditLease` в БД cabinet (`prisma migrate deploy`).

---

## Команды

```bash
# локально (SF8)
yarn turbo run lint typecheck test build --continue

# прод после деплоя
yarn cabinet:smoke:prod
# затем ручной чеклист выше в браузере
```
