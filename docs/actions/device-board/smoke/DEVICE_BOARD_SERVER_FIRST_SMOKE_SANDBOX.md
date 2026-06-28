# Smoke server-first: песочница + прод-кабинет

Канон: [`DEVICE_BOARD_SERVER_FIRST.md`](../DEVICE_BOARD_SERVER_FIRST.md)  
Полный чеклист: [`DEVICE_BOARD_SERVER_FIRST_SMOKE.md`](./DEVICE_BOARD_SERVER_FIRST_SMOKE.md)  
Деплой: [`docs/day-sprint/db-server-first-2026-06-26/DEPLOY.md`](../day-sprint/db-server-first-2026-06-26/DEPLOY.md)

---

## Окна

| Окно | URL |
|------|-----|
| **Кабинет** | https://cabinet.membrana.space |
| **Поле (песочница)** | http://localhost:5173 |

Песочница: `yarn workspace @membrana/client dev`  
API в `.env.development`: `VITE_CABINET_API_URL=https://cabinet.membrana.space`, `VITE_MEDIA_API_URL=https://media.membrana.space`.

---

## Фаза 0 — сопряжение (один раз)

### Кабинет

1. Войти → **Ключи** (или с карточки узла «Ключи»).
2. Создать ключ для нужного узла → скопировать.

### Песочница

1. При первом заходе: **Связь с мембраной** → вставить ключ → подтвердить.
2. Должна появиться панель «Связано с мембраной» (paired).
3. Модуль **Device board** → launcher → открыть workspace (полноэкранный граф).

### Проверка online

Кабинет → **Узлы** → на карточке badge **online**. Без него **Пуск** недоступен.

**DevTools (поле):** Network → WS к `cabinet.membrana.space` / `realtime` — статус connected.

---

## 1. Edit lease

| # | Кто | Действие | Ожидание |
|---|-----|----------|----------|
| 1.1 | Кабинет | **Device board** → «Открыть редактор» | Редактор открыт |
| 1.2 | Кабинет | DevTools → WS / Network | `board.edit-lease`, holder=cabinet |
| 1.3 | Кабинет | Шапка редактора | Badge **«Вы редактируете»** |
| 1.4 | Поле | Device board (тот же deviceId) | Badge **«Редактирует кабинет»** |
| 1.5 | Поле | Палитра / сохранение | View-only: palette off, save blocked |
| 1.6 | Кабинет | **Назад** (выход из редактора) | Lease release |
| 1.7 | Поле | Снова можно редактировать граф | Если нет strict capture |

---

## 2. Capture soft

| # | Кто | Действие | Ожидание |
|---|-----|----------|----------|
| 2.1 | Кабинет | **Узлы** → **Пуск**, захват **мягкий** | Сценарий running |
| 2.2 | Поле | Badge | **«Захват: мягкий»** |
| 2.3 | Поле | Run cluster | **Пуск** заблокирован; **Пауза / Стоп / режим** доступны |
| 2.4 | Кабинет | **Пауза** | |
| 2.5 | Поле | Runtime UI | Пауза / phase «Пауза» |
| 2.6 | Кабинет | **Продолжить** | Run снова active |
| 2.7 | Кабинет | **Стоп** | Idle на обоих |

---

## 3. Capture strict

| # | Кто | Действие | Ожидание |
|---|-----|----------|----------|
| 3.1 | Кабинет | **Пуск**, захват **строгий** | |
| 3.2 | Поле | Badge **«Захват: строгий»** (warning) | |
| 3.3 | Поле | Run cluster | **Скрыт** полностью |
| 3.4 | Поле | Pan/zoom графа | Работает |
| 3.5 | Кабинет | **Стоп** | Сброс |

---

## 4. Last track

Нужен сценарий с записью в journal (микрофон + MakeTrack / journal pipeline).

| # | Кто | Действие | Ожидание |
|---|-----|----------|----------|
| 4.1 | Кабинет | **Пуск** (soft), дождаться трека в журнале | |
| 4.2 | Кабинет | **Узлы** → блок **«Последний трек»** | |
| 4.3 | Кабинет | **Прослушать последний трек** | `<audio>` воспроизводит blob |
| 4.4 | Кабинет | **Стоп** | |

---

## Разбор инцидентов

| Симптом | Что проверить |
|---------|----------------|
| Нет view-only на поле | WS `board.edit-lease`, REST `POST .../edit-lease` |
| Пауза не синхронизируется | `runtime.state` / `isPaused` в WS |
| Нет трека | journal на поле + кабинет **Журнал**; WS `journal.append` |
| Песочница не paired | пересоздать ключ, hard refresh `localhost:5173` |
| Кабинет не открывается | `curl https://cabinet.membrana.space/health`, `yarn cabinet:smoke:prod` |

---

## Команды

```bash
# песочница
yarn workspace @membrana/client dev

# диагностика кабинета
curl -fsS https://cabinet.membrana.space/health
yarn cabinet:smoke:prod
```
