# Промпт (эпик): Device-board + cabinet hotfix — layout, узлы/ключи, purge

> Размер: **M** (5 подзадач DBH0…DBH4).  
> Реестр: `id` = `device-board-cabinet-hotfix`. GitHub: [#104](https://github.com/officefish/Membrana/issues/104).  
> Основание: QA prod 2026-06-18 (5 замечаний).  
> Консилиум: [`docs/seanses/device-board-cabinet-hotfix-2026-06-18.md`](../seanses/device-board-cabinet-hotfix-2026-06-18.md).

**Ветка:** `ozhegov-module-catalog-v1` (hotfix PR → merge → `yarn device-board:deploy:prod`).

**Связанные документы:** [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §8, §15, [`DESIGN.md`](../DESIGN.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) (cabinet-api).

---

## Контекст

После DBR6 и deploy #103 на prod остаются блокирующие UX-дефекты:

1. Канвас React Flow **уменьшен** flex-сайдбарами — не fullscreen под шапкой.
2. Сайдбары **фиксированной ширины** без clamp по viewport.
3. Тариф **1 узел**, в БД **2** (MP7B migration + seed), **нет delete node**; ключи не отзываются при удалении (API отсутствует).
4. Навигация **объединяет** узлы и ключи; продуктово нужны **два раздела**.
5. **Просроченные** ключи не purge — только отозванные.

---

## Подзадачи (порядок merge)

| ID | Содержание | Lead | Пакеты |
|----|------------|------|--------|
| **DBH0** | Fullscreen canvas + overlay sidebars (не flex-shrink) | Rodchenko + Ozhegov | `@membrana/device-board`, smoke `apps/cabinet` |
| **DBH1** | Clamp ширины сайдбаров (`min/max rem` + `vw`) | Rodchenko | `@membrana/device-board` |
| **DBH2** | Split nav «Узлы» / «Ключи» по умолчанию | Rodchenko | `apps/cabinet` |
| **DBH3** | `DELETE /v1/nodes/:id`, UI удаления, `free-v1` maxNodes=1 | Ozhegov | `packages/background-cabinet`, `apps/cabinet` |
| **DBH4** | Purge inactive keys (expired ∪ revoked), UI | Ozhegov | `packages/background-cabinet`, `apps/cabinet` |

**Зависимости:** DBH0 и DBH1 можно одним PR в device-board; DBH2 независим; DBH3 перед DBH4 (delete node переиспользует revoke-логику).

---

## DBH0 — Fullscreen canvas, overlay sidebars

### Текущее

`device-board-shell.tsx`: `flex` row — `BoardLeftSidebar` (`w-56 shrink-0`) + `<main className="flex-1">` + `BoardRightSidebar` (`w-72 shrink-0`). React Flow получает ширину `100% - 224px - 288px`.

### Целевое (консилиум)

```
header (как сейчас)
└─ relative flex-1 min-h-0
   ├─ main.canvas-layer  absolute inset-0   ← React Flow на весь блок
   ├─ left sidebar       absolute left-0 top-0 bottom-0 z-20
   └─ right sidebar      absolute right-0 top-0 bottom-0 z-20
```

- Сайдбары: `pointer-events-auto`, канвас под ними остаётся **полного размера** (mini-map / fitView не сжимаются).
- Collapse toggle (§8) сохранить; свёрнутый сайдбар — узкая полоска или `translate-x` off-screen.
- Хост `DeviceBoardPage`: `fixed inset-0` — без изменений, если shell уже `h-screen`.

### DoD DBH0

- [ ] На 1920×1080 и 1366×768 канвас занимает всю область под header; сайдбары визуально поверх.
- [ ] React Flow pan/zoom/minimap работают в зоне под сайдбарами (клики по сайдбару не проходят на канвас).
- [ ] Vitest smoke / ручной QA в cabinet route `/device-board`.

---

## DBH1 — Clamp ширины сайдбаров

### Решение консилиума

| Панель | Tailwind / CSS |
|--------|----------------|
| Left (палитра) | `w-[clamp(11rem,13vw,14rem)]` |
| Right (инспектор) | `w-[clamp(12rem,15vw,16rem)]` |

- На `<1280px`: опционально auto-collapse left (если уже есть toggle — документировать).
- Не использовать `w-56`/`w-72` без clamp.

### DoD DBH1

- [ ] На ultra-wide (>2560px) сайдбары не шире max rem.
- [ ] На 1280px суммарная ширина панелей ≤ ~28vw.

---

## DBH2 — Разделы «Узлы» и «Ключи»

### Текущее

`CabinetShell.tsx`: split только при `VITE_CABINET_NODES_KEYS_SPLIT === 'true'`; иначе один пункт `nodes-keys`.

### Целевое

- **По умолчанию split ON** — два пункта меню: «Узлы» (`/nodes`), «Ключи» (`/keys`).
- Реализация: инвертировать флаг в `VITE_CABINET_NODES_KEYS_COMBINED=true` для legacy QA **или** удалить combined-ветку и оставить только split (предпочтение консилиума: **split default, combined opt-in**).
- Prod Dockerfile / `docker-compose`: не задавать combined; при необходимости явно `VITE_CABINET_NODES_KEYS_SPLIT=true` до удаления флага.

### DoD DBH2

- [ ] Prod build: два раздела в sidebar кабинета.
- [ ] Cross-links: со страницы узла — ссылка «Ключи этого узла» (query `?nodeId=` уже есть на KeysPage).

---

## DBH3 — Удаление узла + лимит тарифа 1

### API

`DELETE /v1/nodes/:nodeId` (auth membrane owner):

1. Проверить ownership (`node.membraneId` ∈ user membranes).
2. Для каждого **active** ключа узла — `revokeAccessKey` (invalidate `Device.lastPairSessionToken` по pairedKeyId, как в существующем revoke).
3. `prisma.node.delete` — каскад: `NodeAccessKey`, `Device` (schema `onDelete: Cascade`).
4. Ответ: `{ deletedNodeId, revokedKeyIds[] }`.

**Не** авто-удалять «лишний» узел при деплое — пользователь удаляет вручную.

### Тариф

- `prisma/seed.mjs`: `free-v1` → `maxNodesPerMembrane: 1`.
- Миграция data-fix: `UPDATE "Plan" SET "maxNodesPerMembrane" = 1 WHERE slug = 'free-v1';`
- `createNode`: guard уже через `assertNodeLimit` — после fix новые узлы при 1 узле блокируются.

### UI (`NodesPage`)

- Кнопка «Удалить узел» с confirm (`window.confirm` или daisyUI modal): предупреждение об отзыве ключей и разрыве сопряжения.
- Disabled если единственный узел с активным live-сценарием — **нет**, удаление разрешено всегда (консилиум: ops cleanup).

### DoD DBH3

- [ ] API + OpenAPI/controller test.
- [ ] UI delete; после delete ключи узла revoked или удалены каскадом; device row gone.
- [ ] Seed/migration: maxNodesPerMembrane=1 для free-v1.
- [ ] Ручной QA: пользователь с 2 узлами удаляет один → остаётся 1, create второго блокируется.

---

## DBH4 — Purge expired + revoked keys

### API

Расширить `POST /v1/membranes/:id/access-keys/purge` (или rename body flag):

- Удалять записи где `revokedAt IS NOT NULL` **OR** `expiresAt < now()`.
- **Не** удалять active (`revokedAt IS NULL AND expiresAt >= now()`).
- Ответ: `{ purgedCount, purgedIds[] }`.

Опционально: `DELETE /v1/access-keys/:id` для single expired (если bulk недостаточно для UX) — консилиум: **bulk достаточно** + per-row «Удалить» для expired/revoked через тот же single delete endpoint.

### UI (`KeysPage`)

- Переименовать кнопку: «Очистить неактивные» (не только «отозванные»).
- Для строк expired: action «Удалить» (не только «Отозвать» для active).

### DoD DBH4

- [ ] Просроченный ключ из QA удаляется purge или per-key delete.
- [ ] Active keys не затрагиваются.
- [ ] Unit test на filter `(revoked OR expired)`.

---

## DoD эпика

- [ ] DBH0–DBH4 merged в `ozhegov-module-catalog-v1`.
- [ ] `yarn turbo run lint typecheck test build --continue` зелёный для затронутых пакетов.
- [ ] `DEVICE_BOARD_CONCEPT.md` §8.1 — одна строка: сайдбары overlay, канвас full viewport (если расходится с текстом).
- [ ] Prod deploy cabinet (`yarn device-board:deploy:prod`) после merge.
- [ ] Ручной QA checklist (5 пунктов исходного QA) — все закрыты.
- [ ] `yarn task:archive device-board-cabinet-hotfix` после merge.

---

## Out of scope

- Редактирование сценария / DBR palette / run gating (DBR0–DBR6).
- Изменения `@membrana/core` контрактов device-board document.
- Client field app (`apps/client`) — только если smoke device-board через client нужен отдельно.
- Платные тарифы с maxNodes > 1 (только seed fix free-v1).
- WebSocket presence / journal.

---

## Промпт целиком (для агента)

Ты — координатор Membrana (Vesnin). Исправь 5 prod-замечаний по подзадачам **DBH0…DBH4** согласно консилиуму [`device-board-cabinet-hotfix-2026-06-18.md`](../seanses/device-board-cabinet-hotfix-2026-06-18.md).

**Правила:**

- `@membrana/device-board` не тянет cabinet; cabinet только хостит shell.
- Cabinet API изменения только в `packages/background-cabinet`; Prisma migrate + seed sync.
- Не ломать DBR6 `deviceLive` / run gating.
- UI — DaisyUI токены из `DESIGN.md`.
- PR по фазам или один squashed hotfix PR — на усмотрение Teamlead; deploy prod после merge.

Закрытие: PR → review Teamlead → merge → deploy → `yarn task:archive device-board-cabinet-hotfix`.
