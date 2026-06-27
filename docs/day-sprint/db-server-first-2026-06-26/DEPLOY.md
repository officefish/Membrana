# Deploy: device-board server-first (после SF9)

Серверные E2E/smoke для server-first выполняются **только на проде** (решение Teamlead, 2026-06-26).

Локально перед деплоем: `yarn turbo run lint typecheck test build --continue` (без поднятия cabinet на VPS).

---

## 1. Pre-deploy (локально)

1. Все фазы SF0–SF9 ✅, изменения **закоммичены и запушены**.
2. CI GitHub Actions зелёный для SHA ветки деплоя.
3. Миграция SF3 в образе API: `20260626130000_node_scenario_edit_lease` (Prisma `migrate deploy` в entrypoint).

```bash
yarn turbo run lint typecheck test build --continue
```

---

## 2. Деплой cabinet (рекомендуемый путь — образ GHCR)

См. [`docs/deploy/BACKGROUND_CABINET_DEPLOY.md`](../../deploy/BACKGROUND_CABINET_DEPLOY.md).

```bash
# после push + green CI
yarn cabinet:deploy:image:prod
# или легаси build на VPS:
# yarn cabinet:deploy:prod
```

Гейты: preflight (чистое дерево) + ci-gate (`gh`). Обход только осознанно: `DEPLOY_ALLOW_DIRTY=1 DEPLOY_ALLOW_RED_CI=1`.

---

## 3. Prod smoke (обязательно после деплоя)

### 3.1 Инфраструктура

```bash
yarn cabinet:smoke:prod
```

Проверяет health, login, узлы, migrate, runtime-канал (MP7).

### 3.2 Server-first (ручной чеклист)

Полный сценарий: [`DEVICE_BOARD_SERVER_FIRST_SMOKE.md`](../../actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md).

Кратко:

| Блок | Проверка |
|------|----------|
| Edit lease | Cabinet Device board → field view-only → release |
| Capture soft | Nodes Пуск → field pause/stop OK, local run blocked |
| Capture strict | Пуск strict → field без runtime controls |
| Pause | Nodes Пауза ↔ field `isPaused` |
| Last track | Journal track → «Прослушать последний трек» на карточке |

Требует: paired field client (`apps/client`) + сценарий с journal.

---

## 4. Откат

```bash
yarn cabinet:rollback:prod
```

См. `BACKGROUND_CABINET_DEPLOY.md` → DR3.

---

## 5. Field client

Server-first enforcement — в `apps/client` (SF4–SF5). Если поле не обновлено на том же релизе, lease/capture на field не сработает end-to-end. Координировать деплой SPA client (`membrana.space` / device-board) с cabinet API.
