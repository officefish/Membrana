# U10 / U11 User Workspace — prod deploy + smoke

Эпики [#147](https://github.com/officefish/Membrana/issues/147) (U10) · [#149](https://github.com/officefish/Membrana/issues/149) (U11 paired LWW).

## Предусловия

1. Коммиты W4/W5 в **`main`**, push на `origin`.
2. **CI** зелёный на деплоируемом SHA (`scripts/_deploy-ci-gate.mjs`).
3. Релизный образ cabinet (рекомендуется):

```bash
git tag cabinet-v0.2.0
git push origin cabinet-v0.2.0
```

Дождаться workflow **Build and push cabinet images** (`.github/workflows/cabinet-images.yml`).

4. Локальный `.env`: `BACKGROUND_MEDIA_IPV4`, `BACKGROUND_MEDIA_PASSWORD`.

## Деплой (media migrate + cabinet)

**Feature-ветка без релизного тега** — сборка cabinet на VPS:

```bash
CABINET_GIT_BRANCH=u10-workspace-prod CABINET_IMAGE_TAG=build \
DEPLOY_ALLOW_DIRTY=1 DEPLOY_ALLOW_RED_CI=1 \
yarn cabinet:u10-workspace:prod
```

**После merge + тега `cabinet-v*`** — образ из GHCR:

```bash
CABINET_IMAGE_TAG=cabinet-v0.2.0 yarn cabinet:u10-workspace:prod
```

Скрипт `scripts/_ssh-cabinet-u10-workspace-prod.mjs`:

- `media-stack.sh build` + `up` — применяет миграцию `DeviceWorkspace`
- `cabinet-stack.sh build` + `up` (tag `build`) **или** `pull` + `up` (image tag) — применяет `maxUserWorkspaces` в Tariff
- `yarn cabinet:u10-workspace:smoke` — prod-smoke U10

Сводка: `deploy-artifacts/u10-workspace-prod-*.json`.

## Только smoke (после деплоя)

```bash
yarn cabinet:u10-workspace:smoke
```

Проверки: `pair.tariff.maxUserWorkspaces`, `GET/PUT/GET device-workspaces`, legacy `/device-scenario`, `prisma migrate status` (cabinet + media), paired active workspace + reload roundtrip.

## U11 — paired LWW (409)

U11 S3 добавляет на **media** опциональный query-параметр `expectedUpdatedAt` на
`PUT /v1/devices/:deviceId/device-workspaces/:workspaceId`. При несовпадении с серверным `updatedAt` → **409**:

```json
{
  "code": "WORKSPACE_CONFLICT",
  "currentUpdatedAt": "2026-06-23T12:00:00.000Z",
  "expectedUpdatedAt": "2026-06-23T11:00:00.000Z"
}
```

### Что деплоить

| Компонент | U11 изменения | Prod deploy |
|-----------|---------------|-------------|
| **background-media** | 409 LWW на PUT | **Обязательно** — тот же `yarn cabinet:u10-workspace:prod` (media `build` + `up`) |
| **background-cabinet** | нет | Образ `cabinet-v0.2.0` (или актуальный тег) — pull, без пересборки |
| **apps/client** | persist + conflict UX | **Локально** — `yarn workspace @membrana/client dev`; prod-хостинга client нет |

После push U11 в `main` достаточно:

```bash
CABINET_IMAGE_TAG=cabinet-v0.2.0 yarn cabinet:u10-workspace:prod
```

На VPS подтянется `9d87fe7+`, media пересоберётся с LWW. Smoke **не** проверяет stale PUT → 409 (ручная проверка: два Save с разными `expectedUpdatedAt`).

### Ручная проверка conflict (опционально)

1. Paired client A: открыть workspace, **Сохранить** (зафиксировать `updatedAt` на media).
2. Client B (или curl): `PUT` тот же `workspaceId` с телом и `?expectedUpdatedAt=<старый>` → ожидать **409**.
3. На client A: снова **Сохранить** с устаревшим локальным состоянием → banner **«Загрузить с сервера»**.

## CI

| Workflow | Когда |
|----------|--------|
| **CI** | push/PR — `lint typecheck test build` |
| **cabinet-images** | push `cabinet-v*` — образ API |
| **U10 workspace prod** | `workflow_dispatch` — smoke на VPS (нужны secrets) |

Ручной prod-smoke из GitHub: Actions → **U10 workspace prod** → Run workflow → `smoke-only`.

## Откат

Cabinet: `CABINET_ROLLBACK_TAG=<prev> yarn cabinet:rollback:prod`  
Media: на VPS `git reset --hard <prev>` + `./deploy/media-stack.sh build` + `up` (миграции только вперёд — откат БД отдельно).

См. также [`BACKGROUND_CABINET_DEPLOY.md`](./BACKGROUND_CABINET_DEPLOY.md), [`BACKGROUND_MEDIA_DEPLOY.md`](./BACKGROUND_MEDIA_DEPLOY.md).
